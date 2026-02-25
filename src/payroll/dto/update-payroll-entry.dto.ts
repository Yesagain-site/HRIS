import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class UpdatePayrollEntryDto {
  @IsOptional()
  @IsNumber()
  offDaysWorked?: number;

  @IsOptional()
  @IsNumber()
  holidayWorked?: number;

  @IsOptional()
  @IsNumber()
  leaveSalary?: number;

  @IsOptional()
  @IsNumber()
  cashAdvance?: number;

  @IsOptional()
  @IsNumber()
  penaltyPoints?: number;

  @IsOptional()
  @IsNumber()
  visaCost?: number;

  @IsOptional()
  @IsNumber()
  absences?: number;

  @IsOptional()
  @IsNumber()
  unauthorizedAbsences?: number;

  @IsOptional()
  @IsNumber()
  lateHours?: number;

  @IsOptional()
  @IsNumber()
  fines?: number;

  @IsOptional()
  @IsNumber()
  cleaningFees?: number;

  @IsOptional()
  @IsNumber()
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  extraFromManager?: number;

  @IsOptional()
  @IsNumber()
  backPayment?: number;

  @IsOptional()
  @IsNumber()
  finalModification?: number;

  @IsOptional()
  @IsString()
  hrNotes?: string;

  @IsOptional()
  @IsBoolean()
  isCalculated?: boolean;
}