import { test, expect } from '@playwright/test';

test.describe('Messaging Flow', () => {
    test('should allow client to send message to contractor', async ({ page }) => {
        // 1. Login as client
        await page.goto('/sign-in');
        // ... Mock login or use test credentials ...
        // For now, we assume we are logged in or mock the session if possible in E2E.
        // Since we can't easily mock Clerk in full E2E without setup, we'll write the steps assuming auth.

        // 2. Go to a confirmed booking
        await page.goto('/clients/bookings/booking-1');

        // 3. Check if chat is visible
        await expect(page.getByText('Mensajes')).toBeVisible();

        // 4. Send a message
        const messageInput = page.getByPlaceholder('Escribe un mensaje...');
        await messageInput.fill('Hello contractor');
        await page.getByRole('button', { name: 'Enviar' }).click();

        // 5. Verify message appears in list
        await expect(page.getByText('Hello contractor')).toBeVisible();

        // 6. Verify optimistic update (spinner should disappear)
        // This is hard to catch in E2E unless we slow down network.
    });

    test('should show expired notice for old bookings', async ({ page }) => {
        await page.goto('/clients/bookings/expired-booking-id');
        await expect(page.getByText('La ventana de mensajería ha cerrado')).toBeVisible();
        await expect(page.getByPlaceholder('La mensajería no está disponible')).toBeDisabled();
    });
});
