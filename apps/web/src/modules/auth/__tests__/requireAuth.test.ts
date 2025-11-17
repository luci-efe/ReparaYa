import { requireAuth } from "../utils/requireAuth";
import { getCurrentUser } from "../utils/getCurrentUser";
import { UnauthorizedError } from "../errors";

// Mock de getCurrentUser
jest.mock("../utils/getCurrentUser");

describe("requireAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe lanzar UnauthorizedError si no hay usuario", async () => {
    // Simular que no hay usuario autenticado
    (getCurrentUser as jest.Mock).mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
    await expect(requireAuth()).rejects.toThrow(
      "No estás autenticado. Por favor inicia sesión."
    );
  });

  it("debe retornar el usuario si está autenticado", async () => {
    const mockUser = {
      id: "uuid-123",
      clerkUserId: "user_clerk_123",
      email: "test@example.com",
      firstName: "Juan",
      lastName: "Pérez",
      phone: "1234567890",
      avatarUrl: "https://example.com/avatar.jpg",
      role: "CLIENT" as const,
      status: "ACTIVE" as const,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    (getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const result = await requireAuth();

    expect(result).toEqual(mockUser);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("debe retornar usuarios con rol CONTRACTOR", async () => {
    const mockContractor = {
      id: "uuid-456",
      clerkUserId: "user_clerk_456",
      email: "contractor@example.com",
      firstName: "María",
      lastName: "González",
      phone: null,
      avatarUrl: null,
      role: "CONTRACTOR" as const,
      status: "ACTIVE" as const,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    };

    (getCurrentUser as jest.Mock).mockResolvedValue(mockContractor);

    const result = await requireAuth();

    expect(result).toEqual(mockContractor);
  });

  it("debe retornar usuarios con rol ADMIN", async () => {
    const mockAdmin = {
      id: "uuid-789",
      clerkUserId: "user_clerk_789",
      email: "admin@reparaya.com",
      firstName: "Admin",
      lastName: "System",
      phone: "9999999999",
      avatarUrl: "https://example.com/admin.jpg",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    (getCurrentUser as jest.Mock).mockResolvedValue(mockAdmin);

    const result = await requireAuth();

    expect(result).toEqual(mockAdmin);
  });

  it("debe funcionar con usuarios bloqueados (status BLOCKED)", async () => {
    const mockBlockedUser = {
      id: "uuid-999",
      clerkUserId: "user_clerk_999",
      email: "blocked@example.com",
      firstName: "Blocked",
      lastName: "User",
      phone: null,
      avatarUrl: null,
      role: "CLIENT" as const,
      status: "BLOCKED" as const,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    (getCurrentUser as jest.Mock).mockResolvedValue(mockBlockedUser);

    const result = await requireAuth();

    // requireAuth NO valida status, solo autenticación
    // La validación de status debe hacerse en otra capa
    expect(result).toEqual(mockBlockedUser);
  });
});
