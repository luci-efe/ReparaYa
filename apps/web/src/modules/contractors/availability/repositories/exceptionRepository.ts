/**
 * Exception Repository (Prisma)
 *  CRUD operations for contractor availability exceptions
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { CreateExceptionDTO, UpdateExceptionDTO, ExceptionResponseDTO } from '../types';

export const exceptionRepository = {
  /**
   * Create a new exception
   */
  async create(contractorProfileId: string, data: CreateExceptionDTO): Promise<ExceptionResponseDTO> {
    return prisma.contractorAvailabilityException.create({
      data: {
        contractorProfileId,
        date: new Date(data.date),
        intervals: data.intervals as unknown as Prisma.InputJsonValue,
        type: data.type,
        reason: data.reason,
      },
    }) as unknown as ExceptionResponseDTO;
  },

  /**
   * Find exception by ID
   */
  async findById(id: string): Promise<ExceptionResponseDTO | null> {
    return prisma.contractorAvailabilityException.findUnique({
      where: { id },
    }) as unknown as ExceptionResponseDTO | null;
  },

  /**
   * Find exceptions by contractor and date range
   */
  async findByDateRange(
    contractorProfileId: string,
    startDate: string,
    endDate: string
  ): Promise<ExceptionResponseDTO[]> {
    return prisma.contractorAvailabilityException.findMany({
      where: {
        contractorProfileId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    }) as unknown as ExceptionResponseDTO[];
  },

  /**
   * Update an exception
   */
  async update(id: string, data: UpdateExceptionDTO): Promise<ExceptionResponseDTO> {
    return prisma.contractorAvailabilityException.update({
      where: { id },
      data: {
        ...(data.intervals && { intervals: data.intervals as unknown as Prisma.InputJsonValue }),
        ...(data.type && { type: data.type }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    }) as unknown as ExceptionResponseDTO;
  },

  /**
   * Delete an exception
   */
  async delete(id: string): Promise<void> {
    await prisma.contractorAvailabilityException.delete({
      where: { id },
    });
  },
};
