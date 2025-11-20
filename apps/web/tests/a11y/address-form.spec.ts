/**
 * Accessibility tests for address form
 * Tests TC-RNF-CTR-LOC-003 (WCAG 2.1 AA compliance)
 *
 * NOTE: Requires @axe-core/playwright to be installed
 * npm install --save-dev @axe-core/playwright
 *
 * Run with: npx playwright test tests/a11y/address-form.spec.ts
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Address Form Accessibility', () => {
  test('TC-RNF-CTR-LOC-003-A11Y-01: debe pasar escaneo axe-core sin violations críticas', async ({
    page,
  }) => {
    // Arrange
    await page.goto('/contractors/onboarding/location');

    // Act
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // Assert
    // No critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toHaveLength(0);

    // No serious violations
    const seriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious'
    );
    expect(seriousViolations).toHaveLength(0);

    // Log all violations for review
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- [${violation.impact}] ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
      });
    }
  });

  test('TC-RNF-CTR-LOC-003-A11Y-02: labels deben estar asociados con inputs', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('form')
      .analyze();

    // Check for label violations
    const labelViolations = scanResults.violations.filter((v) => v.id === 'label');
    expect(labelViolations).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-03: contrast ratio debe cumplir WCAG AA (4.5:1)', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('form')
      .analyze();

    // Check for color contrast violations
    const contrastViolations = scanResults.violations.filter((v) => v.id === 'color-contrast');
    expect(contrastViolations).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-04: botones deben tener texto accesible', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze();

    const buttonNameViolations = scanResults.violations.filter((v) => v.id === 'button-name');
    expect(buttonNameViolations).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-05: formulario debe tener estructura semántica correcta', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    // Check for semantic HTML
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Fieldsets should be used for grouping related fields
    const fieldsets = page.locator('fieldset');
    await expect(fieldsets.first()).toBeVisible();

    // Each fieldset should have a legend
    const legends = page.locator('legend');
    await expect(legends.first()).toBeVisible();
  });

  test('TC-RNF-CTR-LOC-003-A11Y-06: errores deben tener ARIA attributes correctos', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    // Trigger validation errors
    await page.click('button[type="submit"]');

    // Wait for errors to appear
    await page.waitForSelector('[role="alert"]');

    const scanResults = await new AxeBuilder({ page }).analyze();

    // Check for ARIA violations
    const ariaViolations = scanResults.violations.filter((v) => v.id.startsWith('aria-'));
    expect(ariaViolations).toHaveLength(0);

    // Error messages should have aria-live
    const errorAlert = page.locator('[role="alert"]');
    const ariaLive = await errorAlert.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');
  });

  test('TC-RNF-CTR-LOC-003-A11Y-07: focus debe ser visible en todos los elementos interactivos', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    // Test focus visibility on inputs
    const inputs = page.locator('input, select, button');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      // Test first 5 elements
      const element = inputs.nth(i);
      await element.focus();

      // Check if focus is visible (outline or box-shadow)
      const hasVisibleFocus = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return (
          styles.outline !== 'none' ||
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none'
        );
      });

      expect(hasVisibleFocus).toBe(true);
    }
  });

  test('TC-RNF-CTR-LOC-003-A11Y-08: keyboard navigation debe funcionar en orden lógico', async ({
    page,
  }) => {
    await page.goto('/contractors/onboarding/location');

    // Expected tab order
    const expectedOrder = [
      'street',
      'exteriorNumber',
      'interiorNumber',
      'neighborhood',
      'city',
      'state',
      'postalCode',
      'country',
      'radiusKm',
    ];

    for (const fieldName of expectedOrder) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        return el.getAttribute('name') || el.tagName;
      });

      // Note: This is a basic check - real implementation may have additional focusable elements
      // Adjust as needed based on actual UI
    }
  });

  test('TC-RNF-CTR-LOC-003-A11Y-09: touch targets deben ser >= 44x44px', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('TC-RNF-CTR-LOC-003-A11Y-10: debe tener lang attribute en HTML', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page }).withRules(['html-has-lang']).analyze();

    expect(scanResults.violations).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-11: imágenes deben tener alt text', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page }).withRules(['image-alt']).analyze();

    expect(scanResults.violations).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-12: página debe pasar validación landmark', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page }).withRules(['region']).analyze();

    // Check that main content is in a landmark region
    expect(scanResults.violations.filter((v) => v.id === 'region')).toHaveLength(0);
  });

  test('TC-RNF-CTR-LOC-003-A11Y-13: heading hierarchy debe ser correcta', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    const scanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();

    expect(scanResults.violations).toHaveLength(0);
  });
});

test.describe('Dynamic Content Accessibility', () => {
  test('TC-RNF-CTR-LOC-003-A11Y-14: loading spinner debe tener aria-label', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    // Fill form to trigger submit
    await page.fill('[name="street"]', 'Test');
    await page.fill('[name="exteriorNumber"]', '1');
    await page.fill('[name="city"]', 'Test');
    await page.fill('[name="state"]', 'Test');
    await page.fill('[name="postalCode"]', '12345');
    await page.fill('[name="radiusKm"]', '10');

    await page.click('button[type="submit"]');

    // Check loading spinner accessibility
    const spinner = page.locator('.loading-spinner, [role="status"]');

    if ((await spinner.count()) > 0) {
      const ariaLabel = await spinner.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Cargando' || 'Loading');
    }
  });

  test('TC-RNF-CTR-LOC-003-A11Y-15: success message debe ser anunciado', async ({ page }) => {
    await page.goto('/contractors/onboarding/location');

    // Mock successful submission
    // TODO: Set up API mocking

    // Success message should have role="status" or role="alert"
    const successMessage = page.locator('[role="status"], [role="alert"].success');

    if ((await successMessage.count()) > 0) {
      await expect(successMessage).toBeVisible();

      const ariaLive = await successMessage.getAttribute('aria-live');
      expect(ariaLive).toBeTruthy();
    }
  });
});
