// schemas/employee.schema.ts - CORRECTED VERSION
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true, 
  strict: false,
  validateBeforeSave: false,
  autoIndex: true,
  collection: 'employees',
  versionKey: false
  // ❌ Removed skipVersioning - this was causing the error
})
export class Employee extends Document {
  // Make ALL fields optional - use ? for all
  @Prop({ unique: true, sparse: true, required: false })
  staffId?: string;

  @Prop({ required: false })
  firstName?: string;

  @Prop({ required: false })
  middleName?: string;

  @Prop({ required: false })
  lastName?: string;

  @Prop({ required: false, unique: false })
  email?: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: false })
  photoUrl?: string;

  @Prop({ required: false })
  gender?: string;

  @Prop({ required: false })
  dob?: string;

  @Prop({ required: false })
  nationality?: string;

  @Prop({ required: false })
  maritalStatus?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  workStatus?: string;

  @Prop({ required: false })
  joiningDate?: string;

  @Prop({ required: false })
  designation?: string;

  @Prop({ required: false })
  department?: string;

  @Prop({ required: false })
  reportingManagerId?: string;

  @Prop({ required: false })
  remarks?: string;

  @Prop({ required: false })
  previousSalary?: number;

  @Prop({ required: false })
  baseSalary?: number;

  @Prop({ required: false })
  presentGrossSalary?: number;

  @Prop({ type: Object, default: [], required: false })
  allowances?: any;

  @Prop({ required: false })
  payrollCode?: string;

  @Prop({ required: false })
  payFrequency?: string;

  @Prop({ required: false })
  targetRate?: number;

  @Prop({ required: false })
  bankName?: string;

  @Prop({ required: false })
  iban?: string;

  @Prop({ default: false, required: false })
  isTaxable?: boolean;

  @Prop({ default: false, required: false })
  isOvertimeEligible?: boolean;

  @Prop({ required: false })
  passportNo?: string;

  @Prop({ required: false })
  passportExp?: string;

  @Prop({ required: false })
  visaStatus?: string;

  @Prop({ required: false })
  visaStartDate?: string;

  @Prop({ required: false })
  visaExpDate?: string;

  @Prop({ required: false })
  eidNumber?: string;

  @Prop({ required: false })
  eidIssueDate?: string;

  @Prop({ required: false })
  eidExpDate?: string;

  @Prop({ type: Object, default: [], required: false })
  documents?: any;

  @Prop({ type: Object, default: {}, required: false })
  emergencyContact?: any;

  @Prop({ type: Object, default: {}, required: false })
  leaveBalances?: any;

  @Prop({ type: Object, default: {}, required: false })
  customFieldValues?: any;

  @Prop({ required: false })
  createdBy?: string;

  @Prop({ required: false })
  updatedBy?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
export type EmployeeDocument = Employee & Document;

// // employee.schema.ts - SIMPLIFIED VERSION
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class Employee extends Document {
//   // Required fields only
//   @Prop({ required: true, unique: true })
//   staffId: string;

//   @Prop({ required: true })
//   firstName: string;

//   @Prop()
//   middleName?: string;

//   @Prop({ required: true })
//   lastName: string;

//   @Prop({ required: true, unique: true })
//   email: string;

//   @Prop({ required: true })
//   phone: string;

//   @Prop({ required: false })
//   photoUrl?: string;

//   @Prop({ default: 'Male' })
//   gender?: string;

//   @Prop()
//   dob?: string;

//   @Prop()
//   nationality?: string;

//   @Prop({ default: 'Single' })
//   maritalStatus?: string;

//   @Prop()
//   address?: string;

//   // Employment
//   @Prop({ required: true, default: 'Active' })
//   workStatus: string;

//   @Prop({ required: true })
//   joiningDate: string;

//   @Prop({ required: true })
//   designation: string;

//   @Prop({ required: true })
//   department: string;

//   @Prop()
//   reportingManagerId?: string;

//   @Prop()
//   remarks?: string;

//   // Salary
//   @Prop({ default: 0 })
//   previousSalary?: number;

//   @Prop({ required: true, default: 0 })
//   baseSalary: number;

//   @Prop({ required: true, default: 0 })
//   presentGrossSalary: number;

//   // Make ALL complex fields as optional with flexible types
//   @Prop({ type: Object, default: [] })
//   allowances?: any;

//   @Prop()
//   payrollCode?: string;

//   @Prop({ default: 'Monthly' })
//   payFrequency?: string;

//   @Prop({ default: 0 })
//   targetRate?: number;

//   @Prop()
//   bankName?: string;

//   @Prop()
//   iban?: string;

//   @Prop({ default: false })
//   isTaxable?: boolean;

//   @Prop({ default: false })
//   isOvertimeEligible?: boolean;

//   // Identity
//   @Prop()
//   passportNo?: string;

//   @Prop()
//   passportExp?: string;

//   @Prop({ default: 'Active' })
//   visaStatus?: string;

//   @Prop()
//   visaStartDate?: string;

//   @Prop()
//   visaExpDate?: string;

//   @Prop()
//   eidNumber?: string;

//   @Prop()
//   eidIssueDate?: string;

//   @Prop()
//   eidExpDate?: string;

//   // Flexible fields - accept ANY structure
//   @Prop({ type: Object, default: [] })
//   documents?: any;

//   @Prop({ type: Object, default: {} })
//   emergencyContact?: any;

//   @Prop({ type: Object, default: [] })
//   leaveBalances?: any;

//   @Prop({ type: Object, default: {} })
//   customFieldValues?: any;

//   // Audit
//   @Prop()
//   createdBy?: string;

//   @Prop()
//   updatedBy?: string;
// }

// export const EmployeeSchema = SchemaFactory.createForClass(Employee);
// export type EmployeeDocument = Employee & Document;