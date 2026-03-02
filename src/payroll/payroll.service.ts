import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PayrollPeriod } from './schemas/payroll-period.schema';
import { PayrollEntry } from './schemas/payroll-entry.schema';
import { BadRequestException } from '@nestjs/common';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
import { PayrollCalculationService } from './payroll-calculation.service';
import { Employee } from '../employees/schemas/employee.schema';
import { Attendance } from '../attendance/schemas/attendance.schema';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(PayrollPeriod.name) private payrollPeriodModel: Model<PayrollPeriod>,
    @InjectModel(PayrollEntry.name) private payrollEntryModel: Model<PayrollEntry>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    private calculationService: PayrollCalculationService,
  ) {}

  /**
   * Initialize payroll entries for a period
   * NOW WITH ATTENDANCE DATA AUTO-POPULATION
   */
  async initializePayrollEntries(
    periodId: string,
    month: number,
    year: number,
  ): Promise<PayrollEntry[]> {
    const periodObjectId = new Types.ObjectId(periodId);

    // Check if entries already exist
    const existing = await this.payrollEntryModel.find({
      payrollPeriodId: periodObjectId,
    });

    if (existing.length > 0) {
      return existing;
    }

    const employees = await this.employeeModel
      .find({
        workStatus: 'Active',
      })
      .sort({ firstName: 1 });

    const entries: PayrollEntry[] = [];
    const totalDays = new Date(year, month, 0).getDate();
    const offDays = this.countWeekendDays(year, month);

    // ═══ FETCH MONTHLY ATTENDANCE SUMMARIES ═══
    const monthlySummaries = await this.attendanceModel.find({
      recordType: 'monthly_summary',
      month,
      year,
    });

    // Create a map for quick lookup
    const summaryMap = new Map();
    for (const summary of monthlySummaries) {
      summaryMap.set(summary.employeeId.toString(), summary);
    }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      // ═══ GET ATTENDANCE DATA FOR THIS EMPLOYEE ═══
      const attendanceSummary = summaryMap.get(emp._id.toString());

      // Calculate values from attendance
      const absences = attendanceSummary?.absences || 0;
      const lateHours = attendanceSummary?.lateHours || 0;
      const overtimeHours = attendanceSummary?.overtimeHours || 0;

      const entry = new this.payrollEntryModel({
        payrollPeriodId: periodObjectId,
        employeeId: emp._id,
        sr: i + 1,
        staffId: emp.staffId,
        name: `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`
          .replace(/\s+/g, ' ')
          .trim(),
        designation: emp.designation || '',
        department: emp.department || '',
        month: this.getMonthName(month),
        year,
        totalDays,
        offDays,
        leaveTaken: 0,
        workedDays: totalDays - absences, // ═══ AUTO-CALCULATED ═══
        ctc: emp.baseSalary || 0,
        dailyRate: 0,
        hourlyRate: 0,
        offDaysWorked: 0,
        offDayAmount: 0,
        holidayWorked: 0,
        holidayAmount: 0,
        leaveSalary: 0,
        cashAdvance: 0,
        penaltyPoints: 0,
        total: 0,
        visaCost: 0,
        fines: 0,
        cleaningFees: 0,
        extraFromManager: 0,
        backPayment: 0,
        finalModification: 0,
        hrNotes: '',
        absences: absences, // ═══ FROM ATTENDANCE ═══
        unauthorizedAbsences: 0,
        lateHours: lateHours, // ═══ FROM ATTENDANCE ═══
        authAbsenceDeduction: 0,
        unauthAbsenceDeduction: 0,
        tardiness: 0,
        allDeductions: 0,
        overtimeHours: overtimeHours, // ═══ FROM ATTENDANCE ═══
        overtimeAmount: 0,
        netDeductions: 0,
        januaryNetSalary: 0,
        targetRate: emp.targetRate || 0,
        totalJanuarySalary: 0,
        beforeOT: 0,
        ot: 0,
        totalCalculated: 0,
        dfrnce: 0,
        deductions: 0,
        inDays: 0,
        isCalculated: false,
        isEditable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedEntry = await entry.save();
      entries.push(savedEntry);
    }

    return entries;
  }

  /**
   * Helper method to count weekend days
   */
  private countWeekendDays(year: number, month: number): number {
    const date = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    let weekendCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      date.setDate(day);
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0) {
        weekendCount++;
      }
    }

    return weekendCount;
  }

  /**
   * Find payroll by month and year
   */
  async findByMonthYear(month: number, year: number): Promise<any> {
    const period = await this.payrollPeriodModel.findOne({ month, year });

    if (!period) {
      return null;
    }

    const entries = await this.payrollEntryModel
      .find({
        payrollPeriodId: period._id,
      })
      .sort({ sr: 1 });

    return {
      _id: period._id,
      period,
      entries,
    };
  }

  /**
   * Update a single payroll entry
   */
  async updateEntry(
    entryId: string,
    dto: UpdatePayrollEntryDto,
  ): Promise<PayrollEntry> {
    if (!entryId || entryId === 'undefined') {
      throw new BadRequestException('Invalid entry ID');
    }

    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestException('Invalid ObjectId format');
    }

    const entry = await this.payrollEntryModel.findById(entryId);

    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }

    // Update fields
    Object.assign(entry, dto);

    // Recalculate if needed - but NOT for offDays/workedDays updates
    const isManualUpdate =
      Object.keys(dto).length === 1 &&
      (dto.hasOwnProperty('offDays') || dto.hasOwnProperty('workedDays'));

    if (
      !isManualUpdate &&
      (dto.offDaysWorked !== undefined ||
        dto.holidayWorked !== undefined ||
        dto.absences !== undefined ||
        dto.overtimeHours !== undefined)
    ) {
      const plainEntry = entry.toObject();
      const calculated = this.calculationService.calculateAll(plainEntry as any);
      Object.assign(entry, calculated);
    }

    return entry.save();
  }

  /**
   * Calculate a single entry
   */
  async calculateEntry(entryId: string): Promise<PayrollEntry> {
    const entry = await this.payrollEntryModel.findById(entryId);

    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }

    const plainEntry = entry.toObject();
    const calculated = this.calculationService.calculateAll(plainEntry as any);
    Object.assign(entry, calculated);

    return entry.save();
  }

  /**
   * Calculate all entries for a period
   */
  async calculateAllEntries(periodId: string): Promise<PayrollEntry[]> {
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: periodId,
    });

    for (const entry of entries) {
      const plainEntry = entry.toObject();
      const calculated = this.calculationService.calculateAll(plainEntry as any);
      Object.assign(entry, calculated);
      await entry.save();
    }

    await this.payrollPeriodModel.findByIdAndUpdate(periodId, {
      status: 'calculated',
      updatedAt: new Date(),
    });

    return this.payrollEntryModel
      .find({ payrollPeriodId: periodId })
      .sort({ sr: 1 });
  }

  /**
   * Generate payroll (finalize)
   */
  async generatePayroll(periodId: string, userId: string): Promise<any> {
    // Try to find period with both string and ObjectId
    let period;
    try {
      period = await this.payrollPeriodModel.findById(periodId);
    } catch (err) {
      console.log('Error finding period by ID, trying with ObjectId conversion');
      period = await this.payrollPeriodModel.findById(
        new Types.ObjectId(periodId),
      );
    }

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    // If already generated, prevent re-generation
    if (period.status === 'generated') {
      throw new BadRequestException('Payroll has already been generated');
    }

    // Get current entries
    let entries = await this.payrollEntryModel.find({
      payrollPeriodId: period._id,
    });

    // Try multiple query formats if empty
    if (entries.length === 0) {
      entries = await this.payrollEntryModel.find({
        payrollPeriodId: periodId,
      });
    }

    if (entries.length === 0) {
      try {
        entries = await this.payrollEntryModel.find({
          payrollPeriodId: new Types.ObjectId(periodId),
        });
      } catch (err) {
        console.log('Error querying with ObjectId:', err);
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException('No payroll entries found');
    }

    // Calculate all entries
    for (const entry of entries) {
      const plainEntry = entry.toObject();
      const calculated = this.calculationService.calculateAll(plainEntry as any);
      Object.assign(entry, calculated);
      entry.isEditable = false;
      await entry.save();
    }

    // Update period status
    period.status = 'generated';
    period.updatedBy = new Types.ObjectId(userId);
    period.updatedAt = new Date();
    await period.save();

    return {
      message: 'Payroll generated successfully',
      periodId: period._id,
      status: 'generated',
      entryCount: entries.length,
    };
  }

  /**
   * Delete payroll period
   */
  async deletePayrollPeriod(periodId: string): Promise<void> {
    await this.payrollEntryModel.deleteMany({ payrollPeriodId: periodId });
    await this.payrollPeriodModel.findByIdAndDelete(periodId);
  }

  /**
   * Delete by month and year
   */
  async deleteByMonthYear(month: number, year: number): Promise<void> {
    const period = await this.payrollPeriodModel.findOne({ month, year });
    if (period) {
      await this.deletePayrollPeriod(period._id.toString());
    }
  }

  /**
   * Delete a single payroll entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    if (!entryId || entryId === 'undefined') {
      throw new BadRequestException('Invalid entry ID');
    }

    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestException('Invalid ObjectId format');
    }

    const entry = await this.payrollEntryModel.findById(entryId);

    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }

    // Check if the period is generated
    const period = await this.payrollPeriodModel.findById(
      entry.payrollPeriodId,
    );

    if (period && period.status === 'generated') {
      throw new BadRequestException(
        'Cannot delete entry from a generated payroll period',
      );
    }

    await this.payrollEntryModel.findByIdAndDelete(entryId);
  }

  /**
   * Get month name from number
   */
  private getMonthName(month: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[month - 1];
  }

  /**
   * Create period from settings
   */
  async createPeriodFromSettings(dto: any, userId: string): Promise<PayrollPeriod> {
    // Check if period already exists
    const existing = await this.payrollPeriodModel.findOne({
      month: dto.month,
      year: dto.year,
    });

    if (existing) {
      throw new BadRequestException('Payroll period already exists');
    }

    // Calculate month name and dates if not provided
    const monthName =
      dto.monthName ||
      new Date(2000, dto.month - 1, 1).toLocaleString('default', {
        month: 'long',
      });

    const startDate =
      dto.startDate ||
      `${dto.year}-${String(dto.month).padStart(2, '0')}-01`;
    const lastDay = new Date(dto.year, dto.month, 0).getDate();
    const endDate =
      dto.endDate ||
      `${dto.year}-${String(dto.month).padStart(2, '0')}-${lastDay}`;

    const period = new this.payrollPeriodModel({
      month: dto.month,
      year: dto.year,
      monthName,
      startDate,
      endDate,
      status: 'draft',
      createdInSettings: true,
      isActive: true,
      createdBy: userId,
      createdAt: new Date(),
    });

    return period.save();
  }

  /**
   * Get or create payroll period
   */
  async getOrCreatePayrollPeriod(
    month: number,
    year: number,
    userId: string,
  ): Promise<any> {
    // Find the period with exact month and year
    let period = await this.payrollPeriodModel.findOne({
      month: month,
      year: year,
    });

    if (!period) {
      console.log(`❌ No period found for ${month}/${year}`);
      return { period: null, entries: [] };
    }

    // Find entries using ObjectId
    const entries = await this.payrollEntryModel
      .find({
        payrollPeriodId: period._id,
      })
      .sort({ sr: 1 });

    // Verify entries match the expected month/year
    if (entries.length > 0) {
      const firstEntry = entries[0];
      if (
        firstEntry.month !== period.monthName ||
        firstEntry.year !== period.year
      ) {
        console.error(
          `❌ Entry month/year mismatch! Period: ${period.monthName} ${period.year}, Entry: ${firstEntry.month} ${firstEntry.year}`,
        );
      }
    }

    // If entries exist, return them
    if (entries.length > 0) {
      return { period, entries };
    }

    // No entries exist - create them WITH ATTENDANCE DATA
    const newEntries = await this.initializePayrollEntries(
      period._id.toString(),
      month,
      year,
    );
    return { period, entries: newEntries };
  }

  /**
   * Get only settings-created periods
   */
  async getSettingsPeriods(): Promise<PayrollPeriod[]> {
    return this.payrollPeriodModel
      .find({
        createdInSettings: true,
        isActive: true,
      })
      .sort({ year: -1, month: -1 });
  }

  /**
   * Delete settings period
   */
  async deleteSettingsPeriod(id: string): Promise<void> {
    const period = await this.payrollPeriodModel.findById(id);

    if (!period) {
      throw new NotFoundException('Period not found');
    }

    // Check if this period has generated payroll data
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: id,
    });

    if (entries.length > 0 && period.status === 'generated') {
      throw new BadRequestException(
        'Cannot delete a period with generated payroll data',
      );
    }

    await this.payrollPeriodModel.findByIdAndDelete(id);
    await this.payrollEntryModel.deleteMany({ payrollPeriodId: id });
  }

  /**
   * Create a single entry
   */
  async createEntry(dto: any, userId: string): Promise<PayrollEntry> {
    // Remove any temporary id if present
    const { id, ...entryData } = dto;

    // Ensure employeeId is ObjectId if it exists
    if (entryData.employeeId) {
      entryData.employeeId = new Types.ObjectId(entryData.employeeId);
    }

    // Ensure payrollPeriodId is ObjectId
    if (entryData.payrollPeriodId) {
      entryData.payrollPeriodId = new Types.ObjectId(entryData.payrollPeriodId);
    }

    const entry = new this.payrollEntryModel({
      ...entryData,
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return entry.save();
  }

  /**
   * Get entries by period
   */
  async getEntriesByPeriod(periodId: string): Promise<any[]> {
    console.log('🔍 Backend: Fetching entries for period:', periodId);

    let periodObjectId: Types.ObjectId;

    // Convert to ObjectId
    try {
      periodObjectId = new Types.ObjectId(periodId);
    } catch (error) {
      console.error('❌ Invalid period ID format:', periodId);
      return [];
    }

    // Use .lean() to get plain JavaScript objects
    const entries = await this.payrollEntryModel
      .find({ payrollPeriodId: periodObjectId })
      .sort({ sr: 1 })
      .lean()
      .exec();

    console.log(`✅ Backend: Found ${entries.length} entries`);

    // Convert all ObjectIds to strings BEFORE sending to frontend
    const plainEntries = entries.map((entry) => ({
      ...entry,
      _id: entry._id.toString(),
      employeeId: entry.employeeId?.toString() || null,
      payrollPeriodId: entry.payrollPeriodId?.toString() || null,
    }));

    console.log('📤 Backend: First entry being sent:', {
      name: plainEntries[0]?.name,
      employeeId: plainEntries[0]?.employeeId,
      employeeIdType: typeof plainEntries[0]?.employeeId,
    });

    return plainEntries;
  }

  /**
   * Get all payrolls with filters
   */
  async getAllPayrolls(filters?: {
    year?: number;
    month?: number;
    isGenerated?: boolean;
  }): Promise<PayrollPeriod[]> {
    const query: any = {};

    if (filters?.year) {
      query.year = filters.year;
    }

    if (filters?.month) {
      query.month = filters.month;
    }

    if (filters?.isGenerated !== undefined) {
      query.status = filters.isGenerated ? 'generated' : { $ne: 'generated' };
    }

    return this.payrollPeriodModel.find(query).sort({ year: -1, month: -1 }).exec();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══ ATTENDANCE SYNC METHODS ═══════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update payroll entries with attendance data
   * Used to sync/refresh attendance data
   */
  async updatePayrollEntriesWithAttendance(
    periodId: string,
    month: number,
    year: number,
  ): Promise<number> {
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: new Types.ObjectId(periodId),
    });

    if (entries.length === 0) {
      return 0;
    }

    // Fetch all monthly attendance summaries for this period
    const monthlySummaries = await this.attendanceModel.find({
      recordType: 'monthly_summary',
      month,
      year,
    });

    // Create a map for quick lookup
    const summaryMap = new Map();
    for (const summary of monthlySummaries) {
      summaryMap.set(summary.employeeId.toString(), summary);
    }

    let updatedCount = 0;
    const totalDays = new Date(year, month, 0).getDate();

    for (const entry of entries) {
      const attendanceSummary = summaryMap.get(entry.employeeId.toString());

      if (attendanceSummary) {
        entry.absences = attendanceSummary.absences || 0;
        entry.lateHours = attendanceSummary.lateHours || 0;
        entry.overtimeHours = attendanceSummary.overtimeHours || 0;
        entry.workedDays = totalDays - entry.absences;

        await entry.save();
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Sync attendance data to payroll
   * Endpoint method to re-sync if attendance data is updated
   */
  async syncAttendanceToPayroll(
    periodId: string,
    month: number,
    year: number,
  ): Promise<{
    success: boolean;
    updated: number;
    message: string;
  }> {
    const period = await this.payrollPeriodModel.findById(periodId);

    if (!period) {
      throw new NotFoundException('Payroll period not found');
    }

    if (period.status === 'generated') {
      throw new BadRequestException(
        'Cannot sync attendance for generated payroll',
      );
    }

    const updated = await this.updatePayrollEntriesWithAttendance(
      periodId,
      month,
      year,
    );

    return {
      success: true,
      updated,
      message: `Successfully synced attendance data for ${updated} employees`,
    };
  }
}


// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { PayrollPeriod } from './schemas/payroll-period.schema';
// import { PayrollEntry } from './schemas/payroll-entry.schema';
// import { BadRequestException } from '@nestjs/common';
// import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';
// import { PayrollCalculationService } from './payroll-calculation.service';
// import { Employee } from '../employees/schemas/employee.schema';

// @Injectable()
// export class PayrollService {
//   constructor(
//     @InjectModel(PayrollPeriod.name) private payrollPeriodModel: Model<PayrollPeriod>,
//     @InjectModel(PayrollEntry.name) private payrollEntryModel: Model<PayrollEntry>,
//     @InjectModel(Employee.name) private employeeModel: Model<Employee>,
//     private calculationService: PayrollCalculationService,
//   ) {}

//   async initializePayrollEntries(periodId: string, month: number, year: number): Promise<PayrollEntry[]> {
    
//     const periodObjectId = new Types.ObjectId(periodId);
    
//     // Check if entries already exist - use ObjectId
//     const existing = await this.payrollEntryModel.find({ 
//       payrollPeriodId: periodObjectId 
//     });
    
//     if (existing.length > 0) {
//       return existing;
//     } 
    
//     const employees = await this.employeeModel.find({ 
//       workStatus: 'Active' 
//     }).sort({ firstName: 1 });
    
//     const entries: PayrollEntry[] = [];
//     const totalDays = new Date(year, month, 0).getDate();
//     const offDays = this.countWeekendDays(year, month);
    
//     for (let i = 0; i < employees.length; i++) {
//       const emp = employees[i];
      
//       const entry = new this.payrollEntryModel({
//         payrollPeriodId: periodObjectId,  // Use ObjectId consistently
//         employeeId: emp._id,  // This is already an ObjectId
//         sr: i + 1,
//         staffId: emp.staffId,
//         name: `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.replace(/\s+/g, ' ').trim(),
//         designation: emp.designation || '',
//         department: emp.department || '',
//         month: this.getMonthName(month),
//         year,
//         totalDays,
//         offDays,
//         leaveTaken: 0,
//         workedDays: totalDays,
//         ctc: emp.baseSalary || 0,
//         dailyRate: 0,
//         hourlyRate: 0,
//         offDaysWorked: 0,
//         offDayAmount: 0,
//         holidayWorked: 0,
//         holidayAmount: 0,
//         leaveSalary: 0,
//         cashAdvance: 0,
//         penaltyPoints: 0,
//         total: 0,
//         visaCost: 0,
//         fines: 0,
//         cleaningFees: 0,
//         extraFromManager: 0,
//         backPayment: 0,
//         finalModification: 0,
//         hrNotes: '',
//         absences: 0,
//         unauthorizedAbsences: 0,
//         lateHours: 0,
//         authAbsenceDeduction: 0,
//         unauthAbsenceDeduction: 0,
//         tardiness: 0,
//         allDeductions: 0,
//         overtimeHours: 0,
//         overtimeAmount: 0,
//         netDeductions: 0,
//         januaryNetSalary: 0,
//         targetRate: emp.targetRate || 0,
//         totalJanuarySalary: 0,
//         beforeOT: 0,
//         ot: 0,
//         totalCalculated: 0,
//         dfrnce: 0,
//         deductions: 0,
//         inDays: 0,
//         isCalculated: false,
//         isEditable: true,
//         createdAt: new Date(),
//         updatedAt: new Date()
//       });
      
//       const savedEntry = await entry.save();
//       entries.push(savedEntry);
//     }
    
//     return entries;
//   }

//   // ✅ Add this helper method to the class
//   private countWeekendDays(year: number, month: number): number {
//     const date = new Date(year, month - 1, 1);
//     const daysInMonth = new Date(year, month, 0).getDate();
//     let weekendCount = 0;
    
//     for (let day = 1; day <= daysInMonth; day++) {
//       date.setDate(day);
//       const dayOfWeek = date.getDay();
      
//       if (dayOfWeek === 0 ) {
//         weekendCount++;
//       }
//     }
    
//     return weekendCount;
//   }

//   async findByMonthYear(month: number, year: number): Promise<any> {
//     const period = await this.payrollPeriodModel.findOne({ month, year });
    
//     if (!period) {
//       return null;
//     }
    
//     const entries = await this.payrollEntryModel.find({ 
//       payrollPeriodId: period._id 
//     }).sort({ sr: 1 });
    
//     return {
//       _id: period._id,
//       period,
//       entries
//     };
//   }

//   async updateEntry(entryId: string, dto: UpdatePayrollEntryDto): Promise<PayrollEntry> {
//     if (!entryId || entryId === 'undefined') {
//       throw new BadRequestException('Invalid entry ID');
//     }
    
//     if (!Types.ObjectId.isValid(entryId)) {
//       throw new BadRequestException('Invalid ObjectId format');
//     }
    
//     const entry = await this.payrollEntryModel.findById(entryId);
    
//     if (!entry) {
//       throw new NotFoundException('Payroll entry not found');
//     }
    
//     // ✅ Update fields
//     Object.assign(entry, dto);
    
//     // Recalculate if needed - but NOT for offDays/workedDays updates
//     // Check if this is a manual update of offDays or workedDays
//     const isManualUpdate = Object.keys(dto).length === 1 && 
//                           (dto.hasOwnProperty('offDays') || dto.hasOwnProperty('workedDays'));
    
//     if (!isManualUpdate && (
//         dto.offDaysWorked !== undefined || 
//         dto.holidayWorked !== undefined ||
//         dto.absences !== undefined ||
//         dto.overtimeHours !== undefined)) {
      
//       const plainEntry = entry.toObject();
//       const calculated = this.calculationService.calculateAll(plainEntry as any);
//       Object.assign(entry, calculated);
//     }
    
//     return entry.save();
//   }

//   async calculateEntry(entryId: string): Promise<PayrollEntry> {
//     const entry = await this.payrollEntryModel.findById(entryId);
    
//     if (!entry) {
//       throw new NotFoundException('Payroll entry not found');
//     }
    
//     const plainEntry = entry.toObject();
//     const calculated = this.calculationService.calculateAll(plainEntry as any);
//     Object.assign(entry, calculated);
    
//     return entry.save();
//   }

//   async calculateAllEntries(periodId: string): Promise<PayrollEntry[]> {
//     const entries = await this.payrollEntryModel.find({ payrollPeriodId: periodId });
    
//     for (const entry of entries) {
//       const plainEntry = entry.toObject();
//       const calculated = this.calculationService.calculateAll(plainEntry as any);
//       Object.assign(entry, calculated);
//       await entry.save();
//     }
    
//     await this.payrollPeriodModel.findByIdAndUpdate(periodId, {
//       status: 'calculated',
//       updatedAt: new Date()
//     });
    
//     return this.payrollEntryModel.find({ payrollPeriodId: periodId }).sort({ sr: 1 });
//   }

//   async generatePayroll(periodId: string, userId: string): Promise<any> {
    
//     // Try to find period with both string and ObjectId
//     let period;
//     try {
//       period = await this.payrollPeriodModel.findById(periodId);
//     } catch (err) {
//       console.log('Error finding period by ID, trying with ObjectId conversion');
//       period = await this.payrollPeriodModel.findById(new Types.ObjectId(periodId));
//     }
    
//     if (!period) {
//       throw new NotFoundException('Payroll period not found');
//     }
    
    
//     // If already generated, prevent re-generation
//     if (period.status === 'generated') {
//       throw new BadRequestException('Payroll has already been generated');
//     }
    
//     // Get current entries - try multiple query formats
//     let entries = await this.payrollEntryModel.find({ 
//       payrollPeriodId: period._id 
//     });
    
//     if (entries.length === 0) {
//       // Try with string ID
//       entries = await this.payrollEntryModel.find({ 
//         payrollPeriodId: periodId 
//       });
//     }
    
//     if (entries.length === 0) {
//       // Try with ObjectId
//       try {
//         entries = await this.payrollEntryModel.find({ 
//           payrollPeriodId: new Types.ObjectId(periodId) 
//         });
//       } catch (err) {
//         console.log('Error querying with ObjectId:', err);
//       }
//     }
    
//     if (entries.length === 0) {
//       throw new BadRequestException('No payroll entries found');
//     }
    
//     // Calculate all entries
//     for (const entry of entries) {
//       const plainEntry = entry.toObject();
//       const calculated = this.calculationService.calculateAll(plainEntry as any);
//       Object.assign(entry, calculated);
//       entry.isEditable = false;
//       await entry.save();
//     }
    
//     // Update period status
//     period.status = 'generated';
//     period.updatedBy = new Types.ObjectId(userId);
//     period.updatedAt = new Date();
//     await period.save();
    
//     return {
//       message: 'Payroll generated successfully',
//       periodId: period._id,
//       status: 'generated',
//       entryCount: entries.length
//     };
//   }

//   async deletePayrollPeriod(periodId: string): Promise<void> {
//     await this.payrollEntryModel.deleteMany({ payrollPeriodId: periodId });
//     await this.payrollPeriodModel.findByIdAndDelete(periodId);
//   }

//   async deleteByMonthYear(month: number, year: number): Promise<void> {
//     const period = await this.payrollPeriodModel.findOne({ month, year });
//     if (period) {
//       await this.deletePayrollPeriod(period._id.toString());
//     }
//   }

//   private getMonthName(month: number): string {
//     const months = [
//       'January', 'February', 'March', 'April', 'May', 'June',
//       'July', 'August', 'September', 'October', 'November', 'December'
//     ];
//     return months[month - 1];
//   }

//   // ============= CREATE PERIOD FROM SETTINGS =============
//   async createPeriodFromSettings(dto: any, userId: string): Promise<PayrollPeriod> {
//     // Check if period already exists
//     const existing = await this.payrollPeriodModel.findOne({
//       month: dto.month,
//       year: dto.year
//     });

//     if (existing) {
//       throw new BadRequestException('Payroll period already exists');
//     }

//     // Calculate month name and dates if not provided
//     const monthName = dto.monthName || new Date(2000, dto.month - 1, 1)
//       .toLocaleString('default', { month: 'long' });
    
//     const startDate = dto.startDate || `${dto.year}-${String(dto.month).padStart(2, '0')}-01`;
//     const lastDay = new Date(dto.year, dto.month, 0).getDate();
//     const endDate = dto.endDate || `${dto.year}-${String(dto.month).padStart(2, '0')}-${lastDay}`;

//     const period = new this.payrollPeriodModel({
//       month: dto.month,
//       year: dto.year,
//       monthName,
//       startDate,
//       endDate,
//       status: 'draft',
//       createdInSettings: true,
//       isActive: true,
//       createdBy: userId,
//       createdAt: new Date()
//     });

//     return period.save();
//   }

//   // ============= MODIFY EXISTING getOrCreatePayrollPeriod =============
//   async getOrCreatePayrollPeriod(month: number, year: number, userId: string): Promise<any> {
    
//     // Find the period with exact month and year
//     let period = await this.payrollPeriodModel.findOne({ 
//       month: month, 
//       year: year 
//     });


//     if (!period) {
//       console.log(`❌ No period found for ${month}/${year}`);
//       return { period: null, entries: [] };
//     }
    
//     // Find entries using ObjectId
//     const entries = await this.payrollEntryModel.find({ 
//       payrollPeriodId: period._id 
//     }).sort({ sr: 1 });
    
    
//     // Verify entries match the expected month/year
//     if (entries.length > 0) {
//       const firstEntry = entries[0];
//       if (firstEntry.month !== period.monthName || firstEntry.year !== period.year) {
//         console.error(`❌ Entry month/year mismatch! Period: ${period.monthName} ${period.year}, Entry: ${firstEntry.month} ${firstEntry.year}`);
//         // This indicates corrupted data
//       }
//     }
    
//     // If entries exist, return them
//     if (entries.length > 0) {
//       return { period, entries };
//     }
    
//     // No entries exist - create them
//     const newEntries = await this.initializePayrollEntries(period._id.toString(), month, year);
//     return { period, entries: newEntries };
//   }

//   // ============= GET ONLY SETTINGS-CREATED PERIODS =============
//   async getSettingsPeriods(): Promise<PayrollPeriod[]> {
//     return this.payrollPeriodModel.find({ 
//       createdInSettings: true,
//       isActive: true 
//     }).sort({ year: -1, month: -1 });
//   }

//   // ============= DELETE PERIOD (from Settings) =============
//   async deleteSettingsPeriod(id: string): Promise<void> {
//     const period = await this.payrollPeriodModel.findById(id);
    
//     if (!period) {
//       throw new NotFoundException('Period not found');
//     }
    
//     // Check if this period has generated payroll data
//     const entries = await this.payrollEntryModel.find({ payrollPeriodId: id });
    
//     if (entries.length > 0 && period.status === 'generated') {
//       throw new BadRequestException('Cannot delete a period with generated payroll data');
//     }
    
//     // Soft delete or hard delete?
//     await this.payrollPeriodModel.findByIdAndDelete(id);
//     await this.payrollEntryModel.deleteMany({ payrollPeriodId: id });
//   }

//   async createEntry(dto: any, userId: string): Promise<PayrollEntry> {
//     // Remove any temporary id if present
//     const { id, ...entryData } = dto;
    
//     // Ensure employeeId is ObjectId if it exists
//     if (entryData.employeeId) {
//       entryData.employeeId = new Types.ObjectId(entryData.employeeId);
//     }
    
//     // Ensure payrollPeriodId is ObjectId
//     if (entryData.payrollPeriodId) {
//       entryData.payrollPeriodId = new Types.ObjectId(entryData.payrollPeriodId);
//     }
    
//     const entry = new this.payrollEntryModel({
//       ...entryData,
//       createdBy: new Types.ObjectId(userId),
//       createdAt: new Date(),
//       updatedAt: new Date()
//     });
    
//     return entry.save();
//   }

//   async getEntriesByPeriod(periodId: string): Promise<any[]> {
//     console.log('🔍 Backend: Fetching entries for period:', periodId);
    
//     let periodObjectId: Types.ObjectId;
    
//     // Convert to ObjectId
//     try {
//       periodObjectId = new Types.ObjectId(periodId);
//     } catch (error) {
//       console.error('❌ Invalid period ID format:', periodId);
//       return [];
//     }
    
//     // ⭐ KEY FIX: Use .lean() to get plain JavaScript objects
//     const entries = await this.payrollEntryModel
//       .find({ payrollPeriodId: periodObjectId })
//       .sort({ sr: 1 })
//       .lean() // This converts Mongoose documents to plain JS objects
//       .exec();
    
//     console.log(`✅ Backend: Found ${entries.length} entries`);
    
//     // ⭐ Convert all ObjectIds to strings BEFORE sending to frontend
//     const plainEntries = entries.map(entry => ({
//       ...entry,
//       _id: entry._id.toString(),
//       employeeId: entry.employeeId?.toString() || null, // CRITICAL: Convert to string
//       payrollPeriodId: entry.payrollPeriodId?.toString() || null,
//     }));
    
//     console.log('📤 Backend: First entry being sent:', {
//       name: plainEntries[0]?.name,
//       employeeId: plainEntries[0]?.employeeId,
//       employeeIdType: typeof plainEntries[0]?.employeeId
//     });
    
//     return plainEntries;
//   }

//   async getAllPayrolls(filters?: { 
//     year?: number; 
//     month?: number; 
//     isGenerated?: boolean;
//   }): Promise<PayrollPeriod[]> {
//     const query: any = {};
    
//     if (filters?.year) {
//       query.year = filters.year;
//     }
    
//     if (filters?.month) {
//       query.month = filters.month;
//     }
    
//     if (filters?.isGenerated !== undefined) {
//       query.status = filters.isGenerated ? 'generated' : { $ne: 'generated' };
//     }
    
//     return this.payrollPeriodModel.find(query)
//       .sort({ year: -1, month: -1 })
//       .exec();
//   }
// }