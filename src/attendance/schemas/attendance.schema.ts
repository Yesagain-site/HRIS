import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Attendance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  date: string; // YYYY-MM-DD

  @Prop()
  inTime: string; // HH:MM

  @Prop()
  outTime: string; // HH:MM

  // ─── Shift timing tracking ───────────────────────────────────────────────

  /** Was the employee late to check-in? */
  @Prop({ default: false })
  isLate: boolean;

  /** How many minutes late the employee checked in (0 if on-time) */
  @Prop({ default: 0 })
  lateMinutes: number;

  /** Was the employee an early departure? */
  @Prop({ default: false })
  isEarlyDeparture: boolean;

  /** How many minutes early the employee left (0 if on-time or after shift end) */
  @Prop({ default: 0 })
  earlyDepartureMinutes: number;

  /** Total late hours (lateMinutes / 60), used by payroll */
  @Prop({ default: 0 })
  lateHours: number;

  // ─── Status & Hours ──────────────────────────────────────────────────────

  /** Present | Late | Early Departure | Absent | On Leave */
  @Prop({ default: 'Present' })
  status: string;

  /** Total hours worked */
  @Prop({ default: 0 })
  workHours: number;

  /** Hours worked beyond the standard shift (11 hrs: 08:00 – 19:00) */
  @Prop({ default: 0 })
  overtimeHours: number;

  // ─── Check-in meta ───────────────────────────────────────────────────────

  @Prop()
  checkInMethod: string;

  @Prop({ type: Object })
  checkInLocation: {
    latitude: number;
    longitude: number;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);