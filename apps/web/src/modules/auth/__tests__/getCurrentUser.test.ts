import { getCurrentUser } from "../utils/getCurrentUser";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Mock de Clerk auth
jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

// Mock de Prisma client
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("getCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debe retornar null si no hay sesión de Clerk", async () => {
    // Simular sesión sin userId
    (auth as jest.Mock).mockResolvedValue({ userId: null });

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("debe retornar null si el usuario no existe en la base de datos", async () => {
    // Simular sesión válida
    (auth as jest.Mock).mockResolvedValue({ userId: "user_clerk_123" });

    // Simular que el usuario no existe en DB
    (db.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: "user_clerk_123" },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("debe retornar el usuario si existe en la base de datos", async () => {
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

    // Simular sesión válida
    (auth as jest.Mock).mockResolvedValue({ userId: "user_clerk_123" });

    // Simular usuario existente en DB
    (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await getCurrentUser();

    expect(result).toEqual(mockUser);
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { clerkUserId: "user_clerk_123" },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("debe retornar null si hay un error inesperado", async () => {
    // Simular sesión válida
    (auth as jest.Mock).mockResolvedValue({ userId: "user_clerk_123" });

    // Simular error en base de datos
    (db.user.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    // Espiar console.error
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("debe funcionar con usuarios CONTRACTOR", async () => {
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

    (auth as jest.Mock).mockResolvedValue({ userId: "user_clerk_456" });
    (db.user.findUnique as jest.Mock).mockResolvedValue(mockContractor);

    const result = await getCurrentUser();

    expect(result).toEqual(mockContractor);
    expect(result?.role).toBe("CONTRACTOR");
  });

  it("debe funcionar con usuarios ADMIN", async () => {
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

    (auth as jest.Mock).mockResolvedValue({ userId: "user_clerk_789" });
    (db.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

    const result = await getCurrentUser();

    expect(result).toEqual(mockAdmin);
    expect(result?.role).toBe("ADMIN");
  });
});
