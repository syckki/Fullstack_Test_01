# 🏗️ Arquitectura Docker de TaskFlow

## 📐 Diagrama de Arquitectura 3 Capas (3 Servicios)

```
┌─────────────────────────────────────────────────┐
│                  CLIENTE                        │
│            (Navegador Web)                      │
└─────────────────┬───────────────────────────────┘
                  │ HTTP :80
                  ▼
┌─────────────────────────────────────────────────┐
│         CONTENEDOR: frontend                    │
│  ┌───────────────────────────────────────────┐  │
│  │         Nginx Alpine                      │  │
│  │                                           │  │
│  │  ┌─────────────┐    ┌──────────────┐      │  │
│  │  │   Static    │    │   Reverse    │      │  │
│  │  │   Files     │    │   Proxy      │      │  │
│  │  │  (React)    │    │  /api → :3000│      │  │
│  │  └─────────────┘    └──────┬───────┘      │  │
│  └─────────────────────────────┼─────────────┘  │
└─────────────────────────────────┼───────────────┘
                                  │ HTTP :3000
                  ┌───────────────┴──────────────┐
                  │   frontend-network (bridge)  │
                  └───────────────┬──────────────┘
                                  ▼
┌─────────────────────────────────────────────────┐
│         CONTENEDOR: backend                     │
│  ┌───────────────────────────────────────────┐  │
│  │      Node.js 22.21.1 + Express            │  │
│  │                                           │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │     API REST                        │  │  │
│  │  │     - /api/auth                     │  │  │
│  │  │     - /api/projects                 │  │  │
│  │  │     - /api/tasks                    │  │  │
│  │  └────────────────┬────────────────────┘  │  │
│  └───────────────────┼───────────────────────┘  │
└──────────────────────┼──────────────────────────┘
                       │ MySQL
     ┌─────────────────┴────────────┐
     │   backend-network (bridge)   │
     └───────────────┬──────────────┘
                     ▼
┌─────────────────────────────────────────────────┐
│         CONTENEDOR: mysql                       │
│  ┌───────────────────────────────────────────┐  │
│  │      MySQL 8                              │  │
│  │                                           │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │   Volumen Persistente               │  │  │
│  │  │   taskflow-mysql-data-3tier         │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Características:**
- ✅ 3 imágenes Docker separadas
- ✅ 3 contenedores totales
- ✅ 2 redes aisladas (frontend-network, backend-network)
- ✅ Ideal para producción y escalado horizontal

---

## 🔄 Flujo de Peticiones

```
Cliente → [:80] frontend (Nginx)
                   ↓
           Sirve archivos .html, .js, .css
                   ↓
           Proxy /api/* → [:3000] backend
                                    ↓
                              MySQL protocol
                                    ↓
                                  mysql
```

---

## 📦 Recursos

| Aspecto | Recursos |
|---------|---------|
| **Contenedores** | 3 |
| **Imágenes** | ~450 MB |
| **RAM mínima** | 1 GB |
| **CPU cores** | 2 |
| **Complejidad** | Media |
| **Escalabilidad** | Horizontal |

---

## 🎯 Beneficios

- ✅ Producción con alta carga
- ✅ Necesitas escalar frontend y backend independientemente
- ✅ Deploy en Kubernetes/cluster
- ✅ CDN para archivos estáticos
- ✅ Múltiples instancias del backend

---

## 🚀 Escalado Horizontal (con Replicas)

```
                    Load Balancer
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    frontend-1      frontend-2      frontend-3
        │                │                │
        └────────────────┼────────────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
        backend-1    backend-2    backend-3
            │            │            │
            └────────────┼────────────┘
                         ▼
                       mysql
                  (con replicación)
```

**Comando Docker Compose para escalar:**

⚠️ Importante: Elimine las directivas container_name de los servicios backend y frontend en docker-compose.yml. 

```bash
docker-compose -f docker-compose.yml up -d --scale frontend=3 --scale backend=3
```

---

## 🔒 Redes y Seguridad

- **2 redes aisladas**:
  - `frontend-network`: Nginx ↔ Backend
  - `backend-network`: Backend ↔ MySQL
- MySQL **NO** expuesto al host
- Backend **NO** expuesto al host (solo a Nginx)

**Ventaja de seguridad**: MySQL completamente aislado del exterior.

---

## 📝 Archivos de Configuración

```
docker-compose.yml     # Orquestación 3 servicios
Dockerfile.frontend    # Build de frontend (Nginx)
Dockerfile.backend     # Build de backend (Node.js)
nginx.conf             # Configuración Nginx
.dockerignore          # Archivos excluidos
.env                   # Variables de entorno
```
**.env at root**
```
MYSQL_ROOT_PASSWORD=root
MYSQL_PASSWORD=mypassword
JWT_SECRET=mysecret
JWT_EXPIRES_IN=7d
VITE_API_URL=http://localhost
```

---

## 📊 Monitoreo

### Logs en Tiempo Real

```bash
docker-compose -f docker-compose.yml logs -f frontend backend
```

### Recursos Utilizados

```bash
# 3 Capas
docker stats taskflow-frontend-3tier taskflow-backend-3tier taskflow-mysql-3tier
```
