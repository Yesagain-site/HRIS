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

  async initializePayrollEntries(
    periodId: string,
    month: number,
    year: number,
  ): Promise<PayrollEntry[]> {
    // Keep existing implementation
    const periodObjectId = new Types.ObjectId(periodId);

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

    const monthlySummaries = await this.attendanceModel.find({
      recordType: 'monthly_summary',
      month: month,
      year: year,
    });

    const summaryMap = new Map();
    for (const summary of monthlySummaries) {
      const empId = summary.employeeId.toString();
      summaryMap.set(empId, summary);
    }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empIdStr = emp._id.toString();
      const attendanceSummary = summaryMap.get(empIdStr);

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
        workedDays: totalDays,
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
        absences: absences,
        unauthorizedAbsences: 0,
        lateHours: lateHours,
        authAbsenceDeduction: 0,
        unauthAbsenceDeduction: 0,
        tardiness: 0,
        allDeductions: 0,
        overtimeHours: overtimeHours,
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
   * Update a single payroll entry - PERMANENT FIX with TypeScript fixes
   */
  async updateEntry(
    entryId: string,
    dto: UpdatePayrollEntryDto,
  ): Promise<PayrollEntry> {
    console.log('🔵 UPDATE ENTRY CALLED:', { entryId, dto });

    // ═══════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════
    if (!entryId || entryId === 'undefined') {
      throw new BadRequestException('Invalid entry ID');
    }

    if (!Types.ObjectId.isValid(entryId)) {
      throw new BadRequestException('Invalid ObjectId format');
    }

    // Fetch the entry
    const entry = await this.payrollEntryModel.findById(entryId);
    
    if (!entry) {
      throw new NotFoundException('Payroll entry not found');
    }

    // Check if period is generated (read-only)
    const period = await this.payrollPeriodModel.findById(entry.payrollPeriodId);
    if (period && period.status === 'generated') {
      throw new BadRequestException('Cannot update generated payroll');
    }

    console.log('📦 Before update:', {
      leaveSalary: entry.leaveSalary,
      cashAdvance: entry.cashAdvance,
      visaCost: entry.visaCost,
      absences: entry.absences,
      authAbsenceDeduction: entry.authAbsenceDeduction
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Apply ALL fields from DTO directly to entry
    // ═══════════════════════════════════════════════════════════════
    // These are MANUAL INPUT fields that user edited - apply them directly
    // CRITICAL: This includes zero values! If user sets a field to 0, it means DELETE
    
    Object.keys(dto).forEach(key => {
      (entry as any)[key] = (dto as any)[key];
      console.log(`✏️ Applied manual edit: ${key} = ${(dto as any)[key]}`);
    });

    console.log('📝 After applying user changes:', {
      leaveSalary: entry.leaveSalary,
      cashAdvance: entry.cashAdvance,
      visaCost: entry.visaCost,
      absences: entry.absences
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Recalculate COMPUTED fields only
    // ═══════════════════════════════════════════════════════════════
    // Manual input fields (that user can edit directly):
    const manualFields = new Set([
      'offDaysWorked',
      'holidayWorked',
      'leaveSalary',
      'cashAdvance',
      'penaltyPoints',
      'visaCost',
      'fines',
      'cleaningFees',
      'absences',
      'unauthorizedAbsences',
      'lateHours',
      'overtimeHours',
      'extraFromManager',
      'backPayment',
      'finalModification',
      'hrNotes',
      'workedDays',
      'leaveTaken'
    ]);

    // Get current entry as plain object for calculation
    const plainEntry = entry.toObject();
    
    // Calculate all fields
    const calculated = this.calculationService.calculateAll(plainEntry as any);
    
    console.log('🧮 Calculated values:', {
      authAbsenceDeduction: (calculated as any).authAbsenceDeduction,
      allDeductions: (calculated as any).allDeductions,
      januaryNetSalary: (calculated as any).januaryNetSalary
    });
    
    // Apply ONLY calculated fields (not manual fields)
    Object.keys(calculated).forEach(key => {
      // Skip manual input fields - NEVER overwrite them from calculations
      if (manualFields.has(key)) {
        console.log(`🛡️ Skipping manual field: ${key} (preserving user input)`);
        return;
      }
      
      // Skip fields that were explicitly set in the DTO (user just edited them)
      if (dto.hasOwnProperty(key)) {
        console.log(`🛡️ Skipping DTO field: ${key} (preserving user input)`);
        return;
      }
      
      // Apply calculated value
      const calculatedValue = (calculated as any)[key];
      (entry as any)[key] = calculatedValue;
      console.log(`🧮 Applied calculated: ${key} = ${calculatedValue}`);
    });

    console.log('🧮 After calculation:', {
      leaveSalary: entry.leaveSalary,
      cashAdvance: entry.cashAdvance,
      authAbsenceDeduction: entry.authAbsenceDeduction,
      allDeductions: entry.allDeductions,
      januaryNetSalary: entry.januaryNetSalary
    });

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Save to database
    // ═══════════════════════════════════════════════════════════════
    entry.isCalculated = true;
    // NOTE: updatedAt is automatically handled by Mongoose timestamps: true
    // Do NOT manually set entry.updatedAt = new Date()
    
    const savedEntry = await entry.save();
    console.log('✅ Saved to database:', {
      id: savedEntry._id,
      leaveSalary: savedEntry.leaveSalary,
      cashAdvance: savedEntry.cashAdvance,
      visaCost: savedEntry.visaCost,
      authAbsenceDeduction: savedEntry.authAbsenceDeduction,
      januaryNetSalary: savedEntry.januaryNetSalary
    });

    return savedEntry;
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

  /**
 * ONE-TIME FIX: Update all payroll entries with attendance data from Excel
 * This will directly update the absences, lateHours, and overtimeHours
  */
  async fixUpdateFromExcel(month: number, year: number): Promise<any> {
    console.log(`🔧 FIX: Updating payroll entries with Excel attendance data for ${month}/${year}`);
    
    // Find the payroll period
    const period = await this.payrollPeriodModel.findOne({ month, year });
    
    if (!period) {
      throw new NotFoundException(`No payroll period found for ${month}/${year}`);
    }
    
    // Get all entries for this period
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: period._id
    });
    
    console.log(`📊 Found ${entries.length} payroll entries to update`);
    
    // Get all attendance summaries for this month/year
    const summaries = await this.attendanceModel.find({
      recordType: 'monthly_summary',
      month,
      year
    });
    
    console.log(`📊 Found ${summaries.length} attendance summaries from database`);
    
    // Create a map for quick lookup
    const summaryMap = new Map();
    summaries.forEach(s => {
      const empId = s.employeeId.toString();
      summaryMap.set(empId, s);
      console.log(`📌 Summary for ${s.staffId} (${s.employeeName}): absences=${s.absences}, lateHours=${s.lateHours}, overtime=${s.overtimeHours}`);
    });
    
    // Track updates
    let updatedCount = 0;
    let notFoundCount = 0;
    const updates: any[] = [];
    
    const totalDays = new Date(year, month, 0).getDate();
    
    for (const entry of entries) {
      const empIdStr = entry.employeeId?.toString();
      const summary = summaryMap.get(empIdStr);
      
      if (summary) {
        // Store old values for logging
        const oldAbsences = entry.absences;
        const oldLateHours = entry.lateHours;
        const oldOvertimeHours = entry.overtimeHours;
        
        console.log(`✅ Updating ${entry.name} (${entry.staffId}):`);
        console.log(`   - absences: ${oldAbsences} → ${summary.absences}`);
        console.log(`   - lateHours: ${oldLateHours} → ${summary.lateHours}`);
        console.log(`   - overtimeHours: ${oldOvertimeHours} → ${summary.overtimeHours}`);
        
        // Update the entry
        entry.absences = summary.absences || 0;
        entry.lateHours = summary.lateHours || 0;
        entry.overtimeHours = summary.overtimeHours || 0;
        entry.workedDays = totalDays - entry.absences;
        
        // Save the entry
        await entry.save();
        updatedCount++;
        
        updates.push({
          staffId: entry.staffId,
          name: entry.name,
          old: {
            absences: oldAbsences,
            lateHours: oldLateHours,
            overtimeHours: oldOvertimeHours
          },
          new: {
            absences: entry.absences,
            lateHours: entry.lateHours,
            overtimeHours: entry.overtimeHours
          }
        });
      } else {
        console.log(`❌ No attendance found for ${entry.name} (${entry.staffId})`);
        notFoundCount++;
      }
    }
    
    console.log(`✅ Fix complete: Updated ${updatedCount} entries, ${notFoundCount} entries had no attendance data`);
    
    return {
      success: true,
      message: `Updated ${updatedCount} of ${entries.length} payroll entries with attendance data`,
      periodId: period._id,
      month,
      year,
      updatedCount,
      notFoundCount,
      totalEntries: entries.length,
      updates: updates.slice(0, 10) // Show first 10 updates as sample
    };
  }

  /**
   * DEBUG: Check payroll entries vs attendance data
   */
  async debugCheckData(month: number, year: number): Promise<any> {
    console.log(`🔍 DEBUG: Checking data for ${month}/${year}`);
    
    // Find the payroll period
    const period = await this.payrollPeriodModel.findOne({ month, year });
    
    if (!period) {
      return { error: 'No payroll period found' };
    }
    
    // Get payroll entries
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: period._id
    });
    
    // Get attendance summaries
    const summaries = await this.attendanceModel.find({
      recordType: 'monthly_summary',
      month,
      year
    });
    
    // Create a map of attendance by employeeId
    const summaryMap = new Map();
    summaries.forEach(s => {
      summaryMap.set(s.employeeId.toString(), s);
    });
    
    // Compare each entry
    const comparisons: any[] = [];
    let mismatches = 0;
    
    for (const entry of entries) {
      const summary = summaryMap.get(entry.employeeId.toString());
      
      if (summary) {
        const absenceMatch = entry.absences === (summary.absences || 0);
        const lateMatch = entry.lateHours === (summary.lateHours || 0);
        const overtimeMatch = entry.overtimeHours === (summary.overtimeHours || 0);
        
        if (!absenceMatch || !lateMatch || !overtimeMatch) {
          mismatches++;
          comparisons.push({
            staffId: entry.staffId,
            name: entry.name,
            payroll: {
              absences: entry.absences,
              lateHours: entry.lateHours,
              overtimeHours: entry.overtimeHours
            },
            attendance: {
              absences: summary.absences || 0,
              lateHours: summary.lateHours || 0,
              overtimeHours: summary.overtimeHours || 0
            },
            needsUpdate: true
          });
        }
      }
    }
    
    return {
      period: {
        month,
        year,
        periodId: period._id,
        status: period.status
      },
      payrollEntries: entries.length,
      attendanceSummaries: summaries.length,
      mismatches,
      sample: comparisons.slice(0, 20) // Show first 20 mismatches
    };
  }

  async fixSyncAllEntries(month: number, year: number): Promise<any> {
    console.log(`🔧 FIX: Syncing all payroll entries for ${month}/${year}`);
    
    // Find the payroll period
    const period = await this.payrollPeriodModel.findOne({ month, year });
    
    if (!period) {
      throw new NotFoundException(`No payroll period found for ${month}/${year}`);
    }
    
    // Get all entries for this period
    const entries = await this.payrollEntryModel.find({
      payrollPeriodId: period._id
    });
    
    console.log(`📊 Found ${entries.length} payroll entries to sync`);
    
    let updatedCount = 0;
    // Define the type for updates array
    const updates: Array<{
      staffId: string;
      name: string;
      absences: number;
      lateHours: number;
      visaCost: number;
      total: number;
    }> = [];
    
    for (const entry of entries) {
      console.log(`\n🔄 Processing ${entry.name} (${entry.staffId}):`);
      console.log(`   Before - absences: ${entry.absences}, lateHours: ${entry.lateHours}, visaCost: ${entry.visaCost}`);
      
      // Calculate all fields based on current values
      const plainEntry = entry.toObject();
      const calculated = this.calculationService.calculateAll(plainEntry as any);
      
      // Update the entry with calculated values
      Object.assign(entry, calculated);
      
      console.log(`   After  - absences: ${entry.absences}, lateHours: ${entry.lateHours}, visaCost: ${entry.visaCost}`);
      
      await entry.save();
      updatedCount++;
      
      updates.push({
        staffId: entry.staffId,
        name: entry.name,
        absences: entry.absences,
        lateHours: entry.lateHours,
        visaCost: entry.visaCost,
        total: entry.total
      });
    }
    
    return {
      success: true,
      message: `Synced ${updatedCount} payroll entries`,
      periodId: period._id,
      month,
      year,
      updatedCount,
      sample: updates.slice(0, 5)
    };
  } 
}