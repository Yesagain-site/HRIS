import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CheckInLocationDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string; // YYYY-MM-DD  (sent by frontend in UAE timezone)

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  inTime?: string; // HH:MM (sent by frontend in UAE timezone)

  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  outTime?: string; // HH:MM (optional, for bulk imports)

  @IsString()
  @IsOptional()
  checkInMethod?: string; // 'Biometric', 'Manual', 'Mobile App', etc.

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => CheckInLocationDto)
  checkInLocation?: CheckInLocationDto;

  // ─── Optional overrides from frontend ────────────────────────────────────
  // The frontend can pass these, but the service will always re-calculate
  // them authoritatively on the backend to prevent tampering

  @IsString()
  @IsOptional()
  status?: string; // 'Present', 'Late', 'Absent', 'On Leave', 'Early Departure'

  @IsNumber()
  @IsOptional()
  lateMinutes?: number;

  @IsBoolean()
  @IsOptional()
  isLate?: boolean;

  @IsNumber()
  @IsOptional()
  workHours?: number;

  @IsNumber()
  @IsOptional()
  overtimeHours?: number;
}


// import { defineMetadata } from "reflect-metadata/no-conflict";

// export class CreateAttendanceDto {
//   employeeId: string;
//   date: string;        // YYYY-MM-DD  (sent by frontend in UAE timezone)
//   inTime?: string;     // HH:MM       (sent by frontend in UAE timezone)
//   outTime?: string;
//   checkInMethod?: string;
//   checkInLocation?: {
//     latitude: number;
//     longitude: number;
//   };

//   // ─── Optional overrides from frontend ────────────────────────────────────
//   // The frontend can pass these, but the service will always re-calculate.
//   // them authoritatively on the backend to prevent tampering
//   status?: string;
//   lateMinutes?: number;
//   isLate?: boolean;
// }
