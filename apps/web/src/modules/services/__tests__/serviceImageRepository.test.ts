import { prisma } from '@/lib/db';
import { serviceImageRepository } from '../repositories/serviceImageRepository';
import { ServiceImageNotFoundError } from '../errors';
import { mockServiceImage1, mockServiceImage2 } from '../test-fixtures';
import type { ImageCreateInput } from '../types';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    serviceImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('serviceImageRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper para crear mock de imagen de Prisma
  const createPrismaImageMock = (image: typeof mockServiceImage1) => ({
    id: image.id,
    serviceId: image.serviceId,
    s3Url: image.s3Url,
    s3Key: image.s3Key,
    order: image.order,
    width: image.width ?? null,
    height: image.height ?? null,
    altText: image.altText ?? null,
    uploadedAt: image.uploadedAt,
  });

  describe('create', () => {
    it('TC-SERVICE-034: debe crear una imagen de servicio exitosamente', async () => {
      const imageInput: ImageCreateInput = {
        serviceId: 'service-draft-123',
        s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-1.jpg',
        s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-1.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        altText: 'Service image 1',
      };

      const prismaMock = createPrismaImageMock(mockServiceImage1);
      (prisma.serviceImage.create as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceImageRepository.create(imageInput);

      expect(result.id).toBe(mockServiceImage1.id);
      expect(result.s3Url).toBe(imageInput.s3Url);
      expect(result.s3Key).toBe(imageInput.s3Key);
      expect(result.order).toBe(0);
      expect(prisma.serviceImage.create).toHaveBeenCalledWith({
        data: {
          serviceId: imageInput.serviceId,
          s3Url: imageInput.s3Url,
          s3Key: imageInput.s3Key,
          order: imageInput.order,
          width: imageInput.width,
          height: imageInput.height,
          altText: imageInput.altText,
        },
      });
    });

    it('TC-SERVICE-034-02: debe crear imagen sin dimensiones opcionales', async () => {
      const imageInput: ImageCreateInput = {
        serviceId: 'service-draft-123',
        s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-1.jpg',
        s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-1.jpg',
        order: 0,
      };

      const prismaMock = createPrismaImageMock({
        ...mockServiceImage1,
        width: undefined,
        height: undefined,
        altText: undefined,
      });
      (prisma.serviceImage.create as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceImageRepository.create(imageInput);

      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result.altText).toBeUndefined();
    });
  });

  describe('findByServiceId', () => {
    it('TC-SERVICE-035: debe encontrar todas las imágenes de un servicio', async () => {
      const prismaMocks = [
        createPrismaImageMock(mockServiceImage1),
        createPrismaImageMock(mockServiceImage2),
      ];
      (prisma.serviceImage.findMany as jest.Mock).mockResolvedValue(prismaMocks);

      const result = await serviceImageRepository.findByServiceId('service-draft-123');

      expect(result).toHaveLength(2);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(prisma.serviceImage.findMany).toHaveBeenCalledWith({
        where: { serviceId: 'service-draft-123' },
        orderBy: { order: 'asc' },
      });
    });

    it('TC-SERVICE-035-02: debe retornar array vacío si no hay imágenes', async () => {
      (prisma.serviceImage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await serviceImageRepository.findByServiceId('service-no-images');

      expect(result).toEqual([]);
    });

    it('TC-SERVICE-035-03: debe ordenar imágenes por order ASC', async () => {
      const prismaMocks = [
        createPrismaImageMock(mockServiceImage2), // order: 1
        createPrismaImageMock(mockServiceImage1), // order: 0
      ];
      (prisma.serviceImage.findMany as jest.Mock).mockResolvedValue(prismaMocks);

      const result = await serviceImageRepository.findByServiceId('service-draft-123');

      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(0);
    });
  });

  describe('deleteById', () => {
    it('TC-SERVICE-036: debe eliminar imagen por ID', async () => {
      const prismaMock = createPrismaImageMock(mockServiceImage1);
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock);
      (prisma.serviceImage.delete as jest.Mock).mockResolvedValue(prismaMock);

      await serviceImageRepository.deleteById('image-1');

      expect(prisma.serviceImage.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('TC-SERVICE-036-02: debe lanzar error si la imagen no existe', async () => {
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(serviceImageRepository.deleteById('image-nonexistent')).rejects.toThrow(
        ServiceImageNotFoundError
      );

      expect(prisma.serviceImage.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateOrder', () => {
    it('TC-SERVICE-037: debe actualizar orden de imagen', async () => {
      const prismaMock = createPrismaImageMock(mockServiceImage1);
      const updatedPrismaMock = createPrismaImageMock({ ...mockServiceImage1, order: 5 });

      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock);
      (prisma.serviceImage.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceImageRepository.updateOrder('image-1', 5);

      expect(result.order).toBe(5);
      expect(prisma.serviceImage.update).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        data: { order: 5 },
      });
    });

    it('TC-SERVICE-037-02: debe lanzar error si la imagen no existe', async () => {
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(serviceImageRepository.updateOrder('image-nonexistent', 5)).rejects.toThrow(
        ServiceImageNotFoundError
      );

      expect(prisma.serviceImage.update).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-037-03: debe permitir actualizar a orden 0', async () => {
      const prismaMock = createPrismaImageMock(mockServiceImage2);
      const updatedPrismaMock = createPrismaImageMock({ ...mockServiceImage2, order: 0 });

      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock);
      (prisma.serviceImage.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceImageRepository.updateOrder('image-2', 0);

      expect(result.order).toBe(0);
    });
  });

  describe('updateAltText', () => {
    it('TC-SERVICE-038: debe actualizar texto alternativo de imagen', async () => {
      const prismaMock = createPrismaImageMock(mockServiceImage1);
      const updatedPrismaMock = createPrismaImageMock({
        ...mockServiceImage1,
        altText: 'Nueva descripción',
      });

      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock);
      (prisma.serviceImage.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceImageRepository.updateAltText('image-1', 'Nueva descripción');

      expect(result.altText).toBe('Nueva descripción');
      expect(prisma.serviceImage.update).toHaveBeenCalledWith({
        where: { id: 'image-1' },
        data: { altText: 'Nueva descripción' },
      });
    });

    it('TC-SERVICE-038-02: debe lanzar error si la imagen no existe', async () => {
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        serviceImageRepository.updateAltText('image-nonexistent', 'Nueva descripción')
      ).rejects.toThrow(ServiceImageNotFoundError);

      expect(prisma.serviceImage.update).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-038-03: debe permitir actualizar a texto vacío', async () => {
      const prismaMock = createPrismaImageMock(mockServiceImage1);
      const updatedPrismaMock = createPrismaImageMock({
        ...mockServiceImage1,
        altText: '',
      });

      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock);
      (prisma.serviceImage.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceImageRepository.updateAltText('image-1', '');

      expect(result.altText).toBe('');
    });
  });

  describe('integration scenarios', () => {
    it('TC-SERVICE-039: escenario completo - crear y gestionar imágenes de servicio', async () => {
      // 1. Crear primera imagen
      const image1Input: ImageCreateInput = {
        serviceId: 'service-draft-123',
        s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-1.jpg',
        s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-1.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        altText: 'Primera imagen',
      };

      const prismaMock1 = createPrismaImageMock(mockServiceImage1);
      (prisma.serviceImage.create as jest.Mock).mockResolvedValue(prismaMock1);

      const result1 = await serviceImageRepository.create(image1Input);
      expect(result1.order).toBe(0);

      // 2. Crear segunda imagen
      const image2Input: ImageCreateInput = {
        serviceId: 'service-draft-123',
        s3Url: 'https://s3.amazonaws.com/reparaya-dev/services/image-2.jpg',
        s3Key: 'contractor-services/contractor-verified-123/service-draft-123/image-2.jpg',
        order: 1,
        altText: 'Segunda imagen',
      };

      const prismaMock2 = createPrismaImageMock(mockServiceImage2);
      (prisma.serviceImage.create as jest.Mock).mockResolvedValue(prismaMock2);

      const result2 = await serviceImageRepository.create(image2Input);
      expect(result2.order).toBe(1);

      // 3. Listar imágenes
      (prisma.serviceImage.findMany as jest.Mock).mockResolvedValue([prismaMock1, prismaMock2]);

      const images = await serviceImageRepository.findByServiceId('service-draft-123');
      expect(images).toHaveLength(2);

      // 4. Actualizar orden
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock2);
      (prisma.serviceImage.update as jest.Mock).mockResolvedValue(
        createPrismaImageMock({ ...mockServiceImage2, order: 0 })
      );

      const reordered = await serviceImageRepository.updateOrder('image-2', 0);
      expect(reordered.order).toBe(0);

      // 5. Eliminar imagen
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(prismaMock1);
      (prisma.serviceImage.delete as jest.Mock).mockResolvedValue(prismaMock1);

      await serviceImageRepository.deleteById('image-1');
      expect(prisma.serviceImage.delete).toHaveBeenCalledWith({ where: { id: 'image-1' } });
    });
  });
});
