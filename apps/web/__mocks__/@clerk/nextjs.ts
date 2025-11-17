/**
 * Mock global de Clerk para tests de integración
 * Este mock intercepta todas las llamadas a @clerk/nextjs
 */

export const auth = jest.fn(() => ({
  userId: 'user_clerk_123',
  sessionId: 'session-123',
}));

export const currentUser = jest.fn(() => ({
  id: 'user_clerk_123',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
}));

export const clerkClient = {
  users: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  },
};
