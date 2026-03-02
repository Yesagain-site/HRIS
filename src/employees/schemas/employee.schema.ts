// schemas/employee.schema.ts - COMPLETELY OPTIONAL VERSION
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true, 
  strict: false,  // Allow fields not defined in schema
  validateBeforeSave: false,  // Skip validation
  collection: 'employees',
  versionKey: false
})
export class Employee extends Document {
  // Make ALL fields optional with no validation
  @Prop({ sparse: true })
  staffId?: string;

  @Prop()
  firstName?: string;

  @Prop()
  middleName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  photoUrl?: string;

  @Prop()
  gender?: string;

  @Prop()
  dob?: string;

  @Prop()
  nationality?: string;

  @Prop()
  maritalStatus?: string;

  @Prop()
  address?: string;

  @Prop()
  workStatus?: string;

  @Prop()
  joiningDate?: string;

  @Prop()
  designation?: string;

  @Prop()
  department?: string;

  @Prop()
  reportingManagerId?: string;

  @Prop()
  remarks?: string;

  @Prop()
  previousSalary?: number;

  @Prop()
  baseSalary?: number;

  @Prop()
  presentGrossSalary?: number;

  @Prop({ type: Object })
  allowances?: any;

  @Prop()
  payrollCode?: string;

  @Prop()
  payFrequency?: string;

  @Prop()
  targetRate?: number;

  @Prop()
  bankName?: string;

  @Prop()
  iban?: string;

  @Prop()
  isTaxable?: boolean;

  @Prop()
  isOvertimeEligible?: boolean;

  @Prop()
  passportNo?: string;

  @Prop()
  passportExp?: string;

  @Prop()
  visaStatus?: string;

  @Prop()
  visaStartDate?: string;

  @Prop()
  visaExpDate?: string;

  @Prop()
  eidNumber?: string;

  @Prop()
  eidIssueDate?: string;

  @Prop()
  eidExpDate?: string;

  @Prop({ type: Object })
  documents?: any;

  @Prop({ type: Object })
  emergencyContact?: any;

  @Prop({ type: Object })
  leaveBalances?: any;

  @Prop({ type: Object })
  customFieldValues?: any;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
export type EmployeeDocument = Employee & Document;

// // schemas/employee.schema.ts - CORRECTED VERSION
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ 
//   timestamps: true, 
//   strict: false,
//   validateBeforeSave: false,
//   autoIndex: true,
//   collection: 'employees',
//   versionKey: false
//   // ❌ Removed skipVersioning - this was causing the error
// })
// export class Employee extends Document {
//   // Make ALL fields optional - use ? for all
//   @Prop({ unique: true, sparse: true, required: false })
//   staffId?: string;

//   @Prop({ required: false })
//   firstName?: string;

//   @Prop({ required: false })
//   middleName?: string;

//   @Prop({ required: false })
//   lastName?: string;

//   @Prop({ required: false, unique: false })
//   email?: string;

//   @Prop({ required: false })
//   phone?: string;

//   @Prop({ required: false })
//   photoUrl?: string;

//   @Prop({ required: false })
//   gender?: string;

//   @Prop({ required: false })
//   dob?: string;

//   @Prop({ required: false })
//   nationality?: string;

//   @Prop({ required: false })
//   maritalStatus?: string;

//   @Prop({ required: false })
//   address?: string;

//   @Prop({ required: false })
//   workStatus?: string;

//   @Prop({ required: false })
//   joiningDate?: string;

//   @Prop({ required: false })
//   designation?: string;

//   @Prop({ required: false })
//   department?: string;

//   @Prop({ required: false })
//   reportingManagerId?: string;

//   @Prop({ required: false })
//   remarks?: string;

//   @Prop({ required: false })
//   previousSalary?: number;

//   @Prop({ required: false })
//   baseSalary?: number;

//   @Prop({ required: false })
//   presentGrossSalary?: number;

//   @Prop({ type: Object, default: [], required: false })
//   allowances?: any;

//   @Prop({ required: false })
//   payrollCode?: string;

//   @Prop({ required: false })
//   payFrequency?: string;

//   @Prop({ required: false })
//   targetRate?: number;

//   @Prop({ required: false })
//   bankName?: string;

//   @Prop({ required: false })
//   iban?: string;

//   @Prop({ default: false, required: false })
//   isTaxable?: boolean;

//   @Prop({ default: false, required: false })
//   isOvertimeEligible?: boolean;

//   @Prop({ required: false })
//   passportNo?: string;

//   @Prop({ required: false })
//   passportExp?: string;

//   @Prop({ required: false })
//   visaStatus?: string;

//   @Prop({ required: false })
//   visaStartDate?: string;

//   @Prop({ required: false })
//   visaExpDate?: string;

//   @Prop({ required: false })
//   eidNumber?: string;

//   @Prop({ required: false })
//   eidIssueDate?: string;

//   @Prop({ required: false })
//   eidExpDate?: string;

//   @Prop({ type: Object, default: [], required: false })
//   documents?: any;

//   @Prop({ type: Object, default: {}, required: false })
//   emergencyContact?: any;

//   @Prop({ type: Object, default: {}, required: false })
//   leaveBalances?: any;

//   @Prop({ type: Object, default: {}, required: false })
//   customFieldValues?: any;

//   @Prop({ required: false })
//   createdBy?: string;

//   @Prop({ required: false })
//   updatedBy?: string;
// }

// export const EmployeeSchema = SchemaFactory.createForClass(Employee);
// export type EmployeeDocument = Employee & Document;