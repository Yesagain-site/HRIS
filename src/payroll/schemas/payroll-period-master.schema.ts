// payroll-period-master.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PayrollPeriodMaster extends Document {
  @Prop({ required: true })
  month: number; // 1-12

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  monthName: string; // "January", "February", etc.

  @Prop({ required: true })
  startDate: string; // "2026-02-01"

  @Prop({ required: true })
  endDate: string; // "2026-02-28"

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;
}

export const PayrollPeriodMasterSchema = SchemaFactory.createForClass(PayrollPeriodMaster);