# 🔄 Guía de Migración: PostgreSQL → MySQL

Esta guía te muestra **exactamente** qué modificar en los archivos Docker y del proyecto para usar MySQL en producción.

---

## 📋 Resumen de Cambios

| Archivo | Cambios Necesarios | Razón |
|---------|-------------------|-------|
| ✅ **Dockerfile*** | ❌ **NO CAMBIAR** | Solo construye la aplicación |
| ✅ **nginx.conf** | ❌ **NO CAMBIAR** | Solo sirve frontend y proxy API |
| 🔧 **docker-compose.yml** | ✅ Cambiar servicio postgres → mysql | Contenedor de base de datos |
| 🔧 **.env.docker.example** | ✅ Actualizar variables de entorno | Credenciales MySQL |
| 🔧 **backend/db.ts** | ✅ Cambiar driver PostgreSQL → MySQL | Conexión a base de datos |
| 🔧 **shared/schema.ts** | ✅ Cambiar `pgTable` → `mysqlTable` | Esquema de base de datos |
| 🔧 **drizzle.config.ts** | ✅ Cambiar `dialect: "postgresql"` → `"mysql"` | Configuración ORM |
| 🔧 **package.json** | ✅ Instalar `mysql2`, desinstalar `@neondatabase/serverless` | Dependencias |

---

## 🛠️ Cambios Paso a Paso

### 1. Instalar Dependencias MySQL

```bash
# Instalar driver MySQL
npm install mysql2

# Desinstalar driver PostgreSQL (opcional)
npm uninstall @neondatabase/serverless ws
```

---

### 2. Modificar `backend/db.ts`

**ANTES (PostgreSQL):**
```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

**DESPUÉS (MySQL):**
```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Crear connection pool de MySQL
export const pool = mysql.createPool(process.env.DATABASE_URL);
export const db = drizzle({ client: pool, schema });
```

**Cambios:**
- ✅ `drizzle-orm/neon-serverless` → `drizzle-orm/mysql2`
- ✅ `@neondatabase/serverless` → `mysql2/promise`
- ✅ Eliminar configuración de WebSocket
- ✅ `mysql.createPool()` en lugar de `new Pool()`

---

### 3. Modificar `shared/schema.ts`

**ANTES (PostgreSQL):**
```typescript
import { pgTable, text, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "done"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ... resto de tablas
```

**DESPUÉS (MySQL):**
```typescript
import { mysqlTable, text, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Enums
export const taskStatusEnum = mysqlEnum("task_status", ["pending", "in_progress", "done"]);
export const taskPriorityEnum = mysqlEnum("task_priority", ["low", "medium", "high"]);

// Users table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ... resto de tablas (cambiar pgTable → mysqlTable)
```

**Cambios:**
- ✅ `drizzle-orm/pg-core` → `drizzle-orm/mysql-core`
- ✅ `pgTable` → `mysqlTable`
- ✅ `pgEnum` → `mysqlEnum`
- ✅ `gen_random_uuid()` → `UUID()` (función MySQL)
- ✅ Aplicar estos cambios a **todas las tablas**: `projects`, `tasks`, `projectCollaborators`

---

### 4. Modificar `drizzle.config.ts`

**ANTES (PostgreSQL):**
```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

**DESPUÉS (MySQL):**
```typescript
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
```

**Cambios:**
- ✅ `dialect: "postgresql"` → `dialect: "mysql"`

---

### 5. Modificar `docker-compose.yml` (Arquitectura Monolítica)

**ANTES (PostgreSQL):**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: taskflow-postgres
    restart: unless-stopped
    
    environment:
      POSTGRES_DB: taskflow
      POSTGRES_USER: taskflow_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-taskflow_secure_password}
      PGDATA: /var/lib/postgresql/data/pgdata
    
    ports:
      - "5432:5432"
    
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow_user -d taskflow"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    # ... (sin cambios)
    environment:
      DATABASE_URL: postgresql://taskflow_user:${POSTGRES_PASSWORD}@postgres:5432/taskflow
      PGHOST: postgres
      PGPORT: 5432
      # ...
```

**DESPUÉS (MySQL):**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: taskflow-mysql
    restart: unless-stopped
    
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root_secure_password}
      MYSQL_DATABASE: taskflow
      MYSQL_USER: taskflow_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-taskflow_secure_password}
    
    ports:
      - "3306:3306"
    
    volumes:
      - mysql_data:/var/lib/mysql
      - ./db/seed-mysql.sql:/docker-entrypoint-initdb.d/seed.sql:ro
    
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-root_secure_password}"]
      interval: 10s
      timeout: 5s
      retries: 5
    
    command: --default-authentication-plugin=mysql_native_password
    
    networks:
      - taskflow-network

  app:
    # ... (sin cambios en build)
    environment:
      DATABASE_URL: mysql://taskflow_user:${MYSQL_PASSWORD:-taskflow_secure_password}@mysql:3306/taskflow
      # Eliminar variables PGHOST, PGPORT, etc.
    
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:
    driver: local
    name: taskflow-mysql-data
```

**Cambios:**
- ✅ `postgres` → `mysql`
- ✅ `image: postgres:16-alpine` → `mysql:8.0`
- ✅ Variables de entorno PostgreSQL → MySQL
- ✅ Puerto `5432` → `3306`
- ✅ Health check `pg_isready` → `mysqladmin ping`
- ✅ Volumen `postgres_data` → `mysql_data`
- ✅ `DATABASE_URL` de PostgreSQL → MySQL

---

### 6. Modificar `docker-compose.yml` (Arquitectura 3 Capas)

**ANTES (PostgreSQL):**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    # ... (igual que docker-compose.yml)
  
  backend:
    environment:
      DATABASE_URL: postgresql://taskflow_user:${POSTGRES_PASSWORD}@postgres:5432/taskflow
      # ...
```

**DESPUÉS (MySQL):**
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: taskflow-mysql-3tier
    restart: unless-stopped
    
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root_secure_password}
      MYSQL_DATABASE: taskflow
      MYSQL_USER: taskflow_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-taskflow_secure_password}
    
    ports:
      - "3306:3306"
    
    volumes:
      - mysql_data_3tier:/var/lib/mysql
    
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-root_secure_password}"]
      interval: 10s
      timeout: 5s
      retries: 5
    
    command: --default-authentication-plugin=mysql_native_password
    
    networks:
      - backend-network

  backend:
    environment:
      DATABASE_URL: mysql://taskflow_user:${MYSQL_PASSWORD:-taskflow_secure_password}@mysql:3306/taskflow
      # Eliminar PGHOST, PGPORT, etc.
    
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data_3tier:
    driver: local
    name: taskflow-mysql-data-3tier
```

**Cambios:** (mismos que en docker-compose.yml)

---

### 7. Modificar `.env.docker.example`

**ANTES (PostgreSQL):**
```bash
POSTGRES_PASSWORD=taskflow_secure_password_change_in_production
SESSION_SECRET=change_this_secret_in_production_min_32_chars_long
```

**DESPUÉS (MySQL):**
```bash
# MySQL Passwords
MYSQL_ROOT_PASSWORD=root_secure_password_change_in_production
MYSQL_PASSWORD=taskflow_secure_password_change_in_production

# JWT Secret
SESSION_SECRET=change_this_secret_in_production_min_32_chars_long
```

**Cambios:**
- ✅ `POSTGRES_PASSWORD` → `MYSQL_PASSWORD`
- ✅ Agregar `MYSQL_ROOT_PASSWORD`

---

### 8. ❌ **NO MODIFICAR** estos archivos:

#### `Dockerfile`, `Dockerfile.backend`, `Dockerfile.frontend`, `Dockerfile.dev`
**Razón**: Estos archivos solo construyen la aplicación Node.js. No tienen lógica de base de datos.

#### `nginx.conf`
**Razón**: Solo configura el servidor web y proxy reverso. No interactúa con la base de datos.

---

## 🗄️ Migración de Datos

### Opción 1: Exportar/Importar Manualmente

```bash
# 1. Exportar datos de PostgreSQL
docker-compose exec postgres pg_dump -U taskflow_user taskflow > backup.sql

# 2. Convertir SQL de PostgreSQL a MySQL (manual)
# - Cambiar tipos de datos incompatibles
# - Ajustar sintaxis de CREATE TABLE

# 3. Importar a MySQL
docker-compose exec -T mysql mysql -u taskflow_user -p taskflow < backup-mysql.sql
```

### Opción 2: Usar Script de Migración con Drizzle

```typescript
// scripts/migrate-pg-to-mysql.ts
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';

// Conectar a PostgreSQL
const pgPool = new PgPool({ connectionString: process.env.PG_DATABASE_URL });
const pgDb = pgDrizzle(pgPool);

// Conectar a MySQL
const mysqlPool = await mysql.createPool(process.env.MYSQL_DATABASE_URL);
const mysqlDb = mysqlDrizzle(mysqlPool);

// Exportar datos de PostgreSQL
const users = await pgDb.select().from(pgSchema.users);
const projects = await pgDb.select().from(pgSchema.projects);
// ...

// Importar a MySQL
await mysqlDb.insert(mysqlSchema.users).values(users);
await mysqlDb.insert(mysqlSchema.projects).values(projects);
// ...
```

---

## 🚀 Nuevos Comandos Docker con MySQL

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs de MySQL
docker-compose logs -f mysql

# Conectar a MySQL CLI
docker-compose exec mysql mysql -u taskflow_user -p taskflow

# Backup de MySQL
docker-compose exec mysql mysqldump -u taskflow_user -p taskflow > backup.sql

# Restaurar backup
docker-compose exec -T mysql mysql -u taskflow_user -p taskflow < backup.sql

# Ver tablas
docker-compose exec mysql mysql -u taskflow_user -p -e "SHOW TABLES;" taskflow
```

---

## 📊 Diferencias Clave: PostgreSQL vs MySQL

| Aspecto | PostgreSQL | MySQL |
|---------|------------|-------|
| **Puerto** | 5432 | 3306 |
| **Driver Node.js** | `@neondatabase/serverless` o `pg` | `mysql2` |
| **Drizzle Dialect** | `postgresql` | `mysql` |
| **Drizzle Core** | `drizzle-orm/pg-core` | `drizzle-orm/mysql-core` |
| **Table Definition** | `pgTable()` | `mysqlTable()` |
| **Enum Definition** | `pgEnum()` | `mysqlEnum()` |
| **UUID Function** | `gen_random_uuid()` | `UUID()` |
| **Health Check** | `pg_isready` | `mysqladmin ping` |
| **Data Directory** | `/var/lib/postgresql/data` | `/var/lib/mysql` |

---

## ✅ Checklist de Migración

- [ ] Instalar `mysql2` (`npm install mysql2`)
- [ ] Modificar `backend/db.ts` (cambiar driver)
- [ ] Modificar `shared/schema.ts` (pgTable → mysqlTable)
- [ ] Modificar `drizzle.config.ts` (dialect: "mysql")
- [ ] Modificar `docker-compose.yml` (postgres → mysql)
- [ ] Modificar `.env.docker.example` (variables MySQL)
- [ ] Copiar `.env.docker.example` a `.env`
- [ ] Editar `.env` con contraseñas seguras
- [ ] Generar nuevas migraciones (`npm run db:generate`)
- [ ] Levantar servicios (`docker-compose up -d`)
- [ ] Aplicar migraciones (`docker-compose exec app npm run db:push`)
- [ ] Ejecutar seed (`docker-compose exec app tsx scripts/seed-drizzle.ts`)
- [ ] Probar la aplicación

---

## 🎯 Conclusión

**Archivos Docker que SÍ cambian:**
- ✅ `docker-compose.yml`
- ✅ `.env.docker.example`

**Archivos Docker que NO cambian:**
- ❌ `Dockerfile`
- ❌ `Dockerfile.backend`
- ❌ `Dockerfile.frontend`
- ❌ `Dockerfile.dev`
- ❌ `nginx.conf`

**Archivos de código que SÍ cambian:**
- ✅ `backend/db.ts`
- ✅ `shared/schema.ts`
- ✅ `drizzle.config.ts`
- ✅ `package.json` (dependencias)

La migración es principalmente **cambiar el servicio de base de datos en Docker** y **actualizar el ORM** en el código de la aplicación.
