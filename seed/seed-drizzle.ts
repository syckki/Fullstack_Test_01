/**
 * Seed de base de datos usando Drizzle ORM
 * 
 * VENTAJAS:
 * - ✅ Agnóstico de BD (funciona con MySQL, MySQL, SQLite)
 * - ✅ Type-safe (TypeScript valida los datos)
 * - ✅ Usa las mismas tablas de shared/schema.ts
 * - ✅ No requiere SQL específico de cada motor
 * 
 * Uso:
 *   tsx seed/seed-drizzle.ts
 */

import { db } from '../backend/db';
import { users, projects, tasks, projectCollaborators } from '../shared/schema';
import bcrypt from 'bcryptjs';

async function seedDrizzle() {
  console.log('🌱 Iniciando seed con Drizzle ORM...\n');

  try {
    // =====================================================
    // 1. LIMPIAR DATOS EXISTENTES
    // =====================================================
    console.log('🗑️  Limpiando datos existentes...');
    
    await db.delete(projectCollaborators);
    await db.delete(tasks);
    await db.delete(projects);
    await db.delete(users);
    
    console.log('✅ Datos eliminados\n');

    // =====================================================
    // 2. INSERTAR USUARIOS
    // =====================================================
    console.log('👥 Creando usuarios...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    const now = new Date();

    const ramdomUsers = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`user-${i+1}`, crypto.randomUUID()])
    );

    const ramdomProjects = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`proj-${i+1}`, crypto.randomUUID()])
    );

    const insertedUsers = await db.insert(users).values([
      {
        id: ramdomUsers['user-1'],
        username: 'Joan',
        email: 'joan@taskflow.com',
        password: hashedPassword,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
      },
      {
        id: ramdomUsers['user-2'],
        username: 'Danny',
        email: 'danny@taskflow.com',
        password: hashedPassword,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomUsers['user-3'],
        username: 'Gian',
        email: 'gian@taskflow.com',
        password: hashedPassword,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomUsers['user-4'],
        username: 'Gianella',
        email: 'gianella@taskflow.com',
        password: hashedPassword,
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomUsers['user-5'],
        username: 'Jhonny',
        email: 'jhonny@taskflow.com',
        password: hashedPassword,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    ]).$returningId();

    console.log(`✅ ${insertedUsers.length} usuarios creados\n`);

    // =====================================================
    // 3. INSERTAR PROYECTOS
    // =====================================================
    console.log('📁 Creando proyectos...');

    const insertedProjects = await db.insert(projects).values([
      {
        id: ramdomProjects['proj-1'],
        name: 'Rediseño de Sitio Web',
        description: 'Modernizar el sitio web corporativo con nuevo diseño y mejoras de UX',
        creatorId: ramdomUsers['user-1'],
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomProjects['proj-2'],
        name: 'App Móvil iOS',
        description: 'Desarrollo de aplicación móvil nativa para iOS con React Native',
        creatorId: ramdomUsers['user-1'],
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomProjects['proj-3'],
        name: 'Sistema de Inventario',
        description: 'Implementación de sistema de gestión de inventario en tiempo real',
        creatorId: ramdomUsers['user-2'],
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomProjects['proj-4'],
        name: 'Campaña Marketing Q1',
        description: 'Planificación y ejecución de campaña de marketing para Q1 2025',
        creatorId: ramdomUsers['user-3'],
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        id: ramdomProjects['proj-5'],
        name: 'Migración a la Nube',
        description: 'Migrar infraestructura on-premise a AWS con alta disponibilidad',
        creatorId: ramdomUsers['user-4'],
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
    ]).$returningId();

    console.log(`✅ ${insertedProjects.length} proyectos creados\n`);

    // =====================================================
    // 4. INSERTAR COLABORADORES
    // =====================================================
    console.log('🤝 Creando colaboradores...');

    const insertedCollaborators = await db.insert(projectCollaborators).values([
      // Proyecto 1
      { /*id: 'collab-1', */projectId: ramdomProjects['proj-1'], userId: ramdomUsers['user-2'], addedAt: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000) },
      { /*id: 'collab-2', */projectId: ramdomProjects['proj-1'], userId: ramdomUsers['user-3'], addedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000) },
      // Proyecto 2
      { /*id: 'collab-3', */projectId: ramdomProjects['proj-2'], userId: ramdomUsers['user-4'], addedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      { /*id: 'collab-4', */projectId: ramdomProjects['proj-2'], userId: ramdomUsers['user-5'], addedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000) },
      // Proyecto 3
      { /*id: 'collab-5', */projectId: ramdomProjects['proj-3'], userId: ramdomUsers['user-1'], addedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000) },
      { /*id: 'collab-6', */projectId: ramdomProjects['proj-3'], userId: ramdomUsers['user-5'], addedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) },
      // Proyecto 4
      { /*id: 'collab-7', */projectId: ramdomProjects['proj-4'], userId: ramdomUsers['user-2'], addedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      { /*id: 'collab-8', */projectId: ramdomProjects['proj-4'], userId: ramdomUsers['user-4'], addedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) },
      // Proyecto 5
      { /*id: 'collab-9', */projectId: ramdomProjects['proj-5'], userId: ramdomUsers['user-1'], addedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
      { /*id: 'collab-10', */projectId: ramdomProjects['proj-5'], userId: ramdomUsers['user-3'], addedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    ]).$returningId();

    console.log(`✅ ${insertedCollaborators.length} colaboradores creados\n`);

    // =====================================================
    // 5. INSERTAR TAREAS
    // =====================================================
    console.log('✅ Creando tareas...');

    // Proyecto 1: Rediseño Web (6 tareas)
    const proj1Tasks = await db.insert(tasks).values([
      {
        // id: 'task-1-1',
        title: 'Investigación de Usuarios',
        description: 'Realizar entrevistas con usuarios actuales para identificar puntos de dolor',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-1'],
        assignedToId: ramdomUsers['user-2'],
        createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-1-2',
        title: 'Diseño de Wireframes',
        description: 'Crear wireframes de baja fidelidad para todas las páginas principales',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-1'],
        assignedToId: ramdomUsers['user-3'],
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-1-3',
        title: 'Prototipos de Alta Fidelidad',
        description: 'Diseñar prototipos interactivos en Figma con el nuevo sistema de diseño',
        status: 'in_progress',
        priority: 'high',
        projectId: ramdomProjects['proj-1'],
        assignedToId: ramdomUsers['user-3'],
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-1-4',
        title: 'Desarrollo Frontend Homepage',
        description: 'Implementar nueva homepage con React y Tailwind CSS',
        status: 'in_progress',
        priority: 'high',
        projectId: ramdomProjects['proj-1'],
        assignedToId: ramdomUsers['user-2'],
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-1-5',
        title: 'Optimización SEO',
        description: 'Implementar mejoras de SEO on-page y meta tags',
        status: 'pending',
        priority: 'medium',
        projectId: ramdomProjects['proj-1'],
        assignedToId: ramdomUsers['user-2'],
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-1-6',
        title: 'Testing de Usabilidad',
        description: 'Realizar pruebas de usabilidad con grupo de usuarios',
        status: 'pending',
        priority: 'medium',
        projectId: ramdomProjects['proj-1'],
        assignedToId: null,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ]).$returningId();

    // Proyecto 2: App Móvil (6 tareas)
    const proj2Tasks = await db.insert(tasks).values([
      {
        // id: 'task-2-1',
        title: 'Setup del Proyecto RN',
        description: 'Configurar proyecto React Native con estructura de carpetas',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-2'],
        assignedToId: ramdomUsers['user-4'],
        createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-2-2',
        title: 'Sistema de Autenticación',
        description: 'Implementar login/registro con JWT y almacenamiento seguro',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-2'],
        assignedToId: ramdomUsers['user-4'],
        createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-2-3',
        title: 'Pantalla Principal',
        description: 'Desarrollar dashboard principal con navegación tab',
        status: 'in_progress',
        priority: 'high',
        projectId: ramdomProjects['proj-2'],
        assignedToId: ramdomUsers['user-5'],
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-2-4',
        title: 'Integración API Backend',
        description: 'Conectar app con API REST usando React Query',
        status: 'in_progress',
        priority: 'high',
        projectId: ramdomProjects['proj-2'],
        assignedToId: ramdomUsers['user-4'],
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-2-5',
        title: 'Notificaciones Push',
        description: 'Implementar sistema de notificaciones push con Firebase',
        status: 'pending',
        priority: 'medium',
        projectId: ramdomProjects['proj-2'],
        assignedToId: ramdomUsers['user-5'],
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-2-6',
        title: 'Testing en Dispositivos',
        description: 'Probar app en iPhone 12, 13, 14 y iPads',
        status: 'pending',
        priority: 'low',
        projectId: ramdomProjects['proj-2'],
        assignedToId: null,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ]).$returningId();

    // Proyecto 3: Inventario (5 tareas)
    const proj3Tasks = await db.insert(tasks).values([
      {
        // id: 'task-3-1',
        title: 'Diseño de Base de Datos',
        description: 'Crear esquema de BD con productos, categorías, ubicaciones, movimientos',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-3'],
        assignedToId: ramdomUsers['user-1'],
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-3-2',
        title: 'API CRUD Productos',
        description: 'Desarrollar endpoints REST para gestión de productos',
        status: 'done',
        priority: 'high',
        projectId: ramdomProjects['proj-3'],
        assignedToId: ramdomUsers['user-1'],
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-3-3',
        title: 'Dashboard de Inventario',
        description: 'Crear vista principal con tabla de productos y filtros',
        status: 'in_progress',
        priority: 'high',
        projectId: ramdomProjects['proj-3'],
        assignedToId: ramdomUsers['user-5'],
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-3-4',
        title: 'Sistema de Alertas',
        description: 'Implementar alertas de stock bajo y productos por vencer',
        status: 'pending',
        priority: 'medium',
        projectId: ramdomProjects['proj-3'],
        assignedToId: ramdomUsers['user-5'],
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        // id: 'task-3-5',
        title: 'Reportes de Movimientos',
        description: 'Generar reportes PDF de entradas/salidas por fecha',
        status: 'pending',
        priority: 'low',
        projectId: ramdomProjects['proj-3'],
        assignedToId: null,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ]).$returningId();

    const totalTasks = proj1Tasks.length + proj2Tasks.length + proj3Tasks.length;
    console.log(`✅ ${totalTasks} tareas creadas\n`);

    // =====================================================
    // 6. RESUMEN
    // =====================================================
    console.log('✅ Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   👥 Usuarios: ${insertedUsers.length}`);
    console.log(`   📁 Proyectos: ${insertedProjects.length}`);
    console.log(`   ✅ Tareas: ${totalTasks}`);
    console.log(`   🤝 Colaboradores: ${insertedCollaborators.length}`);

    console.log('\n🎉 Base de datos lista para usar!\n');
    console.log('💡 Credenciales de acceso:');
    console.log('   Email: maria@taskflow.com');
    console.log('   Password: password123\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error al ejecutar seed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar el seed
seedDrizzle();
