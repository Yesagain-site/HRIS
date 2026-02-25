import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PayrollEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'PayrollPeriod', required: true })
  payrollPeriodId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop()
  staffId: string;

  // Employee Info (snapshot)
  @Prop({ required: true })
  sr: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  designation: string;

  @Prop()
  department: string;

  // Month Info
  @Prop()
  month: string;

  @Prop()
  year: number;

  @Prop({ default: 30 })
  totalDays: number;

  @Prop({ default: 0 })
  offDays: number;

  @Prop({ default: 0 })
  leaveTaken: number;

  @Prop({ default: 0 })
  workedDays: number;

  // Salary
  @Prop({ default: 0 })
  ctc: number;

  @Prop({ default: 0 })
  dailyRate: number;

  @Prop({ default: 0 })
  hourlyRate: number;

  // Special Days
  @Prop({ default: 0 })
  offDaysWorked: number;

  @Prop({ default: 0 })
  offDayAmount: number;

  @Prop({ default: 0 })
  holidayWorked: number;

  @Prop({ default: 0 })
  holidayAmount: number;

  // Earnings
  @Prop({ default: 0 })
  leaveSalary: number;

  @Prop({ default: 0 })
  cashAdvance: number;

  @Prop({ default: 0 })
  penaltyPoints: number;

  @Prop({ default: 0 })
  total: number;

  // Deductions - Manual
  @Prop({ default: 0 })
  visaCost: number;

  @Prop({ default: 0 })
  fines: number;

  @Prop({ default: 0 })
  cleaningFees: number;

  @Prop({ default: 0 })
  extraFromManager: number;

  @Prop({ default: 0 })
  backPayment: number;

  @Prop({ default: 0 })
  finalModification: number;

  @Prop({ default: '' })
  hrNotes: string;

  // Deductions - Auto (from attendance)
  @Prop({ default: 0 })
  absences: number;

  @Prop({ default: 0 })
  unauthorizedAbsences: number;

  @Prop({ default: 0 })
  lateHours: number;

  @Prop({ default: 0 })
  authAbsenceDeduction: number;

  @Prop({ default: 0 })
  unauthAbsenceDeduction: number;

  @Prop({ default: 0 })
  tardiness: number;

  @Prop({ default: 0 })
  allDeductions: number;

  // Overtime
  @Prop({ default: 0 })
  overtimeHours: number;

  @Prop({ default: 0 })
  overtimeAmount: number;

  @Prop({ default: 0 })
  netDeductions: number;

  // Net Salary
  @Prop({ default: 0 })
  januaryNetSalary: number;

  @Prop({ default: 0 })
  targetRate: number;

  @Prop({ default: 0 })
  totalJanuarySalary: number;

  // Final Calculations
  @Prop({ default: 0 })
  beforeOT: number;

  @Prop({ default: 0 })
  ot: number;

  @Prop({ default: 0 })
  totalCalculated: number;

  @Prop({ default: 0 })
  dfrnce: number;

  @Prop({ default: 0 })
  deductions: number;

  @Prop({ default: 0 })
  inDays: number;

  // Status
  @Prop({ default: false })
  isCalculated: boolean;

  @Prop({ default: true })
  isEditable: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  calculatedBy?: Types.ObjectId;

  @Prop()
  calculatedAt?: Date;
}

export const PayrollEntrySchema = SchemaFactory.createForClass(PayrollEntry);

// Indexes for faster queries
PayrollEntrySchema.index({ payrollPeriodId: 1, employeeId: 1 }, { unique: true });