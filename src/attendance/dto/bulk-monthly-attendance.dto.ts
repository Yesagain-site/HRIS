import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for bulk monthly attendance upload
 * Format: Staff ID, Name, Month, Absence, Late Hours, OT Hours
 */
export class BulkMonthlyAttendanceDto {
  @IsString()
  @IsNotEmpty()
  staffId: string; // Employee staff ID

  @IsString()
  @IsNotEmpty()
  name: string; // Employee name (for verification)

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number; // Month (1-12)

  @IsNumber()
  @Min(0)
  absences: number; // Number of absence days

  @IsNumber()
  @Min(0)
  lateHours: number; // Total late hours for the month

  @IsNumber()
  @Min(0)
  overtimeHours: number; // Total overtime hours for the month

  @IsNumber()
  @IsOptional()
  year?: number; // Year (optional, defaults to current year)
}