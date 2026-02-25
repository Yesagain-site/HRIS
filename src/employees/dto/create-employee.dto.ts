import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, IsDateString, IsArray, IsObject, IsBoolean } from 'class-validator';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  staffId: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
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

  @IsNotEmpty()
  @IsString()
  workStatus: string;

  @IsNotEmpty()
  @IsDateString()
  joiningDate: string;

  @IsNotEmpty()
  @IsString()
  designation: string;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsOptional()
  @IsString()
  reportingManagerId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
 @IsOptional()
  @IsNumber()
  previousSalary?: number;

  @IsNotEmpty()
  @IsNumber()
  baseSalary: number;

  @IsNotEmpty()
  @IsNumber()
  presentGrossSalary: number;

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
  @IsDateString()
  passportExp?: string;

  @IsOptional()
  @IsString()
  visaStatus?: string;

  @IsOptional()
  @IsDateString()
  visaStartDate?: string;

  @IsOptional()
  @IsDateString()
  visaExpDate?: string;

  @IsOptional()
  @IsString()
  eidNumber?: string;

  @IsOptional()
  @IsDateString()
  eidIssueDate?: string;

  @IsOptional()
  @IsDateString()
  eidExpDate?: string;

  @IsOptional()
  @IsArray()
  documents?: any[];

  @IsOptional()
  @IsObject()
  emergencyContact?: any;

  @IsOptional()
  @IsArray()
  leaveBalances?: any[];

  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  createdBy?: string;
}