import { test, expect } from '@playwright/test';

/**
 * Test E2E: Autenticación
 * 
 * Tests para validar el flujo de registro e inicio de sesión
 */

test.describe('Autenticación', () => {
  test('registro de nuevo usuario', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const username = `Xiomara${timestamp}`;
    const email = `${username}@taskflow.com`;

    // Ir a página de registro
    await page.goto('/register');
    await expect(page).toHaveURL('/register');

    // Llenar formulario
    await page.fill('[data-testid="input-username"]', username);
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', 'password123');
    await page.fill('[data-testid="input-confirm-password"]', 'password123');

    // Enviar formulario

    const submitButton = page.getByTestId('button-submit');

    // Esperar que esté habilitado
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // // Verificar redirección al home
    await expect(page).toHaveURL('/', { timeout: 10000 });

    const isMobile = testInfo.project.name === 'mobile';

    if (isMobile) {
      await page.getByTestId('button-sidebar-toggle').click();
    }

    await expect(page.getByTestId('title-username')).toHaveText(username);
  });

  test('login con usuario existente', async ({ page }, testInfo) => {
    const timestamp = Date.now();
    const username = `Xiomara${timestamp}`;
    const email = `${username}@taskflow.com`;
    const password = 'password123';

    // Primero registrar el usuario
    await page.goto('/register');
    await page.fill('[data-testid="input-username"]', username);
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', password);
    await page.fill('[data-testid="input-confirm-password"]', 'password123');

    let submitButton = page.getByTestId('button-submit');
    await expect(submitButton).toBeEnabled();
    await submitButton.click()

    await expect(page).toHaveURL('/', { timeout: 10000 });

    const isMobile = testInfo.project.name === 'mobile';

    // Cerrar sesión
    if (isMobile) {
      await page.getByTestId('button-sidebar-toggle').click();
    }

    await page.getByTestId('button-logout').click();
    await expect(page).toHaveURL('/login');

    // Intentar login
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', password);

    submitButton = page.getByTestId('button-submit');
    await expect(submitButton).toBeEnabled();
    await submitButton.click()

    // Verificar login exitoso
    if (isMobile) {
      await page.getByTestId('button-sidebar-toggle').click();
    }

    await expect(page.getByTestId('title-username')).toHaveText(username);
  });

  test('login con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');

    // Intentar login con credenciales incorrectas
    await page.fill('[data-testid="input-email"]', 'noexiste@test.com');
    await page.fill('[data-testid="input-password"]', 'wrongpassword');

    const submitButton = page.getByTestId('button-submit');
    await expect(submitButton).toBeEnabled();
    await submitButton.click()

    // Verificar que muestra error
    const toastTitle = page.getByTestId('toast-title');
    const toastDesc = page.getByTestId('toast-description');

    await expect(toastTitle).toBeVisible({ timeout: 5000 });
    await expect(toastDesc).toBeVisible({ timeout: 5000 });

    await expect(toastTitle).toHaveText(/Error al iniciar sesión/i);
    await expect(toastDesc).toHaveText(/401: {"error":"Invalid credentials"}/i);
    
    // Verificar que NO redirige
    await expect(page).toHaveURL('/login');
  });

  test('acceso a ruta protegida sin autenticación', async ({ page }) => {
    // Intentar acceder a /projects sin estar autenticado
    await page.goto('/projects');

    // Debería redirigir a login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
