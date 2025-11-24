# Database Migration & Seed Scripts

## 🚀 Uso

### Drizzle ORM (Agnóstico de BD)

```bash
yarn db:generate
```

**Ventajas:**
- ✅ Type-safe (TypeScript valida los datos)
- ✅ Funciona con MySQL, PostgreSQL, SQLite (sin cambios)
- ✅ Usa las mismas tablas de `shared/schema.ts`
- ✅ No requiere SQL específico de cada motor


## 📊 Datos de Ejemplo Incluidos

El script incluye datos realistas para demostración:

### 👥 Usuarios (5)
- Joan (Project Manager)
- Danny (Full Stack Developer)
- Gian (Marketing Lead)
- Gianella (DevOps Engineer)
- Jhonny (UI/UX Designer)

**Contraseña para todos:** `password123`

### 📁 Proyectos (5)
1. **Rediseño de Sitio Web** - Modernización de sitio corporativo
2. **App Móvil iOS** - Desarrollo React Native
3. **Sistema de Inventario** - Gestión de inventario en tiempo real
4. **Campaña Marketing Q1** - Planificación de campaña 2025
5. **Migración a la Nube** - Infraestructura AWS

### ✅ Tareas (27 total)
- Distribuidas entre los 5 proyectos
- Estados variados: pending, in_progress, done
- Prioridades: low, medium, high
- Asignadas a diferentes colaboradores

### 👨‍💻 Colaboradores (10 relaciones)
- Cada proyecto tiene 2-3 colaboradores
- Simula equipos reales de trabajo

## 📝 Notas

- Los IDs no están hardcodeados (`user-1`, `proj-1`, etc.), pero facilitan las referencias
- Las contraseñas están hasheadas con bcrypt (salt rounds: 10)
- Las fechas usan `NOW() - INTERVAL` para simular creación escalonada
- Los índices mejoran el rendimiento de queries comunes

## 🔗 Integración con Drizzle

Este script es compatible con Drizzle ORM. Después de ejecutarlo:

```bash
# Sincronizar schema de Drizzle con la BD
yarn db:push
```
