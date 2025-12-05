# 🏗️ Arquitectura de Seguridad - TaskFlow

## 📋 Filosofía de Seguridad

TaskFlow implementa una arquitectura de seguridad en **capas defensivas** donde:

1. **Nginx actúa como API Gateway** → Primera línea de defensa
2. **Backend NO está público** → Solo accesible via Nginx
3. **Defensa en profundidad** → Múltiples capas de protección

---

## 🎯 Decisiones Arquitectónicas

### ✅ Implementado en Nginx (API Gateway)

| Característica | Ubicación | Razón |
|----------------|-----------|-------|
| **Rate Limiting** | `nginx.conf` | Más eficiente, protege backend antes de llegar a Node.js |
| **Content Security Policy (CSP)** | `nginx.conf` | Nginx sirve el frontend, puede inyectar headers HTML |
| **Security Headers (frontend)** | `nginx.conf` | Headers para respuestas HTML/CSS/JS |

### ✅ Implementado en Express (Backend)

| Característica | Ubicación | Razón |
|----------------|-----------|-------|
| **Security Headers (API)** | `backend/middleware/security.ts` | Headers específicos para respuestas JSON |
| **CORS** | `backend/middleware/security.ts` | Solo si necesitas servir a clientes en otros dominios |

---

## 🔒 Mapa de Seguridad

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│                    (Navegador / App)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Request
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Puerto 80)                        │
│                   🛡️ API GATEWAY 🛡️                        │
├─────────────────────────────────────────────────────────────┤
│ ✅ Rate Limiting            (10 req/s general)              │
│ ✅ Rate Limiting Auth       (5 req/min login)               │
│ ✅ Rate Limiting Register   (3 req/hour)                    │
│ ✅ Content Security Policy  (CSP)                           │
│ ✅ Security Headers         (X-Frame-Options, etc)          │
│ ✅ GZIP Compression                                         │
│ ✅ Static File Caching                                      │
├─────────────────────────────────────────────────────────────┤
│ DECISIÓN DE ROUTING:                                        │
│   /api/*     → Proxy a Backend (con rate limiting)          │
│   /          → Servir frontend estático                     │
│   /health    → Health check directo                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Proxy (solo peticiones válidas)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Puerto 3000 - NO PÚBLICO)             │
│                    Express + Node.js                        │
├─────────────────────────────────────────────────────────────┤
│ ✅ Security Headers API     (X-Content-Type-Options, etc)   │
│ ✅ CORS                     (solo si multi-dominio)         │
│ ✅ JWT Authentication                                       │
│ ✅ Input Validation                                         │
│ ✅ Password Hashing (bcrypt)                                │
├─────────────────────────────────────────────────────────────┤
│ RUTAS API:                                                  │
│   POST /api/auth/login     → Autenticación                  │
│   POST /api/auth/register  → Registro                       │
│   GET  /api/projects       → CRUD Proyectos                 │
│   GET  /api/tasks          → CRUD Tareas                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Database queries
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       MySQL                                 │
│                   (Puerto 3306)                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ Password hashing (bcrypt)                                │
│ ✅ Prepared statements (SQL injection prevention)           │
│ ✅ Connection pooling                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Capas de Seguridad Detalladas

### Capa 1: Nginx (API Gateway)

#### Rate Limiting

```nginx
# nginx.conf
http {
    # API General: 10 peticiones por segundo
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    # Login: 5 peticiones por minuto
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
    
    # Register: 3 peticiones por hora
    limit_req_zone $binary_remote_addr zone=register_limit:10m rate=3r/h;

    server {
        location /api/auth/login {
            limit_req zone=auth_limit burst=2 nodelay;
            # ... proxy config
        }
        
        location /api {
            limit_req zone=api_limit burst=20 nodelay;
            # ... proxy config
        }
    }
}
```

**Protege contra**:
- ✅ DDoS (Distributed Denial of Service)
- ✅ Brute force en login
- ✅ Spam de registros
- ✅ Abuso de API

#### Content Security Policy (CSP)

```nginx
# Prevenir XSS, clickjacking, y ataques de inyección
add_header Content-Security-Policy "
    default-src 'self'; 
    script-src 'self'; 
    connect-src 'self'; 
    style-src 'self' https://fonts.googleapis.com; 
    img-src 'self' data: https:; 
    font-src 'self' https://fonts.gstatic.com data:; 
    frame-ancestors 'none'
" always;
```

**Protege contra**:
- ✅ XSS (Cross-Site Scripting)
- ✅ Inyección de scripts maliciosos
- ✅ Carga de recursos de dominios no autorizados
- ✅ Clickjacking

#### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Protege contra**:
- ✅ Clickjacking (X-Frame-Options)
- ✅ MIME sniffing (X-Content-Type-Options)
- ✅ XSS legacy (X-XSS-Protection)
- ✅ Información de referrer expuesta
- ✅ Acceso no autorizado a hardware (cámara, micrófono)

---

### Capa 2: Express Backend

#### Security Headers para API

```typescript
// backend/middleware/security.ts
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-XSS-Protection', '0');
  next();
});
```

**Protege contra**:
- ✅ MIME sniffing en respuestas JSON
- ✅ Clickjacking de API endpoints
- ✅ DNS prefetching no deseado

#### CORS (Opcional - Solo Multi-Dominio)

```typescript
// Solo si necesitas servir a otros dominios
import cors from "cors";

app.use(cors({
  origin: ['https://app.example.com', 'https://mobile.example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

**Protege contra**:
- ✅ Peticiones de orígenes no autorizados
- ✅ Cross-Site Request Forgery (CSRF) parcial

---

## 🤔 Cuándo Usar CORS

### ❌ NO necesitas CORS si:

**Arquitectura 3 Capas con Nginx Proxy**
   ```
   Cliente → localhost:80/app (Nginx) → localhost:3000 (Backend)
   ```
   → Nginx hace proxy, cliente ve todo como localhost:80

### ✅ SÍ necesitas CORS si:

1. **App móvil en otro dominio**
   ```
   App iOS/Android (https://mobile.app) → API (https://api.taskflow.com)
   ```

2. **Múltiples frontends en diferentes dominios**
   ```
   https://app.taskflow.com     → API
   https://admin.taskflow.com   → API
   https://mobile.taskflow.com  → API
   ```

3. **API pública para terceros**
   ```
   https://partner-site.com → API TaskFlow
   ```

---

## 📊 Comparación: Nginx vs Express

| Característica | Nginx | Express | Recomendación |
|----------------|-------|---------|---------------|
| **Rate Limiting** | ✅ Muy eficiente | ⚠️ Consume RAM/CPU | ✅ **Nginx** |
| **CSP (frontend)** | ✅ Sirve HTML | ❌ No sirve HTML | ✅ **Nginx** |
| **Security Headers (API)** | ⚠️ Genéricos | ✅ Específicos JSON | ✅ **Express** |
| **CORS** | ⚠️ Complejo | ✅ Flexible | ✅ **Express** |
| **Orden de ejecución** | 🥇 Primera línea | 🥈 Segunda línea | - |

---

## 🎯 Configuración Recomendada (Actual)

### Para Arquitectura 3 Capas (Producción)

```yaml
# docker-compose.yml
services:
  frontend:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf  # ← Usar versión con seguridad
    ports:
      - "80:80"
  
  backend:
    # NO exponer puerto públicamente
    # ports: NO INCLUIR 3000:3000
    environment:
      NODE_ENV: production
```

**Security Stack:**
- ✅ Rate Limiting: Nginx
- ✅ CSP: Nginx
- ✅ Security Headers (frontend): Nginx
- ✅ Security Headers (API): Express
- ❌ CORS: No necesario (Nginx hace proxy)

### Para Desarrollo Local

```bash
npm run dev
```

**Security Stack:**
- ⚠️ Rate Limiting: Desactivado (desarrollo)
- ⚠️ CSP: Desactivado (Vite HMR)
- ✅ Security Headers básicos: Express
- ❌ CORS: No necesario (mismo puerto)

---

## 🚀 Implementación Paso a Paso

### Opción 1: Solo Security Headers (Mínimo)

```bash
# Ya implementado por defecto
# backend/middleware/security.ts está listo
```

En `backend/app.ts`:
```typescript
import { setupSecurity } from "./middleware/security";

export const app = express();
setupSecurity(app);  // ← Headers básicos
```

### Opción 2: Full Security con Nginx (Recomendado)

1. **Con nginx.conf**:


2. **Rebuilder frontend**:
```bash
docker-compose -f docker-compose.yml build frontend
docker-compose -f docker-compose.yml up -d
```

3. **Verificar rate limiting**:
```bash
# Probar límite de login (5 req/min)
for i in {1..6}; do
  curl -X POST http://localhost/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# La 6ta debería retornar 429 Too Many Requests
```

### Opción 3: Agregar CORS (Solo si Multi-Dominio)

1. **Instalar paquete**:
```bash
npm install cors
npm install -D @types/cors
```

2. **Descomentar función en `server/middleware/security.ts`**

3. **Usar en `server/app.ts`**:
```typescript
import { setupSecurity, setupCORS } from "./middleware/security";

setupSecurity(app);
setupCORS(app);  // Solo si necesitas
```

---

## 📈 Monitoreo de Seguridad

### Logs de Rate Limiting

```bash
# Ver cuando se alcanza el límite
docker-compose exec frontend tail -f /var/log/nginx/rate_limit.log
```

### Verificar Headers

```bash
# Verificar CSP y security headers
curl -I http://localhost/

# Deberías ver:
# Content-Security-Policy: default-src 'self'; ...
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
```

### Test de DDoS

```bash
# Bombardear API (debería bloquearse)
ab -n 1000 -c 10 http://localhost/api/projects

# Apache Bench mostrará cuántas fueron rechazadas (429)
```

---

## ✅ Checklist de Seguridad

### Nivel Básico (Actual)
- [x] Security headers básicos en Express
- [x] JWT authentication
- [x] Password hashing (bcrypt)
- [x] Input validation
- [ ] Rate limiting
- [ ] CSP

### Nivel Intermedio (Recomendado Producción)
- [ ] Rate limiting en Nginx
- [ ] CSP en Nginx
- [ ] Security headers en Nginx
- [ ] HTTPS/TLS (certificado SSL)
- [ ] Logs de seguridad

### Nivel Avanzado (Opcional)
- [ ] Web Application Firewall (WAF)
- [ ] Intrusion Detection System (IDS)
- [ ] CORS para multi-dominio
- [ ] API key rotation
- [ ] 2FA/MFA

---

## 🎓 Conclusión

### Arquitectura Actual

```
Nginx (API Gateway)
  ↓ proxy
Backend (NO público)
  ↓ queries
Database
```

### Stack de Seguridad Recomendado

1. **Nginx**: Rate Limiting + CSP + Security Headers (frontend)
2. **Express**: Security Headers (API) + CORS (si multi-dominio)
3. **Backend**: JWT + bcrypt + input validation
4. **Database**: Prepared statements + connection pooling

### Archivos Disponibles

- `nginx.conf` → Nginx con rate limiting y CSP
- `backend/middleware/security.ts` → Security headers + CORS opcional

### Siguiente Paso

Si quieres seguridad completa:
```bash
# with nginx.conf
docker-compose -f docker-compose.yml up -d --build
```
