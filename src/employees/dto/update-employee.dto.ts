// dto/update-employee.dto.ts - WITH VALIDATION DECORATORS
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsObject } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  workStatus?: string;

  @IsOptional()
  @IsString()
  joiningDate?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  reportingManagerId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber()
  previousSalary?: number;

  @IsOptional()
  @IsNumber()
  baseSalary?: number;

  @IsOptional()
  @IsNumber()
  presentGrossSalary?: number;

  @IsOptional()
  @IsArray()
  allowances?: any[];

  @IsOptional()
  @IsString()
  payrollCode?: string;

  @IsOptional()
  @IsString()
  payFrequency?: string;

  @IsOptional()
  @IsNumber()
  targetRate?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @IsOptional()
  @IsBoolean()
  isOvertimeEligible?: boolean;

  @IsOptional()
  @IsString()
  passportNo?: string;

  @IsOptional()
  @IsString()
  passportExp?: string;

  @IsOptional()
  @IsString()
  visaStatus?: string;

  @IsOptional()
  @IsString()
  visaStartDate?: string;

  @IsOptional()
  @IsString()
  visaExpDate?: string;

  @IsOptional()
  @IsString()
  eidNumber?: string;

  @IsOptional()
  @IsString()
  eidIssueDate?: string;

  @IsOptional()
  @IsString()
  eidExpDate?: string;

  @IsOptional()
  @IsArray()
  documents?: any[];

  @IsOptional()
  @IsObject()
  emergencyContact?: any;

  @IsOptional()
  @IsObject()
  leaveBalances?: any;

  @IsOptional()
  @IsObject()
  customFieldValues?: any;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}