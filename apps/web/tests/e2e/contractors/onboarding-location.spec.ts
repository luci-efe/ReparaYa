/**
 * E2E tests for contractor location onboarding flow
 * Tests TC-RF-CTR-LOC-001 (E2E), TC-RNF-CTR-LOC-003
 *
 * NOTE: This requires Playwright to be installed and configured
 * Run with: npx playwright test tests/e2e/contractors/onboarding-location.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Contractor Location Onboarding Flow', () => {
  // Setup and teardown
  test.beforeEach(async ({ page }) => {
    // TODO: Set up authentication (Clerk test user)
    // TODO: Navigate to contractor onboarding page
  });

  test('TC-RF-CTR-LOC-001-E2E-01: debe completar flujo de onboarding de ubicación exitosamente', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Act - Fill address form
    await page.fill('[name="street"]', 'Av. Insurgentes Sur');
    await page.fill('[name="exteriorNumber"]', '123');
    await page.fill('[name="interiorNumber"]', 'Piso 5');
    await page.fill('[name="neighborhood"]', 'Roma Norte');
    await page.fill('[name="city"]', 'Ciudad de México');
    await page.fill('[name="state"]', 'CDMX');
    await page.fill('[name="postalCode"]', '06700');
    await page.selectOption('[name="country"]', 'MX');

    // Configure service zone
    await page.selectOption('[name="zoneType"]', 'RADIUS');
    await page.fill('[name="radiusKm"]', '15');

    // Submit form
    await page.click('button[type="submit"]');

    // Assert
    await expect(page).toHaveURL(/\/contractors\/onboarding\/next-step/);
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('TC-RF-CTR-LOC-001-E2E-02: debe mostrar error de validación con mensaje claro', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Act - Submit empty form
    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('calle es requerida');
  });

  test('TC-RF-CTR-LOC-003-E2E-01: debe mostrar advertencia pero permitir continuar cuando geocoding falla', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Mock geocoding failure (requires API mocking)
    // TODO: Set up API mocking for geocoding failure

    // Act
    await page.fill('[name="street"]', 'Dirección ambigua');
    await page.fill('[name="exteriorNumber"]', '1');
    await page.fill('[name="city"]', 'Test');
    await page.fill('[name="state"]', 'Test');
    await page.fill('[name="postalCode"]', '12345');
    await page.selectOption('[name="country"]', 'MX');
    await page.fill('[name="radiusKm"]', '10');

    await page.click('button[type="submit"]');

    // Assert
    await expect(page.locator('[role="alert"].warning')).toBeVisible();
    await expect(page.locator('.warning-message')).toContainText(
      'No pudimos validar la dirección'
    );

    // Should still be able to proceed
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('TC-RNF-CTR-LOC-003-E2E-01: navegación por teclado funciona correctamente', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Act - Navigate using Tab key
    await page.keyboard.press('Tab'); // Focus on street
    expect(await page.locator('[name="street"]').evaluate((el) => el === document.activeElement))
      .toBe(true);

    await page.keyboard.press('Tab'); // Focus on exterior number
    expect(
      await page
        .locator('[name="exteriorNumber"]')
        .evaluate((el) => el === document.activeElement)
    ).toBe(true);

    // Fill form using keyboard
    await page.keyboard.type('Av. Test');
    await page.keyboard.press('Tab');
    await page.keyboard.type('100');

    // Navigate to submit button
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Submit with Enter
    await page.keyboard.press('Enter');

    // Assert - Form should attempt submission
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('TC-RF-CTR-LOC-001-E2E-03: usuario no autenticado redirige a login', async ({ page }) => {
    // Arrange - Clear authentication
    // TODO: Clear Clerk session

    // Act
    await page.goto('/contractors/onboarding/location');

    // Assert
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('TC-RF-CTR-LOC-006-E2E-01: slider de radio funciona correctamente', async ({ page }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Act - Move slider
    const slider = page.locator('input[type="range"][name="radiusKm"]');
    await slider.fill('50');

    // Assert
    const displayValue = page.locator('.radius-display');
    await expect(displayValue).toContainText('50 km');
  });

  test('TC-RF-CTR-LOC-001-E2E-04: debe mostrar loading state durante geocoding', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Fill form
    await page.fill('[name="street"]', 'Av. Test');
    await page.fill('[name="exteriorNumber"]', '100');
    await page.fill('[name="city"]', 'CDMX');
    await page.fill('[name="state"]', 'CDMX');
    await page.fill('[name="postalCode"]', '06700');
    await page.selectOption('[name="country"]', 'MX');
    await page.fill('[name="radiusKm"]', '10');

    // Act
    await page.click('button[type="submit"]');

    // Assert - Loading indicator should appear briefly
    await expect(page.locator('.loading-spinner')).toBeVisible();
  });
});

test.describe('Service Zone Configurator', () => {
  test('TC-RF-CTR-LOC-007-E2E-01: debe validar radio mínimo y máximo', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    // Try to set radius below minimum (1 km)
    await page.fill('[name="radiusKm"]', '0');
    await expect(page.locator('.error-message')).toContainText('mínimo 1 km');

    // Try to set radius above maximum (100 km)
    await page.fill('[name="radiusKm"]', '150');
    await expect(page.locator('.error-message')).toContainText('máximo 100 km');

    // Valid radius should clear error
    await page.fill('[name="radiusKm"]', '50');
    await expect(page.locator('.error-message')).not.toBeVisible();
  });

  test('TC-RF-CTR-LOC-003-E2E-02: tipo POLYGON debe estar deshabilitado en MVP', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    const polygonOption = page.locator('input[value="POLYGON"]');
    await expect(polygonOption).toBeDisabled();

    const polygonLabel = page.locator('label:has-text("Polígono personalizado")');
    await expect(polygonLabel).toContainText('Disponible próximamente');
  });
});

test.describe('Accessibility', () => {
  test('TC-RNF-CTR-LOC-003-E2E-02: formulario debe tener labels correctos', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    // Check all form fields have associated labels
    const fields = ['street', 'exteriorNumber', 'city', 'state', 'postalCode'];

    for (const field of fields) {
      const input = page.locator(`[name="${field}"]`);
      const labelFor = await input.getAttribute('id');
      const label = page.locator(`label[for="${labelFor}"]`);

      await expect(label).toBeVisible();
    }
  });

  test('TC-RNF-CTR-LOC-003-E2E-03: mensajes de error deben ser anunciados', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    // Submit empty form to trigger errors
    await page.click('button[type="submit"]');

    // Error container should have role="alert" for screen readers
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toHaveAttribute('aria-live', 'polite');
  });

  test('TC-RNF-CTR-LOC-003-E2E-04: focus states deben ser visibles', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const streetInput = page.locator('[name="street"]');
    await streetInput.focus();

    // Check that focused element has visible outline
    const outline = await streetInput.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });

    expect(outline).not.toBe('none');
  });
});
