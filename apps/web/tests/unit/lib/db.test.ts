import { getDatasourceUrl } from "@/lib/db";

describe("getDatasourceUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("when DATABASE_URL is not set", () => {
    it("returns undefined when no URL is provided", () => {
      expect(getDatasourceUrl()).toBeUndefined();
    });

    it("returns undefined when empty string is provided", () => {
      expect(getDatasourceUrl("")).toBeUndefined();
    });
  });

  describe("when URL has no query parameters", () => {
    it("appends pgbouncer and statement_cache_size parameters", () => {
      const url = "postgresql://user:pass@host:5432/database";
      const result = getDatasourceUrl(url);

      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });

    it("uses ? as separator for first parameter", () => {
      const url = "postgresql://user:pass@host:5432/database";
      const result = getDatasourceUrl(url);

      expect(result).toMatch(/\?.*pgbouncer=true/);
    });
  });

  describe("when URL has existing query parameters", () => {
    it("appends pgbouncer parameters with & separator", () => {
      const url = "postgresql://user:pass@host:5432/database?sslmode=require";
      const result = getDatasourceUrl(url);

      expect(result).toContain("sslmode=require");
      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });
  });

  describe("when pgbouncer=true is already set", () => {
    it("does not modify URL if pgbouncer=true and statement_cache_size are present", () => {
      const url =
        "postgresql://user:pass@host:5432/database?pgbouncer=true&statement_cache_size=0";
      const result = getDatasourceUrl(url);

      expect(result).toBe(url);
    });

    it("adds statement_cache_size if only pgbouncer=true is present", () => {
      const url = "postgresql://user:pass@host:5432/database?pgbouncer=true";
      const result = getDatasourceUrl(url);

      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });
  });

  describe("when pgbouncer is set to a value other than true", () => {
    it("overrides pgbouncer=false with pgbouncer=true", () => {
      const url = "postgresql://user:pass@host:5432/database?pgbouncer=false";
      const result = getDatasourceUrl(url);

      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });

    it("overrides pgbouncer=0 with pgbouncer=true", () => {
      const url = "postgresql://user:pass@host:5432/database?pgbouncer=0";
      const result = getDatasourceUrl(url);

      expect(result).toContain("pgbouncer=true");
    });
  });

  describe("fallback string manipulation", () => {
    // Note: These tests verify the fallback logic when URL parsing fails
    // We can't easily simulate URL parsing failure with valid URLs,
    // but we can test that standard URLs work correctly

    it("handles URLs with special characters in password", () => {
      // URL constructor should handle this, but the fallback would catch it
      const url = "postgresql://user:p%40ss@host:5432/database";
      const result = getDatasourceUrl(url);

      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });
  });

  describe("uses DATABASE_URL from environment when no URL parameter provided", () => {
    it("uses DATABASE_URL environment variable", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@host:5432/database";
      const result = getDatasourceUrl();

      expect(result).toContain("pgbouncer=true");
      expect(result).toContain("statement_cache_size=0");
    });
  });
});
