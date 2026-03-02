// dto/create-employee.dto.ts - NO VALIDATION VERSION
export class CreateEmployeeDto {
  staffId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  nationality?: string;
  maritalStatus?: string;
  address?: string;
  workStatus?: string;
  joiningDate?: string;
  designation?: string;
  department?: string;
  reportingManagerId?: string;
  remarks?: string;
  previousSalary?: number;
  baseSalary?: number;
  presentGrossSalary?: number;
  allowances?: any[];
  payrollCode?: string;
  payFrequency?: string;
  targetRate?: number;
  bankName?: string;
  iban?: string;
  isTaxable?: boolean;
  isOvertimeEligible?: boolean;
  passportNo?: string;
  passportExp?: string;
  visaStatus?: string;
  visaStartDate?: string;
  visaExpDate?: string;
  eidNumber?: string;
  eidIssueDate?: string;
  eidExpDate?: string;
  documents?: any[];
  emergencyContact?: any;
  leaveBalances?: any;
  customFieldValues?: any;
}

// // dto/create-employee.dto.ts - COMPLETE FIX
// import { 
//   IsString, 
//   IsOptional, 
//   IsNumber, 
//   IsBoolean, 
//   IsEmail, 
//   IsDateString,
//   ValidateNested,
//   IsArray
// } from 'class-validator';
// import { Transform, Type } from 'class-transformer';

// export class CreateEmployeeDto {
//   @IsString()
//   @IsOptional()
//   staffId?: string;

//   @IsString()
//   @IsOptional()
//   firstName?: string;

//   @IsString()
//   @IsOptional()
//   middleName?: string;

//   @IsString()
//   @IsOptional()
//   lastName?: string;

//   @IsEmail()
//   @IsOptional()
//   @Transform(({ value }) => value || undefined)
//   email?: string;

//   @IsString()
//   @IsOptional()
//   phone?: string;

//   @IsString()
//   @IsOptional()
//   gender?: string;

//   @IsDateString()
//   @IsOptional()
//   dob?: string;

//   @IsString()
//   @IsOptional()
//   nationality?: string;

//   @IsString()
//   @IsOptional()
//   maritalStatus?: string;

//   @IsString()
//   @IsOptional()
//   address?: string;

//   @IsString()
//   @IsOptional()
//   workStatus?: string;

//   @IsDateString()
//   @IsOptional()
//   joiningDate?: string;

//   @IsString()
//   @IsOptional()
//   designation?: string;

//   @IsString()
//   @IsOptional()
//   department?: string;

//   @IsString()
//   @IsOptional()
//   reportingManagerId?: string;

//   @IsString()
//   @IsOptional()
//   remarks?: string;

//   @IsNumber()
//   @IsOptional()
//   @Transform(({ value }) => value ? Number(value) : 0)
//   previousSalary?: number;

//   @IsNumber()
//   @IsOptional()
//   @Transform(({ value }) => value ? Number(value) : 0)
//   baseSalary?: number;

//   @IsNumber()
//   @IsOptional()
//   @Transform(({ value }) => value ? Number(value) : 0)
//   presentGrossSalary?: number;

//   @IsArray()
//   @IsOptional()
//   @Type(() => Object)
//   allowances?: any[];

//   @IsString()
//   @IsOptional()
//   payrollCode?: string;

//   @IsString()
//   @IsOptional()
//   payFrequency?: string;

//   @IsNumber()
//   @IsOptional()
//   @Transform(({ value }) => value ? Number(value) : 0)
//   targetRate?: number;

//   @IsString()
//   @IsOptional()
//   bankName?: string;

//   @IsString()
//   @IsOptional()
//   iban?: string;

//   @IsBoolean()
//   @IsOptional()
//   @Transform(({ value }) => {
//     if (value === true || value === false) return value;
//     if (value === 'true' || value === 'yes' || value === '1') return true;
//     return false;
//   })
//   isTaxable?: boolean;

//   @IsBoolean()
//   @IsOptional()
//   @Transform(({ value }) => {
//     if (value === true || value === false) return value;
//     if (value === 'true' || value === 'yes' || value === '1') return true;
//     return false;
//   })
//   isOvertimeEligible?: boolean;

//   @IsString()
//   @IsOptional()
//   passportNo?: string;

//   @IsDateString()
//   @IsOptional()
//   passportExp?: string;

//   @IsString()
//   @IsOptional()
//   visaStatus?: string;

//   @IsDateString()
//   @IsOptional()
//   visaStartDate?: string;

//   @IsDateString()
//   @IsOptional()
//   visaExpDate?: string;

//   @IsString()
//   @IsOptional()
//   eidNumber?: string;

//   @IsDateString()
//   @IsOptional()
//   eidIssueDate?: string;

//   @IsDateString()
//   @IsOptional()
//   eidExpDate?: string;

//   @IsArray()
//   @IsOptional()
//   @Type(() => Object)
//   documents?: any[];

//   @IsOptional()
//   @Type(() => Object)
//   emergencyContact?: any;

//   @IsOptional()
//   @Type(() => Object)
//   leaveBalances?: any;

//   @IsOptional()
//   @Type(() => Object)
//   customFieldValues?: any;
// }