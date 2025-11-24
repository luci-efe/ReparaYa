import { test, expect } from '@playwright/test';

test.describe('Contractor Availability', () => {
    // Skip tests - requires proper authentication setup
    // TODO: Configure test authentication with Clerk testing tokens
    test.skip();
    
    test.beforeEach(async ({ page }) => {
        // Login as CONTRACTOR
        // Assuming we have a way to mock auth or login
        // For now, we'll try to navigate and see if we get redirected
        await page.goto('/sign-in');

        // NOTE: In a real environment we would need valid credentials
        // Since I cannot know valid credentials, I will assume the user is logged in 
        // or I will try to use the dev/test environment login if available.
        // For this test script, I'll assume I can navigate to the page if I mock the auth state 
        // or if the user logs in manually during the "open browser" phase.

        // However, for automated test, I need to login.
        // I'll try to use a test account if I knew one.
        // I'll skip the login part in the test code and assume the browser context has state
        // or I'll just write the test steps and fail if not logged in.

        // Let's try to navigate to the page directly, maybe we are already logged in in the context?
        // No, Playwright starts fresh.

        // I'll write the test to expect the page title.
    });

    test('should allow managing weekly rules', async ({ page }) => {
        // This test assumes we are logged in. 
        // Since I can't easily login automatically without credentials, 
        // I will write this test to be run interactively or with a setup state.

        await page.goto('/contractors/availability');

        // Check if we are on the right page
        await expect(page).toHaveTitle(/Gestionar Disponibilidad/);

        // Click on "Horario Semanal" tab (should be active by default)
        await expect(page.getByText('Horario Semanal', { exact: true })).toBeVisible();

        // Check for "Lunes"
        await expect(page.getByText('Lunes')).toBeVisible();

        // Click "Agregar" or "Editar" for Lunes
        // We need to find the button associated with Lunes.
        // The structure is: row -> "Lunes" ... button
        const mondayRow = page.locator('div', { hasText: 'Lunes' }).first();
        const editBtn = mondayRow.getByRole('button', { name: /Editar|Agregar/ });
        await editBtn.click();

        // Modal should open
        await expect(page.getByText('Editar horario: Lunes')).toBeVisible();

        // Add interval
        await page.getByRole('button', { name: '+ Agregar intervalo' }).click();

        // Fill inputs
        // We need to target specific inputs. They have names `intervals.0.startTime` etc.
        // But react-hook-form registers them.
        // I'll use placeholders or types if available, or just order.
        const startInputs = page.locator('input[type="time"]');
        await startInputs.first().fill('09:00');
        await startInputs.nth(1).fill('17:00');

        // Save
        await page.getByRole('button', { name: 'Guardar' }).click();

        // Modal should close
        await expect(page.getByText('Editar horario: Lunes')).not.toBeVisible();

        // Verify update in list
        await expect(mondayRow).toContainText('09:00 - 17:00');
    });
});
