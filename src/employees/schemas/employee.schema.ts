// employee.schema.ts - SIMPLIFIED VERSION
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Employee extends Document {
  // Required fields only
  @Prop({ required: true, unique: true })
  staffId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop()
  middleName?: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ default: 'Male' })
  gender?: string;

  @Prop()
  dob?: string;

  @Prop()
  nationality?: string;

  @Prop({ default: 'Single' })
  maritalStatus?: string;

  @Prop()
  address?: string;

  // Employment
  @Prop({ required: true, default: 'Active' })
  workStatus: string;

  @Prop({ required: true })
  joiningDate: string;

  @Prop({ required: true })
  designation: string;

  @Prop({ required: true })
  department: string;

  @Prop()
  reportingManagerId?: string;

  @Prop()
  remarks?: string;

  // Salary
  @Prop({ default: 0 })
  previousSalary?: number;

  @Prop({ required: true, default: 0 })
  baseSalary: number;

  @Prop({ required: true, default: 0 })
  presentGrossSalary: number;

  // Make ALL complex fields as optional with flexible types
  @Prop({ type: Object, default: [] })
  allowances?: any;

  @Prop()
  payrollCode?: string;

  @Prop({ default: 'Monthly' })
  payFrequency?: string;

  @Prop({ default: 0 })
  targetRate?: number;

  @Prop()
  bankName?: string;

  @Prop()
  iban?: string;

  @Prop({ default: false })
  isTaxable?: boolean;

  @Prop({ default: false })
  isOvertimeEligible?: boolean;

  // Identity
  @Prop()
  passportNo?: string;

  @Prop()
  passportExp?: string;

  @Prop({ default: 'Active' })
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

  // Flexible fields - accept ANY structure
  @Prop({ type: Object, default: [] })
  documents?: any;

  @Prop({ type: Object, default: {} })
  emergencyContact?: any;

  @Prop({ type: Object, default: [] })
  leaveBalances?: any;

  @Prop({ type: Object, default: {} })
  customFieldValues?: any;

  // Audit
  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
export type EmployeeDocument = Employee & Document;