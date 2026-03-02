// dto/create-employee.dto.ts - COMPLETE FIX
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsEmail, 
  IsDateString,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  workStatus?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : 0)
  previousSalary?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : 0)
  baseSalary?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : 0)
  presentGrossSalary?: number;

  @IsArray()
  @IsOptional()
  @Type(() => Object)
  allowances?: any[];

  @IsString()
  @IsOptional()
  payrollCode?: string;

  @IsString()
  @IsOptional()
  payFrequency?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : 0)
  targetRate?: number;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  iban?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === false) return value;
    if (value === 'true' || value === 'yes' || value === '1') return true;
    return false;
  })
  isTaxable?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === false) return value;
    if (value === 'true' || value === 'yes' || value === '1') return true;
    return false;
  })
  isOvertimeEligible?: boolean;

  @IsString()
  @IsOptional()
  passportNo?: string;

  @IsDateString()
  @IsOptional()
  passportExp?: string;

  @IsString()
  @IsOptional()
  visaStatus?: string;

  @IsDateString()
  @IsOptional()
  visaStartDate?: string;

  @IsDateString()
  @IsOptional()
  visaExpDate?: string;

  @IsString()
  @IsOptional()
  eidNumber?: string;

  @IsDateString()
  @IsOptional()
  eidIssueDate?: string;

  @IsDateString()
  @IsOptional()
  eidExpDate?: string;

  @IsArray()
  @IsOptional()
  @Type(() => Object)
  documents?: any[];

  @IsOptional()
  @Type(() => Object)
  emergencyContact?: any;

  @IsOptional()
  @Type(() => Object)
  leaveBalances?: any;

  @IsOptional()
  @Type(() => Object)
  customFieldValues?: any;
}

// import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail, IsDateString, IsArray, IsObject, IsBoolean } from 'class-validator';

// export class CreateEmployeeDto {
//   @IsNotEmpty()
//   @IsString()
//   staffId: string;

//   @IsNotEmpty()
//   @IsString()
//   firstName: string;

//   @IsOptional()
//   @IsString()
//   middleName?: string;

//   @IsNotEmpty()
//   @IsString()
//   lastName: string;

//   @IsNotEmpty()
//   @IsEmail()
//   email: string;

//   @IsNotEmpty()
//   @IsString()
//   phone: string;

//   @IsOptional()
//   @IsString()
//   gender?: string;

//   @IsOptional()
//   @IsDateString()
//   dob?: string;

//   @IsOptional()
//   @IsString()
//   nationality?: string;

//   @IsOptional()
//   @IsString()
//   maritalStatus?: string;

//   @IsOptional()
//   @IsString()
//   address?: string;

//   @IsNotEmpty()
//   @IsString()
//   workStatus: string;

//   @IsNotEmpty()
//   @IsDateString()
//   joiningDate: string;

//   @IsNotEmpty()
//   @IsString()
//   designation: string;

//   @IsNotEmpty()
//   @IsString()
//   department: string;

//   @IsOptional()
//   @IsString()
//   reportingManagerId?: string;

//   @IsOptional()
//   @IsString()
//   remarks?: string;
//  @IsOptional()
//   @IsNumber()
//   previousSalary?: number;

//   @IsNotEmpty()
//   @IsNumber()
//   baseSalary: number;

//   @IsNotEmpty()
//   @IsNumber()
//   presentGrossSalary: number;

//   @IsOptional()
//   @IsArray()
//   allowances?: any[];

//   @IsOptional()
//   @IsString()
//   payrollCode?: string;

//   @IsOptional()
//   @IsString()
//   payFrequency?: string;

//   @IsOptional()
//   @IsNumber()
//   targetRate?: number;

//   @IsOptional()
//   @IsString()
//   bankName?: string;

//   @IsOptional()
//   @IsString()
//   iban?: string;

//   @IsOptional()
//   @IsBoolean()
//   isTaxable?: boolean;

//   @IsOptional()
//   @IsBoolean()
//   isOvertimeEligible?: boolean;

//   @IsOptional()
//   @IsString()
//   passportNo?: string;

//   @IsOptional()
//   @IsDateString()
//   passportExp?: string;

//   @IsOptional()
//   @IsString()
//   visaStatus?: string;

//   @IsOptional()
//   @IsDateString()
//   visaStartDate?: string;

//   @IsOptional()
//   @IsDateString()
//   visaExpDate?: string;

//   @IsOptional()
//   @IsString()
//   eidNumber?: string;

//   @IsOptional()
//   @IsDateString()
//   eidIssueDate?: string;

//   @IsOptional()
//   @IsDateString()
//   eidExpDate?: string;

//   @IsOptional()
//   @IsArray()
//   documents?: any[];

//   @IsOptional()
//   @IsObject()
//   emergencyContact?: any;

//   @IsOptional()
//   @IsArray()
//   leaveBalances?: any[];

//   @IsOptional()
//   @IsObject()
//   customFieldValues?: Record<string, any>;

//   @IsOptional()
//   @IsString()
//   createdBy?: string;
// }