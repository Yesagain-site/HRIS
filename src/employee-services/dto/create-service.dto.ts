import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn } from 'class-validator';
import { isNullOrUndefined } from 'util';

export class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  employeeName: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['leave', 'permission', 'cash', 'resignation'])
  requestType: string;

  // Leave fields
  @IsString()
  @IsOptional()
  @IsIn(['Annual', 'Sick', 'Emergency'])
  leaveType?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  // Permission fields
  @IsString()
  @IsOptional()
  permissionDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  // Cash advance fields
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  repaymentDate?: string;

  // Resignation fields
  @IsString()
  @IsOptional()
  proposedLastDay?: string;

  // Common
  @IsString()
  @IsOptional()
  reason?: string;
} 
