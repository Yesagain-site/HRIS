import { Injectable } from '@nestjs/common';
import { PayrollCalculationData } from './interfaces/payroll-calculation.interface';

@Injectable()
export class PayrollCalculationService {
  
  calculateDailyRate(ctc: number): number {
    return Number((ctc / 30).toFixed(2));
  }
  
  calculateHourlyRate(dailyRate: number): number {
    return Number((dailyRate / 10).toFixed(2));
  }
  
  calculateOffDayAmount(offDaysWorked: number, dailyRate: number): number {
    return Number((1.5 * offDaysWorked * dailyRate).toFixed(2));
  }
  
  calculateHolidayAmount(holidayWorked: number, dailyRate: number): number {
    return Number((2 * holidayWorked * dailyRate).toFixed(2));
  }
  
  calculateBasicSalary(ctc: number, totalDays: number, workedDays: number): number {
    if (totalDays === 0) return 0;
    // Basic Salary = (CTC ÷ Total Days) × Worked Days
    return Number(((ctc / totalDays) * workedDays).toFixed(2));
  }
  
  calculateTotal(
    basicSalary: number,
    leaveSalary: number,
    cashAdvance: number,
    offDayAmount: number,
    holidayAmount: number
  ): number {
    // TOTAL = Basic Salary + Leave Salary - Cash Advance + Off Day Amount + Official Holiday
    return Number((basicSalary + leaveSalary - cashAdvance + offDayAmount + holidayAmount).toFixed(2));
  }
  
  calculateAuthorisedAbsenceDeduction(absences: number, dailyRate: number): number {
    return Number((absences * dailyRate).toFixed(2));
  }
  
  calculateUnauthorisedAbsenceDeduction(unauthorizedAbsences: number, dailyRate: number): number {
    return Number((unauthorizedAbsences * dailyRate).toFixed(2));
  }
  
  calculateTardiness(hourlyRate: number, lateHours: number): number {
    return Number((hourlyRate * lateHours).toFixed(2));
  }
  
  calculateAllDeductions(
    visaCost: number,
    authDeduction: number,
    unauthDeduction: number,
    tardiness: number,
    fines: number,
    cleaningFees: number
  ): number {
    return Number((visaCost + authDeduction + unauthDeduction + tardiness + fines + cleaningFees).toFixed(2));
  }
  
  calculateOvertimeAmount(overtimeHours: number, hourlyRate: number): number {
    return Number((overtimeHours * hourlyRate * 1).toFixed(2));
  }
  
  calculateNetDeductions(overtimeAmount: number, allDeductions: number): number {
    return Number((overtimeAmount - allDeductions).toFixed(2));
  }
  
  calculateJanuaryNetSalary(total: number, netDeductions: number, extraFromManager: number): number {
    return Number((total + netDeductions + extraFromManager).toFixed(2));
  }
  
  calculateTotalJanuarySalary(januaryNetSalary: number, backPayment: number): number {
    return Number((januaryNetSalary + backPayment).toFixed(2));
  }
  
  calculateBeforeOT(totalJanuarySalary: number, overtimeAmount: number, extraFromManager: number): number {
    return Number((totalJanuarySalary - overtimeAmount - extraFromManager).toFixed(2));
  }
  
  calculateOT(overtimeAmount: number, extraFromManager: number): number {
    return Number((overtimeAmount + extraFromManager).toFixed(2));
  }
  
  calculateTotalWithOT(beforeOT: number, ot: number): number {
    return Number((beforeOT + ot).toFixed(2));
  }
  
  calculateDFRNCE(totalJanuarySalary: number, totalWithOT: number): number {
    return Number((totalJanuarySalary - totalWithOT).toFixed(2));
  }
  
  calculateDeductions(allDeductions: number, cashAdvance: number): number {
    return Number((allDeductions + cashAdvance).toFixed(2));
  }
  
  calculateInDays(deductions: number, dailyRate: number): number {
    if (dailyRate === 0) return 0;
    return Number((deductions / dailyRate).toFixed(2));
  }
  
  calculateAll(entry: PayrollCalculationData): PayrollCalculationData {
    // Ensure we have valid numbers
    const ctc = Number(entry.ctc) || 0;
    const totalDays = Number(entry.totalDays) || 30;
    const workedDays = Number(entry.workedDays) || 0;
    
    // Calculate base rates
    const dailyRate = this.calculateDailyRate(ctc);
    const hourlyRate = this.calculateHourlyRate(dailyRate);
    
    // Calculate special day amounts
    const offDaysWorked = Number(entry.offDaysWorked) || 0;
    const holidayWorked = Number(entry.holidayWorked) || 0;
    const offDayAmount = this.calculateOffDayAmount(offDaysWorked, dailyRate);
    const holidayAmount = this.calculateHolidayAmount(holidayWorked, dailyRate);
    
    // Calculate basic salary - (CTC ÷ Total Days) × Worked Days
    const basicSalary = this.calculateBasicSalary(ctc, totalDays, workedDays);
    
    // Get other values with defaults
    const leaveSalary = Number(entry.leaveSalary) || 0;
    const cashAdvance = Number(entry.cashAdvance) || 0;
    
    // Calculate total - EXACT EXCEL FORMULA: =J3/F3*I3+Q3-R3+M3+O3
    const total = this.calculateTotal(
      basicSalary,
      leaveSalary,
      cashAdvance,
      offDayAmount,
      holidayAmount
    );
    
    // Deductions
    const absences = Number(entry.absences) || 0;
    const unauthorizedAbsences = Number(entry.unauthorizedAbsences) || 0;
    const lateHours = Number(entry.lateHours) || 0;
    const visaCost = Number(entry.visaCost) || 0;
    const fines = Number(entry.fines) || 0;
    const cleaningFees = Number(entry.cleaningFees) || 0;
    
    const authDeduction = this.calculateAuthorisedAbsenceDeduction(absences, dailyRate);
    const unauthDeduction = this.calculateUnauthorisedAbsenceDeduction(unauthorizedAbsences, dailyRate);
    const tardiness = this.calculateTardiness(hourlyRate, lateHours);
    
    const allDeductions = this.calculateAllDeductions(
      visaCost,
      authDeduction,
      unauthDeduction,
      tardiness,
      fines,
      cleaningFees
    );
    
    // Overtime
    const overtimeHours = Number(entry.overtimeHours) || 0;
    const overtimeAmount = this.calculateOvertimeAmount(overtimeHours, hourlyRate);
    const netDeductions = this.calculateNetDeductions(overtimeAmount, allDeductions);
    
    // Net salary calculations
    const extraFromManager = Number(entry.extraFromManager) || 0;
    const januaryNetSalary = this.calculateJanuaryNetSalary(total, netDeductions, extraFromManager);
    
    const backPayment = Number(entry.backPayment) || 0;
    const totalJanuarySalary = this.calculateTotalJanuarySalary(januaryNetSalary, backPayment);
    
    // Final calculations
    const beforeOT = this.calculateBeforeOT(totalJanuarySalary, overtimeAmount, extraFromManager);
    const ot = this.calculateOT(overtimeAmount, extraFromManager);
    const totalWithOT = this.calculateTotalWithOT(beforeOT, ot);
    const dfrnce = this.calculateDFRNCE(totalJanuarySalary, totalWithOT);
    const deductions = this.calculateDeductions(allDeductions, cashAdvance);
    const inDays = this.calculateInDays(deductions, dailyRate);
    
    return {
      ...entry,
      dailyRate,
      hourlyRate,
      offDayAmount,
      holidayAmount,
      total,
      authAbsenceDeduction: authDeduction,
      unauthAbsenceDeduction: unauthDeduction,
      tardiness,
      allDeductions,
      overtimeAmount,
      netDeductions,
      januaryNetSalary,
      totalJanuarySalary,
      beforeOT,
      ot,
      totalCalculated: totalWithOT,
      dfrnce,
      deductions,
      inDays,
      isCalculated: true
    };
  }
}