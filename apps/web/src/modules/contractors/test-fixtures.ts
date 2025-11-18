import type { ContractorProfileDTO, PublicContractorProfileDTO } from './types';
import type { UserProfile } from '@/modules/users/types';

/**
 * Fixtures para tests del módulo de contratistas
 */

export const mockContractorUser: UserProfile = {
  id: 'user-contractor-123',
  clerkUserId: 'clerk_contractor_abc123',
  email: 'juan.garcia@example.com',
  firstName: 'Juan',
  lastName: 'García',
  phone: '5551234567',
  avatarUrl: 'https://example.com/juan-avatar.jpg',
  role: 'CONTRACTOR',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  addresses: [],
};

export const mockClientUser: UserProfile = {
  id: 'user-client-456',
  clerkUserId: 'clerk_client_xyz789',
  email: 'maria.lopez@example.com',
  firstName: 'María',
  lastName: 'López',
  phone: '5559876543',
  avatarUrl: null,
  role: 'CLIENT',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  addresses: [],
};

export const mockAdminUser: UserProfile = {
  id: 'user-admin-789',
  clerkUserId: 'clerk_admin_def456',
  email: 'admin@reparaya.com',
  firstName: 'Admin',
  lastName: 'Sistema',
  phone: '5551111111',
  avatarUrl: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  addresses: [],
};

export const mockContractorProfile: ContractorProfileDTO = {
  id: 'contractor-profile-123',
  userId: 'user-contractor-123',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verified: false,
  verificationDocuments: {
    idDocument: 'https://storage.example.com/docs/id-123.pdf',
    certificate: 'https://storage.example.com/docs/cert-123.pdf',
  },
  stripeConnectAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockVerifiedContractorProfile: ContractorProfileDTO = {
  id: 'contractor-profile-verified-456',
  userId: 'user-contractor-456',
  businessName: 'Electricistas Profesionales SA',
  description: 'Electrical services for residential and commercial properties',
  specialties: ['electrical', 'lighting'],
  verified: true,
  verificationDocuments: {
    idDocument: 'https://storage.example.com/docs/id-456.pdf',
    businessLicense: 'https://storage.example.com/docs/license-456.pdf',
  },
  stripeConnectAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
};

export const mockPublicContractorProfile: PublicContractorProfileDTO = {
  id: 'contractor-profile-123',
  userId: 'user-contractor-123',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verified: false,
};

export const mockCreateContractorProfileInput = {
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verificationDocuments: {
    idDocument: 'https://storage.example.com/docs/id-123.pdf',
    certificate: 'https://storage.example.com/docs/cert-123.pdf',
  },
};

export const mockUpdateContractorProfileInput = {
  businessName: 'García Plumbing & Heating',
  description: 'Professional plumbing and heating services with over 10 years of experience',
  specialties: ['plumbing', 'heating', 'air-conditioning'],
};
