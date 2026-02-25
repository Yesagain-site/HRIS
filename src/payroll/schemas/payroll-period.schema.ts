import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// payroll-period.schema.ts - Add isActive and createdInSettings fields
@Schema({ timestamps: true })
export class PayrollPeriod extends Document {
  @Prop({ required: true })
  month: number;

  @Prop({ required: true })
  year: number;

  @Prop()
  startDate: string;

  @Prop()
  endDate: string;

  @Prop()
  monthName: string;

  @Prop({ default: 'draft' })
  status: string; // 'draft', 'calculated', 'generated'

  @Prop({ default: false }) // NEW: Mark if created from Settings
  createdInSettings: boolean;

  @Prop({ default: true }) // NEW: Control visibility
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop()
  updatedAt: Date;
}

export const PayrollPeriodSchema = SchemaFactory.createForClass(PayrollPeriod);