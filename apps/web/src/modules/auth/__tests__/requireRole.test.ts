import { requireRole, requireAnyRole } from "../utils/requireRole";
import { requireAuth } from "../utils/requireAuth";
import { ForbiddenError } from "../errors";
import type { AuthUser } from "../types";

// Mock de requireAuth
jest.mock("../utils/requireAuth");

describe("requireRole", () => {
  const mockClient: AuthUser = {
    id: "uuid-client",
    clerkUserId: "user_clerk_client",
    email: "client@example.com",
    firstName: "Cliente",
    lastName: "Test",
    phone: null,
    avatarUrl: null,
    role: "CLIENT",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockContractor: AuthUser = {
    id: "uuid-contractor",
    clerkUserId: "user_clerk_contractor",
    email: "contractor@example.com",
    firstName: "Contratista",
    lastName: "Test",
    phone: null,
    avatarUrl: null,
    role: "CONTRACTOR",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  const mockAdmin: AuthUser = {
    id: "uuid-admin",
    clerkUserId: "user_clerk_admin",
    email: "admin@reparaya.com",
    firstName: "Admin",
    lastName: "Test",
    phone: null,
    avatarUrl: null,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requireRole", () => {
    it("debe retornar el usuario si tiene el rol requerido", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await requireRole("ADMIN");

      expect(result).toEqual(mockAdmin);
      expect(requireAuth).toHaveBeenCalledTimes(1);
    });

    it("debe lanzar ForbiddenError si el usuario no tiene el rol requerido", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      await expect(requireRole("ADMIN")).rejects.toThrow(ForbiddenError);
      await expect(requireRole("ADMIN")).rejects.toThrow(
        "Acceso prohibido. Esta acción requiere el rol: ADMIN"
      );
    });

    it("debe permitir acceso a CLIENT si se requiere CLIENT", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      const result = await requireRole("CLIENT");

      expect(result).toEqual(mockClient);
    });

    it("debe permitir acceso a CONTRACTOR si se requiere CONTRACTOR", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockContractor);

      const result = await requireRole("CONTRACTOR");

      expect(result).toEqual(mockContractor);
    });

    it("debe rechazar CONTRACTOR si se requiere ADMIN", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockContractor);

      await expect(requireRole("ADMIN")).rejects.toThrow(ForbiddenError);
    });

    it("debe rechazar CLIENT si se requiere CONTRACTOR", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      await expect(requireRole("CONTRACTOR")).rejects.toThrow(ForbiddenError);
    });

    it("el error debe incluir el rol requerido", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      try {
        await requireRole("CONTRACTOR");
        fail("Debería haber lanzado ForbiddenError");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).requiredRole).toBe("CONTRACTOR");
      }
    });
  });

  describe("requireAnyRole", () => {
    it("debe permitir acceso si el usuario tiene uno de los roles permitidos", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockContractor);

      const result = await requireAnyRole(["CONTRACTOR", "ADMIN"]);

      expect(result).toEqual(mockContractor);
    });

    it("debe permitir acceso a ADMIN cuando se permiten múltiples roles", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await requireAnyRole(["CONTRACTOR", "ADMIN"]);

      expect(result).toEqual(mockAdmin);
    });

    it("debe rechazar si el usuario no tiene ninguno de los roles permitidos", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      await expect(requireAnyRole(["CONTRACTOR", "ADMIN"])).rejects.toThrow(
        ForbiddenError
      );
      await expect(requireAnyRole(["CONTRACTOR", "ADMIN"])).rejects.toThrow(
        "Se requiere uno de los siguientes roles: CONTRACTOR, ADMIN"
      );
    });

    it("debe funcionar con un solo rol en el array", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockAdmin);

      const result = await requireAnyRole(["ADMIN"]);

      expect(result).toEqual(mockAdmin);
    });

    it("debe rechazar si el rol no está en el array de un solo elemento", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      await expect(requireAnyRole(["ADMIN"])).rejects.toThrow(ForbiddenError);
    });

    it("debe funcionar con los tres roles permitidos", async () => {
      (requireAuth as jest.Mock).mockResolvedValue(mockClient);

      const result = await requireAnyRole(["CLIENT", "CONTRACTOR", "ADMIN"]);

      expect(result).toEqual(mockClient);
    });
  });
});
