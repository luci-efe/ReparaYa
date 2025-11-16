/**
 * Smoke Test
 *
 * Test básico de verificación para asegurar que el entorno de pruebas
 * está correctamente configurado y funcionando.
 *
 * Este test debe ejecutarse antes de ejecutar cualquier suite de pruebas
 * más compleja para validar que Jest y las herramientas de testing están
 * correctamente instaladas y configuradas.
 */

describe("smoke test", () => {
  it("true is still true", () => {
    expect(true).toBe(true);
  });

  it("basic arithmetic works", () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
  });

  it("Jest can handle async tests", async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
