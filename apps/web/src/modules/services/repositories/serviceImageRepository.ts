import { prisma } from '@/lib/db';
import { ServiceImageNotFoundError } from '../errors';
import type { ServiceImageDTO, ImageCreateInput } from '../types';

/**
 * Repositorio para acceso a datos de imágenes de servicios
 */
export const serviceImageRepository = {
  /**
   * Crear una nueva imagen de servicio
   */
  async create(data: ImageCreateInput): Promise<ServiceImageDTO> {
    const image = await prisma.serviceImage.create({
      data: {
        serviceId: data.serviceId,
        s3Url: data.s3Url,
        s3Key: data.s3Key,
        order: data.order,
        width: data.width,
        height: data.height,
        altText: data.altText,
      },
    });

    return {
      id: image.id,
      serviceId: image.serviceId,
      s3Url: image.s3Url,
      s3Key: image.s3Key,
      order: image.order,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      altText: image.altText ?? undefined,
      uploadedAt: image.uploadedAt,
    };
  },

  /**
   * Buscar todas las imágenes de un servicio
   */
  async findByServiceId(serviceId: string): Promise<ServiceImageDTO[]> {
    const images = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: { order: 'asc' },
    });

    return images.map((image) => ({
      id: image.id,
      serviceId: image.serviceId,
      s3Url: image.s3Url,
      s3Key: image.s3Key,
      order: image.order,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      altText: image.altText ?? undefined,
      uploadedAt: image.uploadedAt,
    }));
  },

  /**
   * Eliminar imagen por ID
   */
  async deleteById(id: string): Promise<void> {
    // Validar existencia antes de eliminar
    const existingImage = await prisma.serviceImage.findUnique({
      where: { id },
    });

    if (!existingImage) {
      throw new ServiceImageNotFoundError(id);
    }

    await prisma.serviceImage.delete({
      where: { id },
    });
  },

  /**
   * Actualizar orden de una imagen
   */
  async updateOrder(id: string, order: number): Promise<ServiceImageDTO> {
    // Validar existencia antes de actualizar
    const existingImage = await prisma.serviceImage.findUnique({
      where: { id },
    });

    if (!existingImage) {
      throw new ServiceImageNotFoundError(id);
    }

    const image = await prisma.serviceImage.update({
      where: { id },
      data: { order },
    });

    return {
      id: image.id,
      serviceId: image.serviceId,
      s3Url: image.s3Url,
      s3Key: image.s3Key,
      order: image.order,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      altText: image.altText ?? undefined,
      uploadedAt: image.uploadedAt,
    };
  },

  /**
   * Actualizar texto alternativo de una imagen
   */
  async updateAltText(id: string, altText: string): Promise<ServiceImageDTO> {
    // Validar existencia antes de actualizar
    const existingImage = await prisma.serviceImage.findUnique({
      where: { id },
    });

    if (!existingImage) {
      throw new ServiceImageNotFoundError(id);
    }

    const image = await prisma.serviceImage.update({
      where: { id },
      data: { altText },
    });

    return {
      id: image.id,
      serviceId: image.serviceId,
      s3Url: image.s3Url,
      s3Key: image.s3Key,
      order: image.order,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      altText: image.altText ?? undefined,
      uploadedAt: image.uploadedAt,
    };
  },
};
