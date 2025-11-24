/**
 * Block Repository (Prisma)
 * CRUD operations for contractor availability blocks
 */

import { prisma } from '@/lib/db';
import { CreateBlockDTO, UpdateBlockDTO, BlockResponseDTO } from '../types';

export const blockRepository = {
  /**
   * Create a new block
   */
  async create(contractorProfileId: string, data: CreateBlockDTO): Promise<BlockResponseDTO> {
    return prisma.contractorAvailabilityBlock.create({
      data: {
        contractorProfileId,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
        reason: data.reason,
      },
    }) as unknown as BlockResponseDTO;
  },

  /**
   * Find block by ID
   */
  async findById(id: string): Promise<BlockResponseDTO | null> {
    return prisma.contractorAvailabilityBlock.findUnique({
      where: { id },
    }) as unknown as BlockResponseDTO | null;
  },

  /**
   * Find blocks by contractor and date range (with overlap detection)
   */
  async findByDateRange(
    contractorProfileId: string,
    startDateTime: Date,
    endDateTime: Date
  ): Promise<BlockResponseDTO[]> {
    return prisma.contractorAvailabilityBlock.findMany({
      where: {
        contractorProfileId,
        OR: [
          // Block starts within range
          { startDateTime: { gte: startDateTime, lte: endDateTime } },
          // Block ends within range
          { endDateTime: { gte: startDateTime, lte: endDateTime } },
          // Block completely contains range
          {
            AND: [
              { startDateTime: { lte: startDateTime } },
              { endDateTime: { gte: endDateTime } },
            ],
          },
        ],
      },
      orderBy: { startDateTime: 'asc' },
    }) as unknown as BlockResponseDTO[];
  },

  /**
   * Update a block
   */
  async update(id: string, data: UpdateBlockDTO): Promise<BlockResponseDTO> {
    return prisma.contractorAvailabilityBlock.update({
      where: { id },
      data: {
        ...(data.startDateTime && { startDateTime: new Date(data.startDateTime) }),
        ...(data.endDateTime && { endDateTime: new Date(data.endDateTime) }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    }) as unknown as BlockResponseDTO;
  },

  /**
   * Delete a block
   */
  async delete(id: string): Promise<void> {
    await prisma.contractorAvailabilityBlock.delete({
      where: { id },
    });
  },
};
