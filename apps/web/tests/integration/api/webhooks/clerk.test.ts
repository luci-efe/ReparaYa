/**
 * @jest-environment node
 */

import { POST } from "../../../../app/api/webhooks/clerk/route";
import { db } from "@/lib/db";
import { Webhook } from "svix";
import { NextRequest } from "next/server";

// Mock de Prisma
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock de svix Webhook
jest.mock("svix", () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
}));

describe("POST /api/webhooks/clerk", () => {
  const MOCK_WEBHOOK_SECRET = "whsec_test_secret";
  const mockVerify = jest.fn();

  beforeAll(() => {
    process.env.CLERK_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({
      verify: mockVerify,
    }));
  });

  afterAll(() => {
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  const createMockRequest = (payload: any, headers: Record<string, string>) => {
    return {
      json: async () => payload,
      headers: new Headers(headers),
    } as unknown as NextRequest;
  };

  describe("Validación de seguridad", () => {
    it("debe retornar 500 si CLERK_WEBHOOK_SECRET no está configurado", async () => {
      const originalSecret = process.env.CLERK_WEBHOOK_SECRET;
      delete process.env.CLERK_WEBHOOK_SECRET;

      const req = createMockRequest({}, {});
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Webhook secret not configured");

      process.env.CLERK_WEBHOOK_SECRET = originalSecret;
    });

    it("debe retornar 400 si faltan headers svix", async () => {
      const req = createMockRequest({}, {});
      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing svix headers");
    });

    it("debe retornar 401 si la firma es inválida", async () => {
      mockVerify.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const req = createMockRequest(
        { type: "user.created", data: {} },
        {
          "svix-id": "msg_123",
          "svix-timestamp": "1234567890",
          "svix-signature": "invalid_signature",
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid signature");
    });
  });

  describe("user.created", () => {
    const mockUserCreatedEvent = {
      type: "user.created",
      data: {
        id: "user_clerk_123",
        email_addresses: [
          {
            id: "email_1",
            email_address: "test@example.com",
          },
        ],
        primary_email_address_id: "email_1",
        first_name: "Juan",
        last_name: "Pérez",
        image_url: "https://example.com/avatar.jpg",
      },
    };

    it("debe crear un usuario nuevo en la base de datos", async () => {
      mockVerify.mockReturnValue(mockUserCreatedEvent);

      const mockUser = {
        id: "uuid-123",
        clerkUserId: "user_clerk_123",
        email: "test@example.com",
        firstName: "Juan",
        lastName: "Pérez",
        avatarUrl: "https://example.com/avatar.jpg",
        role: "CLIENT",
        status: "ACTIVE",
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest(mockUserCreatedEvent, {
        "svix-id": "msg_123",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("user.created");

      expect(db.user.upsert).toHaveBeenCalledWith({
        where: { clerkUserId: "user_clerk_123" },
        update: {
          email: "test@example.com",
          firstName: "Juan",
          lastName: "Pérez",
          avatarUrl: "https://example.com/avatar.jpg",
        },
        create: {
          clerkUserId: "user_clerk_123",
          email: "test@example.com",
          firstName: "Juan",
          lastName: "Pérez",
          avatarUrl: "https://example.com/avatar.jpg",
          role: "CLIENT",
          status: "ACTIVE",
        },
      });
    });

    it("debe ser idempotente (múltiples llamadas no duplican)", async () => {
      mockVerify.mockReturnValue(mockUserCreatedEvent);

      const mockUser = {
        id: "uuid-123",
        clerkUserId: "user_clerk_123",
        email: "test@example.com",
        firstName: "Juan",
        lastName: "Pérez",
        role: "CLIENT",
        status: "ACTIVE",
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const req1 = createMockRequest(mockUserCreatedEvent, {
        "svix-id": "msg_123",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const req2 = createMockRequest(mockUserCreatedEvent, {
        "svix-id": "msg_124",
        "svix-timestamp": "1234567891",
        "svix-signature": "valid_signature_2",
      });

      const response1 = await POST(req1);
      const response2 = await POST(req2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(db.user.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("user.updated", () => {
    const mockUserUpdatedEvent = {
      type: "user.updated",
      data: {
        id: "user_clerk_123",
        email_addresses: [
          {
            id: "email_1",
            email_address: "newemail@example.com",
          },
        ],
        primary_email_address_id: "email_1",
        first_name: "Juan Carlos",
        last_name: "Pérez González",
        image_url: "https://example.com/new-avatar.jpg",
      },
    };

    it("debe actualizar un usuario existente", async () => {
      mockVerify.mockReturnValue(mockUserUpdatedEvent);

      const mockUser = {
        id: "uuid-123",
        clerkUserId: "user_clerk_123",
        email: "newemail@example.com",
        firstName: "Juan Carlos",
        lastName: "Pérez González",
        avatarUrl: "https://example.com/new-avatar.jpg",
        role: "CLIENT",
        status: "ACTIVE",
      };

      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest(mockUserUpdatedEvent, {
        "svix-id": "msg_456",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("user.updated");

      expect(db.user.upsert).toHaveBeenCalledWith({
        where: { clerkUserId: "user_clerk_123" },
        update: {
          email: "newemail@example.com",
          firstName: "Juan Carlos",
          lastName: "Pérez González",
          avatarUrl: "https://example.com/new-avatar.jpg",
        },
        create: expect.any(Object),
      });
    });
  });

  describe("user.deleted", () => {
    const mockUserDeletedEvent = {
      type: "user.deleted",
      data: {
        id: "user_clerk_123",
      },
    };

    it("debe hacer soft delete (status = BLOCKED)", async () => {
      mockVerify.mockReturnValue(mockUserDeletedEvent);

      const mockUser = {
        id: "uuid-123",
        clerkUserId: "user_clerk_123",
        status: "BLOCKED",
      };

      (db.user.update as jest.Mock).mockResolvedValue(mockUser);

      const req = createMockRequest(mockUserDeletedEvent, {
        "svix-id": "msg_789",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("user.deleted");

      expect(db.user.update).toHaveBeenCalledWith({
        where: { clerkUserId: "user_clerk_123" },
        data: {
          status: "BLOCKED",
        },
      });
    });
  });

  describe("Eventos no soportados", () => {
    it("debe ignorar eventos desconocidos sin error", async () => {
      const mockUnknownEvent = {
        type: "user.session.created",
        data: {},
      };

      mockVerify.mockReturnValue(mockUnknownEvent);

      const req = createMockRequest(mockUnknownEvent, {
        "svix-id": "msg_999",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("user.session.created");
    });
  });

  describe("Manejo de errores", () => {
    it("debe retornar 500 si hay error en la base de datos", async () => {
      const mockUserCreatedEvent = {
        type: "user.created",
        data: {
          id: "user_clerk_123",
          email_addresses: [
            { id: "email_1", email_address: "test@example.com" },
          ],
          primary_email_address_id: "email_1",
          first_name: "Test",
          last_name: "User",
        },
      };

      mockVerify.mockReturnValue(mockUserCreatedEvent);
      (db.user.upsert as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const req = createMockRequest(mockUserCreatedEvent, {
        "svix-id": "msg_error",
        "svix-timestamp": "1234567890",
        "svix-signature": "valid_signature",
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Error processing webhook");
    });
  });
});
