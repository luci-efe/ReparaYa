/**
 * Availability Block Types & DTOs
 *
 * Represents manual one-off blocks of time.
 */

export interface CreateBlockDTO {
  startDateTime: string; // ISO8601 format
  endDateTime: string;   // ISO8601 format
  reason?: string;
}

export interface UpdateBlockDTO {
  startDateTime?: string;
  endDateTime?: string;
  reason?: string;
}

export interface BlockResponseDTO {
  id: string;
  contractorProfileId: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
