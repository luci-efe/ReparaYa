/**
 * Blockout types for manual time slot blocking
 * @module contractors/availability/types/blockout
 */

/**
 * DTO for creating a manual blockout
 */
export interface CreateBlockoutDTO {
  /** Date for the blockout (ISO 8601 date string) */
  date: string;
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Optional reason for the blockout */
  reason?: string;
}

/**
 * Response DTO for blockout
 */
export interface BlockoutResponseDTO {
  /** Blockout ID */
  id: string;
  /** Contractor profile ID */
  contractorProfileId: string;
  /** Date of the blockout */
  date: string; // ISO 8601
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Reason for the blockout */
  reason: string | null;
  /** Creation timestamp */
  createdAt: string; // ISO 8601
  /** Last update timestamp */
  updatedAt: string; // ISO 8601
}

/**
 * Filters for listing blockouts
 */
export interface BlockoutListFilters {
  /** Start date for filtering */
  startDate?: string; // ISO 8601
  /** End date for filtering */
  endDate?: string; // ISO 8601
}

/**
 * Internal blockout entity (from database)
 */
export interface BlockoutEntity {
  id: string;
  contractorProfileId: string;
  date: Date;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
