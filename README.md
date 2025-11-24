# Prueba Técnica - Fullstack Developer (Node.js + React)

¡Bienvenido(a) a la prueba técnica para el puesto de **Desarrollador Fullstack**!

Esta prueba evaluará tus habilidades en el desarrollo de aplicaciones full-stack modernas utilizando **Node.js**, **Express**, **React**, y bases de datos. Tendrás **48 horas** para completar el desafío.

---

## 📋 Descripción del Proyecto

Desarrollarás una **plataforma de gestión de proyectos y tareas colaborativa** donde los usuarios pueden:

- Registrarse e iniciar sesión de forma segura
- Crear y gestionar proyectos
- Asignar tareas a diferentes proyectos
- Colaborar con otros usuarios en proyectos compartidos
- Filtrar, buscar y ordenar tareas por diferentes criterios
- Ver estadísticas básicas de sus proyectos

---

## 🛠️ Stack Tecnológico Requerido

### Backend
- **Runtime**: Node.js (v18 o superior)
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **Base de Datos**: MySQL **o** MongoDB (elige una)
- **Autenticación**: JWT (JSON Web Tokens)
- **Documentación API**: Swagger/OpenAPI

### Frontend
- **Framework**: React (v18 o superior)
- **Lenguaje**: TypeScript
- **Routing**: React Router v6
- **Estilos**: TailwindCSS (preferencia)

### DevOps (Opcional)
- **Containerización**: Docker + Docker Compose

**Nota**: Puedes usar cualquier otra librería o herramienta que consideres necesaria. Documenta tus decisiones técnicas en el archivo `TECHNICAL_DECISIONS.md`.

---

## 📦 Funcionalidades Requeridas

### 1. Autenticación y Usuarios

**Backend:**
- Registro de usuarios con validación
- Login con generación de JWT
- Middleware de autenticación para proteger rutas
- Hash de contraseñas
- Endpoint para obtener perfil del usuario autenticado

**Frontend:**
- Formularios de registro y login con validaciones
- Almacenamiento del token de autenticación
- Rutas protegidas que requieren autenticación
- Redirección automática según estado de autenticación

---

### 2. Gestión de Proyectos

**Backend:**
- CRUD completo de proyectos
- Solo el creador del proyecto puede editarlo o eliminarlo
- Sistema de colaboradores: añadir usuarios a proyectos
- Paginación en listado de proyectos

**Frontend:**
- Lista de proyectos con diseño responsive
- Crear, editar y eliminar proyectos
- Búsqueda y filtrado de proyectos
- Gestión de colaboradores

---

### 3. Gestión de Tareas

**Backend:**
- CRUD completo de tareas
- Las tareas pertenecen a un proyecto
- Estados: "pendiente", "en progreso", "completada"
- Prioridades: "baja", "media", "alta"
- Asignar tareas a colaboradores del proyecto
- Filtros por estado, prioridad, proyecto, usuario asignado
- Ordenamiento flexible

**Frontend:**
- Visualización de tareas (lista, kanban, o tu propuesta)
- Crear, editar y eliminar tareas
- Cambiar estado de tareas
- Filtros interactivos
- Asignación de tareas a usuarios

---

### 4. Dashboard y Estadísticas

**Backend:**
- Endpoint con estadísticas del usuario:
  - Total de proyectos
  - Total de tareas
  - Tareas por estado
  - Otras métricas relevantes

**Frontend:**
- Dashboard con visualización de estadísticas
- Resumen de actividad del usuario

---

## 🏗️ Arquitectura

### Backend (Patrón Repository)
El backend está construido con una arquitectura desacoplada usando el **Patrón Repository**, lo que permite cambiar fácilmente entre diferentes bases de datos (MySQL, MongoDB, MySQL) sin modificar la lógica de negocio.

```
backend/
├── db.ts                  # Configuración de base de datos
├── storage.ts             # Capa de abstracción de datos
│   ├── IStorage          # Interface de repositorio
│   └── DatabaseStorage   # Implementación MySQL
├── routes.ts              # Endpoints de API
└── middleware/
    └── auth.ts           # Middleware de autenticación JWT
```

### Frontend
```
frontend/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/          # Componentes base (shadcn)
│   │   ├── app-sidebar.tsx
│   │   ├── theme-provider.tsx
│   │   └── protected-route.tsx
│   ├── pages/           # Páginas de la aplicación
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── dashboard.tsx
│   │   ├── projects.tsx
│   │   ├── tasks.tsx
│   │   └── stats.tsx
│   ├── lib/            # Utilidades
│   │   ├── auth-context.tsx
│   │   └── queryClient.ts
│   └── App.tsx         # Router principal
```

### Esquema de Datos
```
shared/
└── schema.ts           # Modelos compartidos (Drizzle ORM)
    ├── users
    ├── projects
    ├── tasks
    └── project_collaborators
```

## 🛠️ Stack Tecnológico

### Backend
- **Runtime**: Node.js con TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM (abstracción de base de datos)
- **Base de datos**: MySQL (intercambiable)
- **Autenticación**: JWT (jsonwebtoken)
- **Seguridad**: bcryptjs
- **Validación**: express-validator
- **Documentación**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 con TypeScript
- **Router**: Wouter (React Router alternativo)
- **Estado**: TanStack Query (React Query)
- **Estilos**: TailwindCSS
- **Componentes UI**: shadcn/ui
- **Formularios**: React Hook Form + Zod
- **Iconos**: Lucide React

## 📦 Instalación y Uso

### Requisitos Previos
- Node.js 20+
- MySQL (o la base de datos que prefieras)

### Configuración

1. **Instalar dependencias**:
```bash
sudo npm install -g corepack
yarn install
```

2. **Configurar variables de entorno**

**Backend:**
- `DATABASE_URL` - URL de conexión a MySQL
- `JWT_SECRET` - Secreto para sesiones
- `JWT_EXPIRES_IN` - Tiempo de expiración del Token

**Frontend:**
- `VITE_API_URL` - URL de conexión a API

3. **Ejecutar migraciones**:
```bash
yarn db:push
```

4. **Poblar la base de datos con datos de ejemplo** (Opcional):
El proyecto incluye scripts para poblar la base de datos con datos realistas. Ver [`seed/README.md`](seed/README.md) para más detalles.

```bash
# Drizzle ORM (Agnóstico de BD)
yarn db:generate
```

5. **Iniciar la aplicación**:
```bash
yarn dev
```

La aplicación estará disponible en `http://localhost:5000` por defecto

## 🐳 Docker (Ejecución en Cualquier Plataforma)

TaskFlow incluye configuración completa de Docker para ejecutar la aplicación en cualquier plataforma sin instalación de dependencias.

### Inicio Rápido con Docker

```bash
# 1. Configurar variables de entorno
cp .env.docker.example .env
# Edita .env y cambia los valores

# 2. Levantar todos los servicios
docker-compose up -d

# 3. Poblar con datos de ejemplo (opcional)
yarn db:push
yarn db:generate

# 4. Acceder a la aplicación
# http://localhost:5000
```

**Servicios incluidos:**
- 🚀 **app**: Frontend + Backend (Node.js 20, Express, React)
- 🗄️ **postgres**: MySQL 8 con persistencia de datos

**Documentación completa**:
- 📘 [`docs/DOCKER.md`](docs/DOCKER.md) - Guía completa de Docker
- 🏗️ [`docs/DOCKER-ARCHITECTURE.md`](docs/DOCKER-ARCHITECTURE.md) - Arquitecturas y diagramas

## 📚 API Endpoints

### Autenticación
```
POST   /api/auth/register              # Registrar nuevo usuario
POST   /api/auth/login                 # Iniciar sesión
GET    /api/auth/me                    # Obtener usuario actual
```

### Proyectos
```
GET    /api/projects                   # Listar proyectos del usuario autenticado
POST   /api/projects                   # Crear nuevo proyecto
GET    /api/projects/:id               # Obtener proyecto específico
PATCH  /api/projects/:id               # Actualizar proyecto (solo creador)
DELETE /api/projects/:id               # Eliminar proyecto (solo creador)
```

### Colaboradores
```
GET    /api/collaborators              # Listar todos los usuarios asignables
GET    /api/projects/:id/collaborators # Listar colaboradores de un proyecto
POST   /api/projects/:id/collaborators # Añadir colaborador a proyecto
       Body: { collaboratorIds: string[] }
DELETE /api/projects/:id/collaborators/:userId # Eliminar colaborador
```

### Tareas
```
GET    /api/tasks                      # Listar tareas del usuario
       Query params (opcionales):
       ?status=pending|in_progress|done
       &priority=low|medium|high
       &projectId=uuid
       &assignedToId=uuid

POST   /api/tasks                      # Crear nueva tarea
       Body: {
         title: string,
         description: string,
         projectId: string,
         priority: "low"|"medium"|"high",
         assignedToId?: string | null
       }

GET    /api/tasks/:id                  # Obtener tarea específica
PATCH  /api/tasks/:id                  # Actualizar tarea
       Body: {
         title?: string,
         description?: string,
         status?: "pending"|"in_progress"|"done",
         priority?: "low"|"medium"|"high",
         projectId?: string,
         assignedToId?: string | null
       }
       Nota: Siempre envía status Y priority juntos

DELETE /api/tasks/:id                  # Eliminar tarea
```

### Estadísticas
```
GET    /api/stats/:userId              # Obtener estadísticas del usuario
       Response: {
         totalProjects: number,
         totalTasks: number,
         pendingTasks: number,
         inProgressTasks: number,
         completedTasks: number,
         completionRate: number
       }
```

### Usuarios
```
GET    /api/users                      # Listar todos los usuarios
```

## 🧪 Testing E2E con Playwright

TaskFlow incluye pruebas end-to-end (E2E) completas usando Playwright. Estas pruebas validan el flujo completo de usuario desde el frontend hasta la base de datos.

### Instalación de Playwright

Las dependencias ya están instaladas. Si necesitas reinstalar:
```bash
yarn -D @playwright/test --exact
yarn playwright install
sudo yarn playwright install-deps
```

### Ejecutar Tests E2E

```bash
# Ejecutar todos los tests E2E
yarn playwright test

# Ejecutar tests en modo UI (interfaz interactiva)
yarn playwright test --ui

# Ejecutar tests en modo debug
yarn playwright test --debug

# Ejecutar un test específico
yarn playwright test e2e/auth.spec.ts

# Ver reporte de resultados
yarn playwright show-report
```

### Tests Disponibles

#### 1. **auth.spec.ts** - Autenticación
- ✅ Registro de nuevo usuario
- ✅ Login con usuario existente
- ✅ Login con credenciales incorrectas
- ✅ Acceso a rutas protegidas sin autenticación

#### 2. **tasks-responsive.spec.ts** - Gestión de Tareas Responsive
- ✅ Registro de usuario con data-testids robustos
- ✅ Creación de proyecto y tareas
- ✅ Verifica visibilidad de vista Kanban en desktop (columnas y dropzones)
- ✅ Ejecuta cambio de prioridad con selector inline y valida toast de éxito (desktop)
- ✅ Verifica cambio a vista de lista en mobile (<768px)
- ✅ Verifica presencia de filtros responsive (estado, proyecto, prioridad, usuario)
- ✅ Ejecuta cambio de estado con selector inline y valida toast de éxito (mobile)
- ✅ Confirma que la UI mantiene visibilidad tras cambiar viewport

**Limitaciones conocidas:**
- ⚠️ Drag-and-drop no soportado (dnd-kit requiere instrumentación especial)
- ⚠️ Cambio de estado en desktop no probado (solo disponible via drag-and-drop)
- ℹ️ No valida HTTP payloads ni texto de badges (verifica visibilidad y toasts)

### Estructura de Tests

```
e2e/
├── auth.spec.ts              # Tests de autenticación
├── tasks-responsive.spec.ts  # Tests de gestión de tareas responsive
└── ...                       # Más tests aquí

playwright.config.ts          # Configuración de Playwright
```

### Configuración

El archivo `playwright.config.ts` incluye:
- **Base URL**: `http://localhost:5000`
- **Proyectos**: Desktop (Chrome) y Mobile (iPhone 12)
- **Screenshots**: Solo en fallos
- **Trace**: Solo en retry
- **Reporter**: HTML (genera reporte visual)

### Características de los Tests

1. **Datos Únicos**: Cada test usa timestamps para generar usuarios/proyectos únicos
2. **Selectores Estables**: Usa `data-testid` para selectores confiables
3. **Esperas Inteligentes**: Playwright espera automáticamente elementos visibles
4. **Screenshots en Fallos**: Captura pantalla cuando algo falla
5. **Traces**: Genera trace para debugging en caso de fallo

### Testing Offline

✅ **Los tests funcionan completamente offline** una vez instalado Playwright.

```bash
npm run dev              # Terminal 1: Iniciar aplicación
npx playwright test      # Terminal 2: Ejecutar tests
```

**⚠️ Nota sobre:** Los tests E2E requieren recursos significativos (RAM, CPU) para ejecutar Chromium headless. En entornos limitados, Chromium puede crashear. **Se recomienda ejecutar los tests en tu máquina local** donde tienes más recursos disponibles.

**Para desarrollo offline:**
1. Clona el proyecto en tu máquina
2. Ejecuta `npm install`
3. Ejecuta `npx playwright install chromium`
4. Ejecuta `npm run dev` para iniciar la app
5. En otra terminal, ejecuta `npx playwright test`

### Ejemplo de Test

```typescript
test('crear tarea y cambiar prioridad', async ({ page }) => {
  // Navegar a login
  await page.goto('/');
  
  // Login
  await page.fill('[data-testid="input-email"]', 'test@example.com');
  await page.fill('[data-testid="input-password"]', 'password');
  await page.click('[data-testid="button-submit"]');
  
  // Verificar redirección
  await expect(page).toHaveURL('/projects');
  
  // Ir a tareas
  await page.click('text=Todas las Tareas');
  
  // Crear tarea
  await page.click('text=Crear Tarea');
  await page.fill('[data-testid="input-task-title"]', 'Mi Tarea');
  await page.click('[data-testid="button-submit"]');
  
  // Verificar tarea creada
  await expect(page.locator('text=Mi Tarea')).toBeVisible();
});
```

### Tips para Escribir Tests

1. **Usa data-testid**: Más estable que selectores CSS
   ```tsx
   <Button data-testid="button-submit">Enviar</Button>
   ```

2. **Espera elementos visibles**: Playwright espera automáticamente
   ```typescript
   await expect(page.locator('text=Éxito')).toBeVisible();
   ```

3. **Genera datos únicos**: Evita conflictos entre tests
   ```typescript
   const username = `user_${Date.now()}`;
   ```

4. **Valida el estado final**: No solo la acción, también el resultado
   ```typescript
   await page.click('button');
   await expect(page).toHaveURL('/success');
   ```

## 🔄 Cambiar de Base de Datos

Gracias a la arquitectura con Patrón Repository, puedes cambiar fácilmente la base de datos:

1. **Crear nueva implementación** en `backend/storage.ts`:
```typescript
export class MongoDBStorage implements IStorage {
  // Implementar métodos de IStorage usando MongoDB
}

export const storage = new MongoDBStorage();
```

2. **Actualizar conexión** en `backend/db.ts`:
```typescript
// Cambiar de MySQL a MongoDB
import { MongoClient } from 'mongodb';
// ...
```

La lógica de negocio en `routes.ts` permanece sin cambios.

## 📖 Documentación API

La documentación completa de la API está disponible en Swagger UI:
```
GET /api-docs
```

## 🎨 Diseño

El diseño sigue los principios de Linear/Notion:
- Interfaz limpia y minimalista
- Uso eficiente del espacio
- Jerarquía visual clara
- Interacciones consistentes
- Tipografía: Inter para UI, JetBrains Mono para datos técnicos

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Validación de entradas en backend
- Rutas protegidas con middleware
- Tokens almacenados de forma segura

## 📝 Próximas Características

- [ ] Notificaciones en tiempo real
- [ ] Comentarios en tareas
- [ ] Adjuntos de archivos
- [ ] Sistema de roles (admin/member/viewer)
- [ ] Búsqueda avanzada
- [ ] Vista de calendario
- [ ] Exportación de datos

## 👥 Contribuir

Este proyecto utiliza una arquitectura limpia y desacoplada. Al contribuir:
1. Mantén la separación entre lógica de negocio y capa de datos
2. Sigue las convenciones de TypeScript
3. Agrega validaciones para nuevos endpoints
4. Documenta nuevos endpoints en Swagger

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto para tus propios fines.

---

**Desarrollado con ❤️ usando React, TypeScript y MySQL**
