import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance } from './schemas/attendance.schema';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

// ─── Company Shift Configuration ─────────────────────────────────────────────
const SHIFT_START_HOUR = 8; // 08:00 AM
const SHIFT_START_MINUTE = 0;
const SHIFT_END_HOUR = 19; // 07:00 PM
const SHIFT_END_MINUTE = 0;
const STANDARD_HOURS = 11; // 8 AM → 7 PM = 11 hours
const LATE_GRACE_MINUTES = 5; // Allow 5-minute grace before marking Late

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts "HH:MM" string to total minutes from midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const SHIFT_START_MINS = SHIFT_START_HOUR * 60 + SHIFT_START_MINUTE; // 480
const SHIFT_END_MINS = SHIFT_END_HOUR * 60 + SHIFT_END_MINUTE; // 1140

/**
 * Determines the attendance status and lateness based on clock-in time.
 * Returns an object with isLate, lateMinutes, lateHours, and status.
 */
function evaluateClockIn(inTime: string): {
  isLate: boolean;
  lateMinutes: number;
  lateHours: number;
  status: string;
} {
  const inMins = timeToMinutes(inTime);
  const lateMins = Math.max(0, inMins - SHIFT_START_MINS);
  const isLate = lateMins > LATE_GRACE_MINUTES;

  return {
    isLate,
    lateMinutes: isLate ? lateMins : 0,
    lateHours: isLate ? parseFloat((lateMins / 60).toFixed(4)) : 0,
    status: isLate ? 'Late' : 'Present',
  };
}

/**
 * Evaluates clock-out time to determine early departure and overtime.
 * @param inTime    - HH:MM string (when the employee clocked in)
 * @param outTime   - HH:MM string (when the employee clocked out)
 * @param currentStatus - current status on the record ('Present' or 'Late')
 */
function evaluateClockOut(
  inTime: string,
  outTime: string,
  currentStatus: string,
): {
  isEarlyDeparture: boolean;
  earlyDepartureMinutes: number;
  workHours: number;
  overtimeHours: number;
  status: string;
} {
  const inMins = timeToMinutes(inTime);
  const outMins = timeToMinutes(outTime);

  // Work hours from actual in → out
  const rawWorkMins = Math.max(0, outMins - inMins);
  const workHours = parseFloat((rawWorkMins / 60).toFixed(4));

  // Early departure: left before shift end
  const earlyMins = Math.max(0, SHIFT_END_MINS - outMins);
  const isEarlyDeparture = earlyMins > 0;

  // Overtime: worked beyond standard hours
  const overtimeMins = Math.max(0, rawWorkMins - STANDARD_HOURS * 60);
  const overtimeHours = parseFloat((overtimeMins / 60).toFixed(4));

  // Status priority:  Late > Early Departure > Present
  let status = currentStatus; // preserve 'Late' if already set
  if (isEarlyDeparture && status !== 'Late') {
    status = 'Early Departure';
  }

  return {
    isEarlyDeparture,
    earlyDepartureMinutes: isEarlyDeparture ? earlyMins : 0,
    workHours,
    overtimeHours,
    status,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
  ) {}

  /**
   * Clock-In
   * The frontend sends the UAE-local date and inTime.
   * The backend re-calculates all late metrics authoritatively.
   */
  async clockIn(
    employeeId: string,
    dto: CreateAttendanceDto,
    userId: string,
  ): Promise<Attendance> {
    // Validate employeeId
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID');
    }

    // Prevent duplicate clock-in on the same date
    const existing = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      date: dto.date,
      inTime: { $exists: true },
    });

    if (existing) {
      throw new ConflictException(
        'Employee has already clocked in for this date',
      );
    }

    // Evaluate lateness
    const inTime = dto.inTime || '00:00';
    const lateInfo = evaluateClockIn(inTime);

    const attendance = new this.attendanceModel({
      employeeId: new Types.ObjectId(employeeId),
      date: dto.date,
      inTime,
      checkInMethod: dto.checkInMethod,
      checkInLocation: dto.checkInLocation,
      createdBy: new Types.ObjectId(userId),
      // ── Evaluated fields ──
      isLate: lateInfo.isLate,
      lateMinutes: lateInfo.lateMinutes,
      lateHours: lateInfo.lateHours,
      status: lateInfo.status,
      // Defaults for out-fields (will be set on clock-out)
      workHours: 0,
      overtimeHours: 0,
      isEarlyDeparture: false,
      earlyDepartureMinutes: 0,
    });

    return attendance.save();
  }

  /**
   * Clock-Out
   * Finds today's open record and fills in out-time, work hours, OT, and
   * early-departure flag.  The backend re-calculates everything from the
   * stored inTime.
   */
  async clockOut(
    employeeId: string,
    date: string,
    dto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    // Validate employeeId
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const attendance = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      date,
      outTime: { $exists: false },
    });

    if (!attendance) {
      throw new NotFoundException(
        'No open clock-in record found for this employee on this date',
      );
    }

    const outTime = dto.outTime || '00:00';
    const outInfo = evaluateClockOut(
      attendance.inTime,
      outTime,
      attendance.status, // preserve existing 'Late' status if applicable
    );

    Object.assign(attendance, {
      outTime,
      workHours: outInfo.workHours,
      overtimeHours: outInfo.overtimeHours,
      isEarlyDeparture: outInfo.isEarlyDeparture,
      earlyDepartureMinutes: outInfo.earlyDepartureMinutes,
      status: outInfo.status,
    });

    return attendance.save();
  }

  /** Returns today's clock-in / clock-out status for the given employee */
  async getTodayStatus(
    employeeId: string,
    date: string,
  ): Promise<{
    hasClockedIn: boolean;
    hasClockedOut: boolean;
    record: Attendance | null;
  }> {
    // Validate employeeId
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const record = await this.attendanceModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      date,
    });

    return {
      hasClockedIn: !!record?.inTime,
      hasClockedOut: !!record?.outTime,
      record: record ?? null,
    };
  }

  /**
   * Get attendance records for a specific employee
   */
  async getEmployeeAttendance(
    employeeId: string,
    filters?: { month?: number; year?: number },
  ): Promise<Attendance[]> {
    // Validate employeeId
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const query: any = {
      employeeId: new Types.ObjectId(employeeId),
    };

    if (filters?.month && filters?.year) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    }

    return this.attendanceModel
      .find(query)
      .sort({ date: -1 })
      .populate('employeeId', 'firstName lastName staffId')
      .exec();
  }

  /**
   * Get all attendance records with optional filters
   */
  async getAllAttendance(filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    month?: number;
    year?: number;
  }): Promise<Attendance[]> {
    const query: any = {};

    if (filters?.employeeId) {
      if (!Types.ObjectId.isValid(filters.employeeId)) {
        throw new BadRequestException('Invalid employee ID');
      }
      query.employeeId = new Types.ObjectId(filters.employeeId);
    }

    if (filters?.startDate && filters?.endDate) {
      query.date = { $gte: filters.startDate, $lte: filters.endDate };
    } else if (filters?.month && filters?.year) {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    }

    return this.attendanceModel
      .find(query)
      .sort({ date: -1 })
      .populate('employeeId', 'firstName lastName staffId')
      .exec();
  }

  /**
   * Bulk import attendance records
   * Used for importing from biometric systems or Excel files
   */
  async importAttendance(
    records: CreateAttendanceDto[],
    userId: string,
  ): Promise<Attendance[]> {
    // Validate records array
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('Records must be a non-empty array');
    }

    // Validate each record has required fields
    const invalidRecords = records.filter(
      (r) => !r.employeeId || !r.date || !r.inTime,
    );
    if (invalidRecords.length > 0) {
      throw new BadRequestException(
        `${invalidRecords.length} record(s) are missing required fields (employeeId, date, inTime)`,
      );
    }

    // Check for existing records to prevent duplicates
    const existingRecords = await this.attendanceModel.find({
      $or: records.map((r) => ({
        employeeId: new Types.ObjectId(r.employeeId),
        date: r.date,
      })),
    });

    const existingKeys = new Set(
      existingRecords.map((r) => `${r.employeeId}_${r.date}`),
    );

    // Filter out duplicates
    const newRecords = records.filter(
      (r) => !existingKeys.has(`${r.employeeId}_${r.date}`),
    );

    if (newRecords.length === 0) {
      throw new ConflictException(
        'All records already exist in the system. No new records to import.',
      );
    }

    // Re-calculate late/early for every imported record
    const enriched = newRecords.map((r) => {
      const inTime = r.inTime || '00:00';
      const outTime = r.outTime;
      const lateInfo = evaluateClockIn(inTime);

      let outFields: Partial<ReturnType<typeof evaluateClockOut>> = {};
      if (outTime) {
        outFields = evaluateClockOut(inTime, outTime, lateInfo.status);
      }

      return {
        ...r,
        employeeId: new Types.ObjectId(r.employeeId),
        createdBy: new Types.ObjectId(userId),
        isLate: lateInfo.isLate,
        lateMinutes: lateInfo.lateMinutes,
        lateHours: lateInfo.lateHours,
        status: outFields.status ?? lateInfo.status,
        workHours: outFields.workHours ?? 0,
        overtimeHours: outFields.overtimeHours ?? 0,
        isEarlyDeparture: outFields.isEarlyDeparture ?? false,
        earlyDepartureMinutes: outFields.earlyDepartureMinutes ?? 0,
      };
    });

    const created = await this.attendanceModel.insertMany(enriched);
    return created as any;
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(id: string): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const result = await this.attendanceModel.deleteOne({
      _id: new Types.ObjectId(id),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Attendance record not found');
    }

    return { deleted: true };
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(
    id: string,
    dto: UpdateAttendanceDto,
    userId: string,
  ): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const attendance = await this.attendanceModel.findById(id);

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    // If updating times, recalculate metrics
    if (dto.outTime && attendance.inTime) {
      const outInfo = evaluateClockOut(
        attendance.inTime,
        dto.outTime,
        attendance.status,
      );

      Object.assign(attendance, {
        outTime: dto.outTime,
        workHours: outInfo.workHours,
        overtimeHours: outInfo.overtimeHours,
        isEarlyDeparture: outInfo.isEarlyDeparture,
        earlyDepartureMinutes: outInfo.earlyDepartureMinutes,
        status: outInfo.status,
      });
    } else {
      // Update other fields if provided
      Object.assign(attendance, dto);
    }

    return attendance.save();
  }

  /**
   * Get attendance statistics for an employee
   */
  async getEmployeeStats(
    employeeId: string,
    filters?: { month?: number; year?: number },
  ): Promise<{
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
    averageWorkHours: number;
  }> {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const records = await this.getEmployeeAttendance(employeeId, filters);

    const stats = {
      totalDays: records.length,
      presentDays: records.filter((r) => r.status === 'Present').length,
      lateDays: records.filter((r) => r.status === 'Late').length,
      absentDays: records.filter((r) => r.status === 'Absent').length,
      leaveDays: records.filter((r) => r.status === 'On Leave').length,
      totalWorkHours: records.reduce((sum, r) => sum + (r.workHours || 0), 0),
      totalOvertimeHours: records.reduce(
        (sum, r) => sum + (r.overtimeHours || 0),
        0,
      ),
      totalLateMinutes: records.reduce(
        (sum, r) => sum + (r.lateMinutes || 0),
        0,
      ),
      averageWorkHours: 0,
    };

    stats.averageWorkHours =
      stats.totalDays > 0
        ? parseFloat((stats.totalWorkHours / stats.totalDays).toFixed(2))
        : 0;

    return stats;
  }
}

// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { Attendance } from './schemas/attendance.schema';
// import { CreateAttendanceDto } from './dto/create-attendance.dto';
// import { UpdateAttendanceDto } from './dto/update-attendance.dto';

// // ─── Company Shift Configuration ─────────────────────────────────────────────
// const SHIFT_START_HOUR   = 8;    // 08:00 AM
// const SHIFT_START_MINUTE = 0;
// const SHIFT_END_HOUR     = 19;   // 07:00 PM
// const SHIFT_END_MINUTE   = 0;
// const STANDARD_HOURS     = 11;   // 8 AM → 7 PM = 11 hours
// const LATE_GRACE_MINUTES = 5;    // Allow 5-minute grace before marking Late

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// /** Converts "HH:MM" string to total minutes from midnight */
// function timeToMinutes(time: string): number {
//   const [h, m] = time.split(':').map(Number);
//   return h * 60 + m;
// }

// const SHIFT_START_MINS = SHIFT_START_HOUR * 60 + SHIFT_START_MINUTE; // 480
// const SHIFT_END_MINS   = SHIFT_END_HOUR   * 60 + SHIFT_END_MINUTE;   // 1140

// /**
//  * Determines the attendance status and lateness based on clock-in time.
//  * Returns an object with isLate, lateMinutes, lateHours, and status.
//  */
// function evaluateClockIn(inTime: string): {
//   isLate: boolean;
//   lateMinutes: number;
//   lateHours: number;
//   status: string;
// } {
//   const inMins    = timeToMinutes(inTime);
//   const lateMins  = Math.max(0, inMins - SHIFT_START_MINS);
//   const isLate    = lateMins > LATE_GRACE_MINUTES;

//   return {
//     isLate,
//     lateMinutes : isLate ? lateMins : 0,
//     lateHours   : isLate ? parseFloat((lateMins / 60).toFixed(4)) : 0,
//     status      : isLate ? 'Late' : 'Present',
//   };
// }

// /**
//  * Evaluates clock-out time to determine early departure and overtime.
//  * @param inTime    - HH:MM string (when the employee clocked in)
//  * @param outTime   - HH:MM string (when the employee clocked out)
//  * @param currentStatus - current status on the record ('Present' or 'Late')
//  */
// function evaluateClockOut(
//   inTime: string,
//   outTime: string,
//   currentStatus: string,
// ): {
//   isEarlyDeparture: boolean;
//   earlyDepartureMinutes: number;
//   workHours: number;
//   overtimeHours: number;
//   status: string;
// } {
//   const inMins   = timeToMinutes(inTime);
//   const outMins  = timeToMinutes(outTime);

//   // Work hours from actual in → out
//   const rawWorkMins   = Math.max(0, outMins - inMins);
//   const workHours     = parseFloat((rawWorkMins / 60).toFixed(4));

//   // Early departure: left before shift end
//   const earlyMins          = Math.max(0, SHIFT_END_MINS - outMins);
//   const isEarlyDeparture   = earlyMins > 0;

//   // Overtime: worked beyond standard hours
//   const overtimeMins  = Math.max(0, rawWorkMins - STANDARD_HOURS * 60);
//   const overtimeHours = parseFloat((overtimeMins / 60).toFixed(4));

//   // Status priority:  Late > Early Departure > Present
//   let status = currentStatus; // preserve 'Late' if already set
//   if (isEarlyDeparture && status !== 'Late') {
//     status = 'Early Departure';
//   }

//   return {
//     isEarlyDeparture,
//     earlyDepartureMinutes: isEarlyDeparture ? earlyMins : 0,
//     workHours,
//     overtimeHours,
//     status,
//   };
// }

// // ─── Service ─────────────────────────────────────────────────────────────────

// @Injectable()
// export class AttendanceService {
//   constructor(
//     @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
//   ) {}

//   /**
//    * Clock-In
//    * The frontend sends the UAE-local date and inTime.
//    * The backend re-calculates all late metrics authoritatively.
//    */
//   async clockIn(
//     employeeId: string,
//     dto: CreateAttendanceDto,
//     userId: string,
//   ): Promise<Attendance> {
//     // Prevent duplicate clock-in on the same date
//     const existing = await this.attendanceModel.findOne({
//       employeeId : new Types.ObjectId(employeeId),
//       date       : dto.date,
//       inTime     : { $exists: true },
//     });

//     if (existing) {
//       throw new BadRequestException('Already clocked in today');
//     }

//     // Evaluate lateness
//     const inTime = dto.inTime || '00:00';
//     const lateInfo = evaluateClockIn(inTime);

//     const attendance = new this.attendanceModel({
//       employeeId    : new Types.ObjectId(employeeId),
//       date          : dto.date,
//       inTime,
//       checkInMethod : dto.checkInMethod,
//       checkInLocation: dto.checkInLocation,
//       createdBy     : new Types.ObjectId(userId),
//       // ── Evaluated fields ──
//       isLate        : lateInfo.isLate,
//       lateMinutes   : lateInfo.lateMinutes,
//       lateHours     : lateInfo.lateHours,
//       status        : lateInfo.status,
//       // Defaults for out-fields (will be set on clock-out)
//       workHours     : 0,
//       overtimeHours : 0,
//       isEarlyDeparture     : false,
//       earlyDepartureMinutes: 0,
//     });

//     return attendance.save();
//   }

//   /**
//    * Clock-Out
//    * Finds today's open record and fills in out-time, work hours, OT, and
//    * early-departure flag.  The backend re-calculates everything from the
//    * stored inline frontend cannot spend hours yahya has told 
//    */
//   async clockOut(
//     employeeId: string,
//     date: string,
//     dto: UpdateAttendanceDto,
//   ): Promise<Attendance> {
//     const attendance = await this.attendanceModel.findOne({
//       employeeId : new Types.ObjectId(employeeId),
//       date,
//       outTime    : { $exists: false },
//     });

//     if (!attendance) {
//       throw new NotFoundException('No open clock-in record found for today');
//     }

//     const outTime = dto.outTime || '00:00';
//     const outInfo = evaluateClockOut(
//       attendance.inTime,
//       outTime,
//       attendance.status, // preserve existing 'Late' status if applicable
//     );

//     Object.assign(attendance, {
//       outTime,
//       workHours            : outInfo.workHours,
//       overtimeHours        : outInfo.overtimeHours,
//       isEarlyDeparture     : outInfo.isEarlyDeparture,
//       earlyDepartureMinutes: outInfo.earlyDepartureMinutes,
//       status               : outInfo.status,
//     });

//     return attendance.save();
//   }

//   /** Returns today's clock-in / clock-out status for the given employee */
//   async getTodayStatus(employeeId: string, date: string): Promise<{
//     hasClockedIn: boolean;
//     hasClockedOut: boolean;
//     record: Attendance | null;
//   }> {
//     const record = await this.attendanceModel.findOne({
//       employeeId: new Types.ObjectId(employeeId),
//       date,
//     });

//     return {
//       hasClockedIn  : !!record?.inTime,
//       hasClockedOut : !!record?.outTime,
//       record        : record ?? null,
//     };
//   }

//   async getEmployeeAttendance(
//     employeeId: string,
//     filters?: { month?: number; year?: number },
//   ): Promise<Attendance[]> {
//     const query: any = {
//       employeeId: new Types.ObjectId(employeeId),
//     };

//     if (filters?.month && filters?.year) {
//       const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
//       const endDate   = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
//       query.date = { $gte: startDate, $lte: endDate };
//     }

//     return this.attendanceModel.find(query).sort({ date: -1 }).exec();
//   }

//   async getAllAttendance(filters?: {
//     employeeId?: string;
//     startDate?: string;
//     endDate?: string;
//     month?: number;
//     year?: number;
//   }): Promise<Attendance[]> {
//     const query: any = {};

//     if (filters?.employeeId) {
//       query.employeeId = new Types.ObjectId(filters.employeeId);
//     }

//     if (filters?.startDate && filters?.endDate) {
//       query.date = { $gte: filters.startDate, $lte: filters.endDate };
//     } else if (filters?.month && filters?.year) {
//       const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
//       const endDate   = `${filters.year}-${String(filters.month).padStart(2, '0')}-31`;
//       query.date = { $gte: startDate, $lte: endDate };
//     }

//     return this.attendanceModel.find(query).sort({ date: -1 }).exec();
//   }

//   async importAttendance(
//     records: CreateAttendanceDto[],
//     userId: string,
//   ): Promise<Attendance[]> {
//     // Re-calculate late/early for every imported record too
//     const enriched = records.map((r) => {
//       const inTime  = r.inTime  || '00:00';
//       const outTime = r.outTime;
//       const lateInfo = evaluateClockIn(inTime);

//       let outFields: Partial<ReturnType<typeof evaluateClockOut>> = {};
//       if (outTime) {
//         outFields = evaluateClockOut(inTime, outTime, lateInfo.status);
//       }

//       return {
//         ...r,
//         employeeId   : new Types.ObjectId(r.employeeId),
//         createdBy    : new Types.ObjectId(userId),
//         isLate       : lateInfo.isLate,
//         lateMinutes  : lateInfo.lateMinutes,
//         lateHours    : lateInfo.lateHours,
//         status       : outFields.status ?? lateInfo.status,
//         workHours    : outFields.workHours ?? 0,
//         overtimeHours: outFields.overtimeHours ?? 0,
//         isEarlyDeparture     : outFields.isEarlyDeparture ?? false,
//         earlyDepartureMinutes: outFields.earlyDepartureMinutes ?? 0,
//       };
//     });

//     const created = await this.attendanceModel.insertMany(enriched);
//     return created as any;
//   }
// }