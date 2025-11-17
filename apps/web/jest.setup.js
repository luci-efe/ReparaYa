import '@testing-library/jest-dom'

// Mock de variables de entorno de Clerk para tests
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing'
process.env.CLERK_SECRET_KEY = 'sk_test_mock_secret_key_for_testing'
