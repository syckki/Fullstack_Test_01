import { test, expect } from '@playwright/test';

/**
 * Test E2E: Responsive Task Management
 * 
 * Este test valida las funcionalidades responsive de TaskFlow.
 * 
 * Cubre:
 * - Registro de usuario
 * - Creación de proyecto y tareas
 * - Vista Kanban en desktop (validación visual únicamente)
 * - Cambio de prioridad inline (desktop)
 * - Vista de lista en mobile (selectores inline)
 * - Filtros responsive
 * - Cambio de estado inline (mobile únicamente)
 * 
 * NO cubre:
 * - Drag-and-drop (requiere instrumentación especial para dnd-kit)
 * - Cambio de estado en desktop (solo disponible via drag-and-drop)
 */

test.describe('Responsive Task Management', () => {
  // Variables para compartir entre tests
  let testUsername: string;
  let testEmail: string;
  let testProjectName: string;
  let testTaskName: string;

  test.beforeEach(async () => {
    // Generar credenciales únicas para cada test
    const timestamp = Date.now();
    testUsername = `Medaly${timestamp}`;
    testEmail = `${testUsername}@test.com`;
    testProjectName = `Test Project ${timestamp}`;
    testTaskName = `Responsive Test Task ${timestamp}`;
  });

  test('flujo completo: registro, creación, desktop Kanban, mobile list view', async ({ page }, testInfo) => {
    // ===========================================
    // PARTE 1: REGISTRO DE USUARIO
    // ===========================================
    console.log('📝 Paso 1: Registrando nuevo usuario...');
    
    await page.goto('/');
    await expect(page).toHaveURL('/login');

    // Ir a página de registro usando data-testid
    await page.click('[data-testid="link-register"]');
    await expect(page).toHaveURL('/register');

    // Llenar formulario de registro
    await page.fill('[data-testid="input-username"]', testUsername);
    await page.fill('[data-testid="input-email"]', testEmail);
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.fill('[data-testid="input-confirm-password"]', 'password123');

    // Enviar formulario
    let submitButton = page.getByTestId('button-submit');

    // Esperar que esté habilitado
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Verificar redirección a proyectos
    const isMobile = testInfo.project.name === 'mobile';
    const isDesktop = !isMobile;

    if (isMobile) {
      await page.getByTestId('button-sidebar-toggle').click();
    }

    await expect(page.getByTestId('title-username')).toHaveText(testUsername);
    console.log('✅ Usuario registrado exitosamente');

    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');

    // ===========================================
    // PARTE 2: CREAR PROYECTO
    // ===========================================
    console.log('📁 Paso 2: Creando proyecto de prueba...');
    
    const createProjectButton = page.getByTestId('button-create-project');

    // Esperar que esté habilitado
    await expect(createProjectButton).toBeEnabled();
    await createProjectButton.click();
    
    // Llenar formulario de proyecto
    await page.fill('[data-testid="input-project-name"]', testProjectName);
    await page.fill('[data-testid="input-project-description"]', 'Project for responsive testing');
    
    // Enviar formulario
    const saveProjectButton = page.getByTestId('button-save-project');

    // Esperar que esté habilitado
    await expect(saveProjectButton).toBeEnabled();
    await saveProjectButton.click();
    
    // Verificar que el proyecto aparece
    await expect(page.locator(`text=${testProjectName}`)).toBeVisible({ timeout: 5000 });
    console.log('✅ Proyecto creado exitosamente');

    // ===========================================
    // PARTE 3: IR A PÁGINA DE TAREAS
    // ===========================================
    console.log('📋 Paso 3: Navegando a página de tareas...');

    if (isMobile) {
      await page.getByTestId('button-sidebar-toggle').click();
    }
    
    await page.click('text=Todas las Tareas');
    await expect(page).toHaveURL('/tasks');
    console.log('✅ En página de tareas');

    // ===========================================
    // PARTE 4: CREAR TAREA
    // ===========================================
    console.log('➕ Paso 4: Creando tarea de prueba...');
    
    await page.click('[data-testid="button-create-task"]');
    
    // Llenar formulario de tarea
    await page.fill('[data-testid="input-task-title"]', testTaskName);
    await page.fill('[data-testid="input-task-description"]', 'Task for testing responsive design');
    
    // Seleccionar proyecto (usando el selector)
    await page.getByTestId('select-project').click();
    await page.getByRole('option', { name: testProjectName }).click();
    
    // Enviar formulario
    const saveTaskButton = page.getByTestId('button-save-task');

    // Esperar que esté habilitado
    await expect(saveTaskButton).toBeEnabled();
    await saveTaskButton.click();
    
    // Verificar que la tarea aparece en la columna Pendiente
    let taskTitles = page.getByTestId(`text-task-title-${testTaskName}`);
    await expect(taskTitles.nth(isMobile ? 1: 0)).toBeVisible();

    console.log('✅ Tarea creada exitosamente');

    // ===========================================
    // PARTE 5: TESTS EN DESKTOP (KANBAN)
    // ===========================================
    console.log('🖥️ Paso 5: Validando vista Kanban en desktop...');
    
    // Verificar que el Kanban board está visible
    if (isDesktop) {
      await expect(page.locator('[data-testid="dropzone-pending"]')).toBeVisible();
      await expect(page.locator('[data-testid="dropzone-in_progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="dropzone-done"]')).toBeVisible();
    }
    
    // Verificar que todos los filtros están visibles
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-project"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-assigned-to"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-priority"]')).toBeVisible();
    console.log('✅ Kanban board y filtros visibles');

    // ===========================================
    // PARTE 6: CAMBIAR PRIORIDAD (DESKTOP)
    // ===========================================
    if (isDesktop) {
      console.log('🎯 Paso 6: Cambiando prioridad de tarea (desktop)...');
      
      // Buscar el Card que contiene el título de la tarea (selector robusto)
      const taskCard = page.locator('[data-testid^="card-task-"]', { 
        has: page.locator(`text=${testTaskName}`) 
      }).first();
      
      await taskCard.scrollIntoViewIfNeeded();
      
      // Buscar el selector de prioridad dentro de esta card específica
      const prioritySelector = taskCard.locator('[data-testid^="select-priority-"]');
      
      // Click en el selector de prioridad (abre dropdown)
      await prioritySelector.click();
      
      // Esperar que el dropdown se abra y seleccionar "Alta"
      await page.getByRole('option', { name: "Alta" }).click();
      
      // Esperar toast de éxito
      const toastTitle = page.getByTestId('toast-title');

      await expect(toastTitle).toBeVisible({ timeout: 5000 });
      await expect(toastTitle).toHaveText(/Tarea actualizada/i);
      console.log('✅ Prioridad cambiada a Alta');
    }

    // ===========================================
    // PARTE 7: VALIDACIÓN VISUAL KANBAN (DESKTOP)
    // ===========================================
    if (isDesktop) {
      console.log('👁️ Paso 7: Validando vista Kanban en desktop...');
      
      // Verificar que la tarea está visible en la columna Pendiente
      await expect(page.locator('[data-testid="dropzone-pending"]').locator(`text=${testTaskName}`)).toBeVisible({ timeout: 5000 });
      console.log('✅ Tarea visible en columna Pendiente');
      
      // NOTA: En desktop Kanban, el cambio de estado se hace vía drag-and-drop
      // DnD Kit requiere configuración especial para Playwright (no soportado actualmente)
      // El cambio de estado se prueba en mobile donde existe selector inline
      console.log('ℹ️ Cambio de estado en desktop via drag-and-drop no soportado');
      console.log('ℹ️ Cambio de estado se probará en mobile con selector inline');
    }

    // ===========================================
    // PARTE 8: CAMBIAR A MOBILE VIEWPORT
    // ===========================================
    console.log(`📱 Paso ${isMobile ? 6 : 8}: Cambiando a viewport mobile...`);
    
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verificar que el Kanban board está oculto
    await expect(page.locator('[data-testid="dropzone-pending"]')).not.toBeVisible();
    
    // Verificar que la tarea aparece en la lista mobile
    taskTitles = page.getByTestId(`text-task-title-${testTaskName}`);
    await expect(taskTitles.nth(1)).toBeVisible();
    
    // Verificar que los filtros siguen visibles
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
    console.log('✅ Vista mobile activada');
  

    // ===========================================
    // PARTE 9: FILTRO DE ESTADO (MOBILE)
    // ===========================================
    console.log(`🔍 Paso ${isMobile ? 7 : 9}: Probando filtro de estado en mobile...`);
    
    // La tarea está en estado "Pendiente" (su estado inicial)
    // Seleccionar "Pendiente" en el filtro de estado
    await page.click('[data-testid="filter-status"]');
    await page.getByRole('option', { name: "Pendiente" }).click();
    
    // Verificar que la tarea sigue visible (porque está en estado "Pendiente")
    taskTitles = page.getByTestId(`text-task-title-${testTaskName}`);
    await expect(taskTitles.nth(1)).toBeVisible();
    console.log('✅ Filtro de estado funciona - mostrando tareas Pendientes');

    // ===========================================
    // PARTE 10: CAMBIAR ESTADO CON SELECTOR INLINE (MOBILE)
    // ===========================================
    console.log(`✏️ Paso ${isMobile ? 8 : 10}: Cambiando estado con selector inline (mobile)...`);
    
    // Buscar el Card que contiene el título de la tarea (selector robusto)
    const mobileTaskCard = page.getByTestId(`text-task-title-${testTaskName}`).nth(1).locator('xpath=ancestor::div[starts-with(@data-testid, "card-task-")]')
    
    await mobileTaskCard.scrollIntoViewIfNeeded();
    
    // Buscar el selector de estado dentro de esta card específica
    const statusSelector = mobileTaskCard.locator('[data-testid^="select-status-"]');
    await statusSelector.click();
    
    // Seleccionar "Completada" del dropdown
    // await page.click('text=Completada');
    await page.getByRole('option', { name: "Completada" }).click();
    
    // Esperar toast de éxito
    const toastTitle = page.getByTestId('toast-title');

    await expect(toastTitle).toBeVisible({ timeout: 5000 });
    await expect(toastTitle).toHaveText(/Tarea actualizada/i);
    
    // La tarea debería desaparecer porque el filtro muestra solo "Pendiente"
    // pero acabamos de cambiarla a "Completada"
    taskTitles = page.getByTestId(`text-task-title-${testTaskName}`);
    await expect(taskTitles.nth(1)).not.toBeVisible({ timeout: 5000 });

    console.log('✅ Estado cambiado a Completada (tarea filtrada)');
    

    // ===========================================
    // PARTE 11: VERIFICAR EN FILTRO "COMPLETADA"
    // ===========================================
    console.log(`✔️ Paso ${isMobile ? 9 : 11}: Verificando tarea en estado Completada...`);
    
    // Cambiar filtro a "Completada"
    await page.click('[data-testid="filter-status"]');
    await page.getByRole('option', { name: "Completada" }).click();
    
    // Verificar que la tarea ahora aparece
    taskTitles = page.getByTestId(`text-task-title-${testTaskName}`);
    await expect(taskTitles.nth(1)).toBeVisible({ timeout: 5000 });
    

    // ===========================================
    // PARTE 12: VOLVER A DESKTOP
    // ===========================================
    if (isDesktop) {
      console.log('🖥️ Paso 12: Volviendo a viewport desktop...');
      
      await page.setViewportSize({ width: 1280, height: 720 });
      
      // Verificar que el Kanban board vuelve a ser visible
      await expect(page.locator('[data-testid="dropzone-done"]')).toBeVisible();
      
      // Verificar que la tarea está en la columna "Completada"
      await expect(page.locator('[data-testid="dropzone-done"]').locator(`text=${testTaskName}`)).toBeVisible({ timeout: 5000 });
      
      // Verificar que el filtro de estado sigue en "Completada" (persistencia)
      const statusFilter = page.locator('[data-testid="filter-status"]');
      await expect(statusFilter).toContainText('Completada');
      
      console.log('✅ Vista desktop restaurada con cambios persistidos');
    }

    // ===========================================
    // VERIFICACIÓN FINAL
    // ===========================================
    if (isDesktop) {
      console.log('🎉 Paso 13: Verificación final...');
      
      // Resetear filtros
      await page.click('[data-testid="filter-status"]');
      await page.getByRole('option', { name: "Todos" }).click();
      
      // Verificar que la tarea sigue en Done con prioridad Alta
      const finalTask = page.locator('[data-testid="dropzone-done"]').locator(`text=${testTaskName}`);
      await expect(finalTask).toBeVisible();
    }

    console.log('✅ ¡Test E2E completado exitosamente! 🎊');
  });

});
