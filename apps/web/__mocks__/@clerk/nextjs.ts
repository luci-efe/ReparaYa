/**
 * Mock global de Clerk para tests de integración
 * Este mock intercepta todas las llamadas a @clerk/nextjs
 */

import React from 'react';

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

// Mock React components from Clerk
export const UserButton = jest.fn(({ afterSignOutUrl, appearance }: { afterSignOutUrl?: string; appearance?: object }) => {
  return React.createElement('div', {
    'data-testid': 'user-button',
    'data-after-sign-out-url': afterSignOutUrl,
    'data-appearance': JSON.stringify(appearance),
  });
});

export const SignIn = jest.fn(() => {
  return React.createElement('div', { 'data-testid': 'sign-in' });
});

export const SignUp = jest.fn(() => {
  return React.createElement('div', { 'data-testid': 'sign-up' });
});

export const ClerkProvider = jest.fn(({ children }: { children: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
});
