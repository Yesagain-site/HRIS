import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceRequestDocument = ServiceRequest & Document;

@Schema({ timestamps: true })
export class ServiceRequest {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  requestType: string; // 'leave', 'permission', 'cash', 'resignation'

  // Leave specific fields
  @Prop()
  leaveType?: string;

  @Prop()
  startDate?: string;

  @Prop()
  endDate?: string;

  // Permission specific fields
  @Prop()
  permissionDate?: string;

  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  // Cash advance specific fields
  @Prop()
  amount?: number;

  @Prop()
  repaymentDate?: string;

  // Resignation specific fields
  @Prop()
  proposedLastDay?: string;

  // Common fields
  @Prop()
  reason?: string;

  @Prop({ default: 'Pending' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approverId?: Types.ObjectId;

  @Prop()
  approverName?: string;

  @Prop()
  approvalDate?: Date;

  @Prop()
  managerNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const ServiceRequestSchema = SchemaFactory.createForClass(ServiceRequest);