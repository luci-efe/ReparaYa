/**
 * Availability Service (Business Logic)
 * Handles CRUD operations with validation, ownership verification, and authorization
 */

import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import {
  CreateWeeklyRuleDTO,
  UpdateWeeklyRuleDTO,
  WeeklyRuleResponseDTO,
  CreateExceptionDTO,
  UpdateExceptionDTO,
  ExceptionResponseDTO,
  CreateBlockDTO,
  BlockResponseDTO,
} from '../types';
import { weeklyRuleRepository } from '../repositories/weeklyRuleRepository';
import { exceptionRepository } from '../repositories/exceptionRepository';
import { blockRepository } from '../repositories/blockRepository';
import { createWeeklyRuleSchema, updateWeeklyRuleSchema } from '../validators/weeklyRule';
import { createExceptionSchema, updateExceptionSchema } from '../validators/exception';
import { createBlockSchema } from '../validators/block';

/**
 * Custom errors
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BookingConflictError extends Error {
  constructor(message: string, public bookingIds?: string[]) {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export const availabilityService = {
  // ========== Weekly Rules ==========

  /**
   * Create a new weekend rule
   */
  async createWeeklyRule(
    clerkUserId: string,
    contractorProfileId: string,
    data: CreateWeeklyRuleDTO
  ): Promise<WeeklyRuleResponseDTO> {
    // 1. Validate input
    const validated = createWeeklyRuleSchema.parse(data);

    // 2. Verify ownership using Clerk ID
    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para modificar esta disponibilidad');
    }

    // 3. Create rule
    return weeklyRuleRepository.create(contractorProfileId, validated);
  },

  /**
   * List all weekly rules for a contractor
   */
  async listWeeklyRules(contractorProfileId: string): Promise<WeeklyRuleResponseDTO[]> {
    return weeklyRuleRepository.findByContractor(contractorProfileId);
  },

  /**
   * Update a weekly rule
   */
  async updateWeeklyRule(
    clerkUserId: string,
    ruleId: string,
    data: UpdateWeeklyRuleDTO
  ): Promise<WeeklyRuleResponseDTO> {
    // 1. Validate input
    const validated = updateWeeklyRuleSchema.parse(data);

    // 2. Get rule and verify ownership
    const rule = await weeklyRuleRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundError('Regla no encontrada');
    }

    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== rule.contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para modificar esta regla');
    }

    // 3. Update rule
    return weeklyRuleRepository.update(ruleId, validated);
  },

  /**
   * Delete a weekly rule
   */
  async deleteWeeklyRule(clerkUserId: string, ruleId: string): Promise<void> {
    // 1. Get rule and verify ownership
    const rule = await weeklyRuleRepository.findById(ruleId);
    if (!rule) {
      throw new NotFoundError('Regla no encontrada');
    }

    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== rule.contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para eliminar esta regla');
    }

    // 2. Delete rule
    await weeklyRuleRepository.delete(ruleId);
  },

  // ========== Exceptions ==========

  /**
   * Create a new exception
   */
  async createException(
    clerkUserId: string,
    contractorProfileId: string,
    data: CreateExceptionDTO
  ): Promise<ExceptionResponseDTO> {
    // 1. Validate input
    const validated = createExceptionSchema.parse(data);

    // 2. Verify ownership using Clerk ID
    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);

    if (!profile || profile.id !== contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para modificar esta disponibilidad');
    }

    // 3. Create exception
    return exceptionRepository.create(contractorProfileId, validated);
  },

  /**
   * List exceptions by date range
   */
  async listExceptions(
    contractorProfileId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ExceptionResponseDTO[]> {
    if (startDate && endDate) {
      return exceptionRepository.findByDateRange(contractorProfileId, startDate, endDate);
    }

    // If no date range, get all (could be expensive - consider adding default range)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    return exceptionRepository.findByDateRange(
      contractorProfileId,
      oneYearAgo.toISOString().split('T')[0],
      oneYearAhead.toISOString().split('T')[0]
    );
  },

  /**
   * Update an exception
   */
  async updateException(
    clerkUserId: string,
    exceptionId: string,
    data: UpdateExceptionDTO
  ): Promise<ExceptionResponseDTO> {
    // 1. Validate input
    const validated = updateExceptionSchema.parse(data);

    // 2. Get exception and verify ownership
    const exception = await exceptionRepository.findById(exceptionId);
    if (!exception) {
      throw new NotFoundError('Excepción no encontrada');
    }

    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== exception.contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para modificar esta excepción');
    }

    // 3. Update exception
    return exceptionRepository.update(exceptionId, validated);
  },

  /**
   * Delete an exception
   */
  async deleteException(clerkUserId: string, exceptionId: string): Promise<void> {
    // 1. Get exception and verify ownership
    const exception = await exceptionRepository.findById(exceptionId);
    if (!exception) {
      throw new NotFoundError('Excepción no encontrada');
    }

    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== exception.contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para eliminar esta excepción');
    }

    // 2. Delete exception
    await exceptionRepository.delete(exceptionId);
  },

  // ========== Blocks ==========

  /**
   * Create a new block
   * NOTE: Must validate that there are no confirmed bookings in the time range
   */
  async createBlock(
    clerkUserId: string,
    contractorProfileId: string,
    data: CreateBlockDTO
  ): Promise<BlockResponseDTO> {
    // 1. Validate input
    const validated = createBlockSchema.parse(data);

    // 2. Verify ownership using Clerk ID
    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para crear bloqueos');
    }

    // 3. Check for confirmed bookings in range
    // TODO: Integrate with booking module when available
    // const confirmedBookings = await bookingService.getConfirmedBookingsByContractor(
    //   contractorProfileId,
    //   new Date(validated.startDateTime),
    //   new Date(validated.endDateTime)
    // );
    // if (confirmedBookings.length > 0) {
    //   throw new BookingConflictError(
    //     `No se puede crear bloqueo. Hay ${confirmedBookings.length} reserva(s) confirmada(s) en ese rango.`,
    //     confirmedBookings.map(b => b.id)
    //   );
    // }

    // 4. Create block
    return blockRepository.create(contractorProfileId, validated);
  },

  /**
   * List blocks by date range
   */
  async listBlocks(
    contractorProfileId: string,
    startDate?: string,
    endDate?: string
  ): Promise<BlockResponseDTO[]> {
    if (startDate && endDate) {
      return blockRepository.findByDateRange(
        contractorProfileId,
        new Date(startDate),
        new Date(endDate)
      );
    }

    // If no date range, get blocks from now to 1 year ahead
    const now = new Date();
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    return blockRepository.findByDateRange(contractorProfileId, now, oneYearAhead);
  },

  /**
   * Delete a block
   */
  async deleteBlock(clerkUserId: string, blockId: string): Promise<void> {
    // 1. Get block and verify ownership
    const block = await blockRepository.findById(blockId);
    if (!block) {
      throw new NotFoundError('Bloqueo no encontrado');
    }

    const profile = await contractorProfileRepository.findByClerkId(clerkUserId);
    if (!profile || profile.id !== block.contractorProfileId) {
      throw new UnauthorizedError('No estás autorizado para eliminar este bloqueo');
    }

    // 2. Delete block
    await blockRepository.delete(blockId);
  },

  // ========== Helpers ==========

  /**
   * Check if a contractor is available at a specific date/time
   * Used by booking module to validate reservations
   */
  async isAvailableOnDateTime(
    _contractorId: string,
    _date: string,
    _startTime: string,
    _endTime: string
  ): Promise<boolean> {
    // TODO: Implement using slot generator
    // This would generate slots for the specific date and check if the requested time fits
    throw new Error('Not implemented: availabilityService.isAvailableOnDateTime');
  },
};
