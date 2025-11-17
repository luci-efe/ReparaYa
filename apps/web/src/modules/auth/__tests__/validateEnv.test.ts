import { validateAuthEnv, validateOptionalAuthEnv } from "../utils/validateEnv";

/**
 * TC-AUTH-018: Validación de variables de entorno al iniciar
 * Requisito: AUTH-001
 * Tipo: Unitaria
 * Prioridad: Alta
 */
describe("TC-AUTH-018: Validación de variables de entorno", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Resetear process.env antes de cada test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restaurar process.env original
    process.env = originalEnv;
  });

  describe("validateAuthEnv - Variables críticas", () => {
    it("debe pasar si todas las variables críticas están configuradas", () => {
      process.env.CLERK_SECRET_KEY = "sk_test_valid_key_123";
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid_key_456";

      expect(() => validateAuthEnv()).not.toThrow();
    });

    it("debe lanzar error si falta CLERK_SECRET_KEY", () => {
      delete process.env.CLERK_SECRET_KEY;
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid_key_456";

      expect(() => validateAuthEnv()).toThrow(
        /Variables de entorno críticas faltantes: CLERK_SECRET_KEY/
      );
    });

    it("debe lanzar error si falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", () => {
      process.env.CLERK_SECRET_KEY = "sk_test_valid_key_123";
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      expect(() => validateAuthEnv()).toThrow(
        /Variables de entorno críticas faltantes: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/
      );
    });

    it("debe lanzar error si faltan ambas variables", () => {
      delete process.env.CLERK_SECRET_KEY;
      delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

      expect(() => validateAuthEnv()).toThrow(
        /Variables de entorno críticas faltantes: CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/
      );
    });

    it("debe lanzar error si CLERK_SECRET_KEY está vacía", () => {
      process.env.CLERK_SECRET_KEY = "";
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid_key_456";

      expect(() => validateAuthEnv()).toThrow(
        /Variables de entorno críticas faltantes: CLERK_SECRET_KEY/
      );
    });

    it("debe lanzar error si CLERK_SECRET_KEY es solo espacios", () => {
      process.env.CLERK_SECRET_KEY = "   ";
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid_key_456";

      expect(() => validateAuthEnv()).toThrow(
        /Variables de entorno críticas faltantes: CLERK_SECRET_KEY/
      );
    });
  });

  describe("validateOptionalAuthEnv - Variables opcionales", () => {
    it("debe retornar array vacío si todas las variables opcionales están configuradas", () => {
      process.env.CLERK_WEBHOOK_SECRET = "whsec_test_secret_123";

      const warnings = validateOptionalAuthEnv();

      expect(warnings).toEqual([]);
    });

    it("debe retornar advertencia si falta CLERK_WEBHOOK_SECRET", () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      const warnings = validateOptionalAuthEnv();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("CLERK_WEBHOOK_SECRET");
    });

    it("debe retornar advertencia si CLERK_WEBHOOK_SECRET está vacía", () => {
      process.env.CLERK_WEBHOOK_SECRET = "";

      const warnings = validateOptionalAuthEnv();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("CLERK_WEBHOOK_SECRET");
    });

    it("no debe lanzar error, solo advertencias", () => {
      delete process.env.CLERK_WEBHOOK_SECRET;

      expect(() => validateOptionalAuthEnv()).not.toThrow();
    });
  });

  describe("Integración con AUTH-001", () => {
    it("debe validar que la app no puede iniciar sin variables críticas", () => {
      // Simular environment vacío
      process.env = {} as NodeJS.ProcessEnv;

      // Intentar validar debe fallar
      expect(() => validateAuthEnv()).toThrow(
        /La aplicación no puede iniciar sin estas variables configuradas/
      );
    });

    it("debe permitir iniciar si solo faltan variables opcionales", () => {
      process.env.CLERK_SECRET_KEY = "sk_test_valid_key_123";
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_valid_key_456";
      delete process.env.CLERK_WEBHOOK_SECRET;

      // Validar variables críticas debe pasar
      expect(() => validateAuthEnv()).not.toThrow();

      // Validar variables opcionales debe retornar advertencias pero no fallar
      const warnings = validateOptionalAuthEnv();
      expect(warnings.length).toBeGreaterThan(0);
    });
  });
});
