/**
 * Block Repository (Prisma)
 * CRUD operations for contractor availability blocks
 */

import { prisma } from '@/lib/db';
import { CreateBlockDTO, UpdateBlockDTO, BlockResponseDTO } from '../types';

/**
 * Maps Prisma block record to BlockResponseDTO
 */
function mapToBlockResponse(record: {
  id: string;
  contractorProfileId: string;
  startDateTime: Date;
  endDateTime: Date;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BlockResponseDTO {
  return {
    id: record.id,
    contractorProfileId: record.contractorProfileId,
    startDateTime: record.startDateTime.toISOString(),
    endDateTime: record.endDateTime.toISOString(),
    reason: record.reason ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const blockRepository = {
  /**
   * Create a new block
   */
  async create(contractorProfileId: string, data: CreateBlockDTO): Promise<BlockResponseDTO> {
    const record = await prisma.contractorAvailabilityBlock.create({
      data: {
        contractorProfileId,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
        reason: data.reason,
      },
    });
    return mapToBlockResponse(record);
  },

  /**
   * Find block by ID
   */
  async findById(id: string): Promise<BlockResponseDTO | null> {
    const record = await prisma.contractorAvailabilityBlock.findUnique({
      where: { id },
    });
    return record ? mapToBlockResponse(record) : null;
  },

  /**
   * Find blocks by contractor and date range (with overlap detection)
   */
  async findByDateRange(
    contractorProfileId: string,
    startDateTime: Date,
    endDateTime: Date
  ): Promise<BlockResponseDTO[]> {
    const records = await prisma.contractorAvailabilityBlock.findMany({
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
    });
    return records.map(mapToBlockResponse);
  },

  /**
   * Update a block
   */
  async update(id: string, data: UpdateBlockDTO): Promise<BlockResponseDTO> {
    const record = await prisma.contractorAvailabilityBlock.update({
      where: { id },
      data: {
        ...(data.startDateTime !== undefined && { startDateTime: new Date(data.startDateTime) }),
        ...(data.endDateTime !== undefined && { endDateTime: new Date(data.endDateTime) }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });
    return mapToBlockResponse(record);
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
