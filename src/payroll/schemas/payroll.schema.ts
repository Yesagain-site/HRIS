// backend/src/payroll/schemas/payroll.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Payroll extends Document {
  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  month: number;

  @Prop({ type: Object, required: true })
  data: any; // Excel data as JSON

  @Prop({ type: [String], required: true })
  headers: string[];

  @Prop({ default: false })
  isGenerated: boolean;

  @Prop({ required: true })
  uploadedBy: string; // User ID

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop()
  generatedAt: Date;

  @Prop()
  fileName: string;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);