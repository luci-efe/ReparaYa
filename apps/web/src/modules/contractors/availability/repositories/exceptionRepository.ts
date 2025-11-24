/**
 * Exception Repository (Prisma)
 *  CRUD operations for contractor availability exceptions
 */

import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import type { Prisma } from '@prisma/client';
import { CreateExceptionDTO, UpdateExceptionDTO, ExceptionResponseDTO, ExceptionType, TimeInterval } from '../types';

/**
 * Maps Prisma exception record to ExceptionResponseDTO
 */
function mapToExceptionResponse(record: {
  id: string;
  contractorProfileId: string;
  date: Date;
  intervals: Prisma.JsonValue;
  type: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ExceptionResponseDTO {
  return {
    id: record.id,
    contractorProfileId: record.contractorProfileId,
    date: format(record.date, 'yyyy-MM-dd'),
    intervals: record.intervals as unknown as TimeInterval[],
    type: record.type as ExceptionType,
    reason: record.reason ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const exceptionRepository = {
  /**
   * Create a new exception
   */
  async create(contractorProfileId: string, data: CreateExceptionDTO): Promise<ExceptionResponseDTO> {
    const record = await prisma.contractorAvailabilityException.create({
      data: {
        contractorProfileId,
        date: new Date(data.date),
        intervals: data.intervals as unknown as Prisma.InputJsonValue,
        type: data.type,
        reason: data.reason,
      },
    });
    return mapToExceptionResponse(record);
  },

  /**
   * Find exception by ID
   */
  async findById(id: string): Promise<ExceptionResponseDTO | null> {
    const record = await prisma.contractorAvailabilityException.findUnique({
      where: { id },
    });
    return record ? mapToExceptionResponse(record) : null;
  },

  /**
   * Find exceptions by contractor and date range
   */
  async findByDateRange(
    contractorProfileId: string,
    startDate: string,
    endDate: string
  ): Promise<ExceptionResponseDTO[]> {
    const records = await prisma.contractorAvailabilityException.findMany({
      where: {
        contractorProfileId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
    return records.map(mapToExceptionResponse);
  },

  /**
   * Update an exception
   */
  async update(id: string, data: UpdateExceptionDTO): Promise<ExceptionResponseDTO> {
    const record = await prisma.contractorAvailabilityException.update({
      where: { id },
      data: {
        ...(data.intervals !== undefined && { intervals: data.intervals as unknown as Prisma.InputJsonValue }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });
    return mapToExceptionResponse(record);
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
