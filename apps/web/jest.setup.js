import '@testing-library/jest-dom'
import React from 'react'

// Mock de variables de entorno de Clerk para tests
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing'
process.env.CLERK_SECRET_KEY = 'sk_test_mock_secret_key_for_testing'

// Global mock for Clerk components
jest.mock('@clerk/nextjs', () => ({
  UserButton: function MockUserButton(props) {
    return React.createElement('div', { 'data-testid': 'user-button' }, 'UserButton')
  },
  useUser: jest.fn(() => ({ user: null, isLoaded: true })),
  useAuth: jest.fn(() => ({ isLoaded: true, userId: null })),
}))

// Global mock for Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }) {
    return React.createElement('a', { href, ...props }, children)
  }
})

// Global test configuration for timers
beforeEach(() => {
  // Use fake timers for tests that need time control
  // Tests that need real timers should call jest.useRealTimers()
})

afterEach(() => {
  // Clear all timers after each test to prevent leaks
  jest.clearAllTimers()
})
