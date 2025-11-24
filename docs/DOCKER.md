# 🐳 TaskFlow - Guía de Docker

Esta guía te ayudará a ejecutar TaskFlow usando Docker en cualquier plataforma (Windows, macOS, Linux).

## 📋 Requisitos Previos

- **Docker** instalado ([Descargar Docker](https://www.docker.com/products/docker-desktop))
- **Docker Compose** (incluido con Docker Desktop)

Verifica la instalación:
```bash
docker --version
docker-compose --version
```

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.docker.example .env

# Editar .env y cambiar los secretos
# IMPORTANTE: Cambia los valores de los secretos
```

### 2. Ejecutar en Producción

```bash
# Construir y levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f app

# La aplicación estará en: http://localhost
```

### 3. Poblar con Datos de Ejemplo (Opcional)

```bash
docker-compose up -d mysql

# Esperar a que los servicios estén healthy (~30 segundos)
yarn db:push

# Ejecutar seed
yarn db:generate
```

### 4. Acceder a la Aplicación

```
URL: http://localhost
Email: jhonny@taskflow.com
Password: password123
```

## 🛠️ Comandos Útiles

### Gestión de Servicios

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ BORRA DATOS)
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Ver servicios en ejecución
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f app

# Ver logs solo de MySQL
docker-compose logs -f mysql
```

### Ejecutar Comandos en Contenedores

```bash
# Acceder a shell del contenedor app
docker-compose exec app sh

# Ver variables de entorno
docker-compose exec app env
```

## 📊 Arquitectura de Servicios (3 Capas Separadas)
**Archivo**: `docker-compose.yml`

**Servicios (3):**
1. **frontend** - Nginx + React estático
   - Puerto: 80
   - Tecnología: Nginx Alpine
   
2. **backend** - API Node.js
   - Puerto: 3000 (interno)
   - Tecnología: Express
   
3. **mysql** - Base de datos
   - Puerto: 3306

**Ventajas:**
- ✅ Escalado independiente de cada capa
- ✅ Ideal para producción con alta carga
- ✅ Mejor separación de responsabilidades

**Cómo usar:**
```bash
docker-compose -f docker-compose.yml up -d
```

## 🔒 Seguridad

### En Producción

1. **Cambiar contraseñas** en `.env`:
```bash
# Generar password seguro
openssl rand -base64 32

# Generar SESSION_SECRET
openssl rand -base64 48
```

2. **No exponer puertos innecesarios**:
```yaml
# Comentar esta línea en docker-compose.yml si no necesitas acceso directo a DB
# ports:
#   - "3306:3306"
```

3. **Usar secrets de Docker** (Opcional):
```bash
echo "mi_password_seguro" | docker secret create mysql_password -
```

## 🌐 Despliegue en Producción

### Opción 1: Docker en Servidor VPS

```bash
# En tu servidor (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose

# Clonar repositorio
git clone <tu-repo>
cd taskflow

# Configurar .env
cp .env.docker.example .env
nano .env  # Editar secretos

# Levantar servicios
docker-compose up -d

# Configurar reverse proxy (nginx) opcional
```

### Opción 2: AWS ECS / Fargate

1. Subir imagen a ECR:
```bash
docker build -t taskflow .
docker tag taskflow:latest <account>.dkr.ecr.<region>.amazonaws.com/taskflow:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/taskflow:latest
```

2. Crear Task Definition en ECS
3. Configurar RDS MySQL
4. Crear Service en ECS

### Opción 3: Railway / Render

Estos servicios detectan `Dockerfile` automáticamente:
1. Conectar repositorio GitHub
2. Configurar variables de entorno
3. Deploy automático

## 🐛 Troubleshooting

### La aplicación no inicia

```bash
# Ver logs detallados
docker-compose logs app

# Verificar que MySQL esté healthy
docker-compose ps

# Reconstruir imagen
docker-compose build --no-cache app
docker-compose up -d
```

### Error de conexión a base de datos

```bash
# Verificar que mysql esté corriendo
docker-compose ps mysql

# Probar conexión manual
docker-compose exec app sh
# Dentro del contenedor:
nc -zv mysql 3306
```

### Puerto 3000 ya en uso

```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "5000:3000"  # Exponer en 5000 en vez de 3000
```

### Base de datos vacía después de reiniciar

```bash
# Verificar que el volumen existe
docker volume ls | grep taskflow

# Si se eliminó, recrearlo
docker-compose up -d mysql
yarn db:push
yarn db:generate
```

## 📦 Optimización de Imagen

La imagen de producción está optimizada con:
- ✅ Multi-stage builds (reduce tamaño)
- ✅ Alpine Linux (imagen base ligera)
- ✅ Solo dependencias de producción
- ✅ Usuario no-root (seguridad)
- ✅ Health checks
- ✅ .dockerignore (build más rápido)

Tamaño aproximado:
- **Imagen completa**: ~300 MB
- **Imagen comprimida**: ~100 MB

## 🔄 Actualización de la Aplicación

```bash
# 1. Detener servicios
docker-compose down

# 2. Actualizar código (git pull)
git pull origin main

# 3. Reconstruir imagen
docker-compose build app

# 4. Levantar servicios
docker-compose up -d

# 5. Verificar logs
docker-compose logs -f app
```

## 📝 Notas Adicionales

- Los datos de MySQL se persisten en el volumen `taskflow-mysql-data`
- Para resetear completamente: `docker-compose down -v` (⚠️ borra datos)
- El health check del contenedor app verifica que Express esté respondiendo
- La red `taskflow-network` permite comunicación entre servicios

## 🆘 Soporte

Si tienes problemas:
1. Revisar logs: `docker-compose logs -f`
2. Verificar salud de servicios: `docker-compose ps`
3. Reconstruir desde cero: `docker-compose down -v && docker-compose build --no-cache && docker-compose up -d`
