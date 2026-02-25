import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Matches,
} from 'class-validator';

export class UpdateAttendanceDto {
  @IsString()
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  outTime?: string; // HH:MM (UAE time, sent by frontend)

  @IsNumber()
  @IsOptional()
  workHours?: number;

  @IsNumber()
  @IsOptional()
  overtimeHours?: number;

  @IsNumber()
  @IsOptional()
  lateHours?: number;

  @IsBoolean()
  @IsOptional()
  isEarlyDeparture?: boolean;

  @IsNumber()
  @IsOptional()
  earlyDepartureMinutes?: number;

  @IsString()
  @IsOptional()
  status?: string; // 'Present', 'Late', 'Absent', 'On Leave', 'Early Departure'

  @IsString()
  @IsOptional()
  checkInMethod?: string;
}


// export class UpdateAttendanceDto {
//   outTime?: string;       // HH:MM (UAE time, sent by frontend)
//   workHours?: number;
//   overtimeHours?: number;
//   lateHours?: number;
//   isEarlyDeparture?: boolean;
//   earlyDepartureMinutes?: number;
//   status?: string;
// }