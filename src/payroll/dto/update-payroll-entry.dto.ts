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

   @IsOptional()
  @IsNumber()
  workedDays?: number;
  
  @IsOptional()
  @IsNumber()
  authAbsenceDeduction?: number;
  
  @IsOptional()
  @IsNumber()
  unauthAbsenceDeduction?: number;
  
  @IsOptional()
  @IsNumber()
  tardiness?: number;
  
  @IsOptional()
  @IsNumber()
  allDeductions?: number;
  
  @IsOptional()
  @IsNumber()
  overtimeAmount?: number;
  
  @IsOptional()
  @IsNumber()
  netDeductions?: number;
  
  @IsOptional()
  @IsNumber()
  januaryNetSalary?: number;
  
  @IsOptional()
  @IsNumber()
  totalJanuarySalary?: number;
  
  @IsOptional()
  @IsNumber()
  beforeOT?: number;
  
  @IsOptional()
  @IsNumber()
  ot?: number;
  
  @IsOptional()
  @IsNumber()
  totalCalculated?: number;
  
  @IsOptional()
  @IsNumber()
  dfrnce?: number;
  
  @IsOptional()
  @IsNumber()
  deductions?: number;
  
  @IsOptional()
  @IsNumber()
  inDays?: number;
  
  @IsOptional()
  @IsNumber()
  dailyRate?: number;
  
  @IsOptional()
  @IsNumber()
  hourlyRate?: number;
  
  @IsOptional()
  @IsNumber()
  offDayAmount?: number;
  
  @IsOptional()
  @IsNumber()
  holidayAmount?: number;
  
  @IsOptional()
  @IsNumber()
  total?: number;
}