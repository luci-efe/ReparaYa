import type { ServiceDTO, ServiceImageDTO, CreateServiceDTO, UpdateServiceDTO } from './types';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

/**
 * Fixtures para tests del módulo de servicios
 */

// Mock contractor profiles
export const mockVerifiedContractor: ContractorProfileDTO = {
  id: 'contractor-verified-123',
  userId: 'user-contractor-123',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verified: true,
  verificationDocuments: null,
  stripeConnectAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockUnverifiedContractor: ContractorProfileDTO = {
  id: 'contractor-unverified-456',
  userId: 'user-contractor-456',
  businessName: 'Electricistas Profesionales',
  description: 'Electrical services for residential properties',
  specialties: ['electrical'],
  verified: false,
  verificationDocuments: null,
  stripeConnectAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Mock service images
export const mockServiceImage1: ServiceImageDTO = {
  id: 'image-1',
  serviceId: 'service-draft-123',
  s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-1.jpg',
  s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-1.jpg',
  order: 0,
  width: 1920,
  height: 1080,
  altText: 'Service image 1',
  uploadedAt: new Date('2024-01-10'),
};

export const mockServiceImage2: ServiceImageDTO = {
  id: 'image-2',
  serviceId: 'service-draft-123',
  s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-2.jpg',
  s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-2.jpg',
  order: 1,
  width: 1920,
  height: 1080,
  altText: 'Service image 2',
  uploadedAt: new Date('2024-01-10'),
};

// Mock services
export const mockServiceDraft: ServiceDTO = {
  id: 'service-draft-123',
  contractorId: 'contractor-verified-123',
  categoryId: 'category-plumbing-001',
  title: 'Reparación de tuberías residenciales',
  description: 'Servicio profesional de reparación de tuberías para casas y departamentos. Incluye detección de fugas, cambio de tuberías y sellado.',
  basePrice: 500.00,
  currency: 'MXN',
  durationMinutes: 120,
  visibilityStatus: 'DRAFT',
  lastPublishedAt: null,
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-10'),
  category: {
    id: 'category-plumbing-001',
    name: 'Plomería',
    slug: 'plomeria',
    description: 'Servicios de plomería',
  },
  images: [mockServiceImage1, mockServiceImage2],
  contractor: {
    id: 'contractor-verified-123',
    businessName: 'García Plumbing',
    verified: true,
  },
};

export const mockServiceActive: ServiceDTO = {
  id: 'service-active-456',
  contractorId: 'contractor-verified-123',
  categoryId: 'category-plumbing-001',
  title: 'Instalación de calentadores de agua',
  description: 'Instalación profesional de calentadores de agua eléctricos y de gas. Incluye mano de obra, pruebas de funcionamiento y garantía de 6 meses.',
  basePrice: 1500.00,
  currency: 'MXN',
  durationMinutes: 180,
  visibilityStatus: 'ACTIVE',
  lastPublishedAt: new Date('2024-01-15'),
  createdAt: new Date('2024-01-12'),
  updatedAt: new Date('2024-01-15'),
  category: {
    id: 'category-plumbing-001',
    name: 'Plomería',
    slug: 'plomeria',
  },
  images: [mockServiceImage1],
  contractor: {
    id: 'contractor-verified-123',
    businessName: 'García Plumbing',
    verified: true,
  },
};

export const mockServicePaused: ServiceDTO = {
  id: 'service-paused-789',
  contractorId: 'contractor-verified-123',
  categoryId: 'category-plumbing-001',
  title: 'Limpieza de drenaje',
  description: 'Limpieza profesional de drenajes obstruidos usando equipo especializado. Servicio rápido y garantizado.',
  basePrice: 350.00,
  currency: 'MXN',
  durationMinutes: 90,
  visibilityStatus: 'PAUSED',
  lastPublishedAt: new Date('2024-01-10'),
  createdAt: new Date('2024-01-08'),
  updatedAt: new Date('2024-01-18'),
  category: {
    id: 'category-plumbing-001',
    name: 'Plomería',
    slug: 'plomeria',
  },
  images: [mockServiceImage1],
  contractor: {
    id: 'contractor-verified-123',
    businessName: 'García Plumbing',
    verified: true,
  },
};

export const mockServiceArchived: ServiceDTO = {
  id: 'service-archived-999',
  contractorId: 'contractor-verified-123',
  categoryId: 'category-plumbing-001',
  title: 'Servicio archivado',
  description: 'Este servicio ha sido archivado y no está disponible.',
  basePrice: 500.00,
  currency: 'MXN',
  durationMinutes: 120,
  visibilityStatus: 'ARCHIVED',
  lastPublishedAt: new Date('2024-01-10'),
  createdAt: new Date('2024-01-05'),
  updatedAt: new Date('2024-01-20'),
  category: {
    id: 'category-plumbing-001',
    name: 'Plomería',
    slug: 'plomeria',
  },
  images: [],
  contractor: {
    id: 'contractor-verified-123',
    businessName: 'García Plumbing',
    verified: true,
  },
};

export const mockServiceDraftNoImages: ServiceDTO = {
  id: 'service-draft-no-images-111',
  contractorId: 'contractor-unverified-456',
  categoryId: 'category-electrical-002',
  title: 'Instalación eléctrica básica',
  description: 'Instalación de circuitos eléctricos básicos para casas. Incluye cableado, contactos e interruptores.',
  basePrice: 800.00,
  currency: 'MXN',
  durationMinutes: 240,
  visibilityStatus: 'DRAFT',
  lastPublishedAt: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  category: {
    id: 'category-electrical-002',
    name: 'Electricidad',
    slug: 'electricidad',
  },
  images: [],
  contractor: {
    id: 'contractor-unverified-456',
    businessName: 'Electricistas Profesionales',
    verified: false,
  },
};

// Input DTOs
export const mockCreateServiceInput: CreateServiceDTO = {
  categoryId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
  title: 'Reparación de tuberías residenciales',
  description: 'Servicio profesional de reparación de tuberías para casas y departamentos. Incluye detección de fugas, cambio de tuberías y sellado.',
  basePrice: 500.00,
  durationMinutes: 120,
};

export const mockUpdateServiceInput: UpdateServiceDTO = {
  title: 'Reparación de tuberías residenciales y comerciales',
  description: 'Servicio profesional de reparación de tuberías para casas, departamentos y pequeños negocios. Incluye detección de fugas, cambio de tuberías, sellado y garantía.',
  basePrice: 600.00,
  durationMinutes: 150,
};
