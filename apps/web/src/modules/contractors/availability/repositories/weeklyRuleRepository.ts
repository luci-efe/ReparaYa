/**
 * Weekly Rule Repository (Prisma)
 * CRUD operations for contractor weekly availability rules
 */

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { CreateWeeklyRuleDTO, UpdateWeeklyRuleDTO, WeeklyRuleResponseDTO } from '../types';

export const weeklyRuleRepository = {
  /**
   * Create a new weekly rule
   */
  async create(contractorProfileId: string, data: CreateWeeklyRuleDTO): Promise<WeeklyRuleResponseDTO> {
    return prisma.contractorWeeklyRule.create({
      data: {
        contractorProfileId,
        dayOfWeek: data.dayOfWeek,
        intervals: data.intervals as unknown as Prisma.InputJsonValue, // Prisma expects Json type
      },
    }) as unknown as WeeklyRuleResponseDTO;
  },

  /**
   * Find weekly rule by ID
   */
  async findById(id: string): Promise<WeeklyRuleResponseDTO | null> {
    return prisma.contractorWeeklyRule.findUnique({
      where: { id },
    }) as unknown as WeeklyRuleResponseDTO | null;
  },

  /**
   * Find all weekly rules for a contractor
   */
  async findByContractor(contractorProfileId: string): Promise<WeeklyRuleResponseDTO[]> {
    return prisma.contractorWeeklyRule.findMany({
      where: { contractorProfileId },
      orderBy: { dayOfWeek: 'asc' },
    }) as unknown as WeeklyRuleResponseDTO[];
  },

  /**
   * Update a weekly rule
   */
  async update(id: string, data: UpdateWeeklyRuleDTO): Promise<WeeklyRuleResponseDTO> {
    return prisma.contractorWeeklyRule.update({
      where: { id },
      data: {
        ...(data.intervals && { intervals: data.intervals as unknown as Prisma.InputJsonValue }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    }) as unknown as WeeklyRuleResponseDTO;
  },

  /**
   * Delete a weekly rule
   */
  async delete(id: string): Promise<void> {
    await prisma.contractorWeeklyRule.delete({
      where: { id },
    });
  },
};
