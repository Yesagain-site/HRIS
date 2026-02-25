import React, { useState, useMemo, useRef } from 'react';
import { Button } from './UI';
import { CheckIcon } from './Icons';
import * as XLSX from 'xlsx';

interface PayrollEntry {
  id: string;
  sr: number;
  name: string;
  designation: string;
  department: string;
  month: string;
  year: number;
  totalDays: number;
  offDays: number;
  leaveTaken: number;
  workedDays: number;
  ctc: number;
  dailyRate: number;
  hourlyRate: number;
  offDaysWorked: number;
  offDayAmount: number;
  holidayWorked: number;
  holidayAmount: number;
  leaveSalary: number;
  cashAdvance: number;
  penaltyPoints: number;
  total: number;
  visaCost: number;
  absences: number;
  unauthorizedAbsences: number;
  lateHours: number;
  authAbsenceDeduction: number;
  unauthAbsenceDeduction: number;
  tardiness: number;
  fines: number;
  cleaningFees: number;
  allDeductions: number;
  overtimeHours: number;
  overtimeAmount: number;
  netDeductions: number;
  extraFromManager: number;
  januaryNetSalary: number;
  targetRate: number;
  backPayment: number;
  totalJanuarySalary: number;
  finalModification: number;
  hrNotes: string;
  beforeOT: number;
  ot: number;
  totalCalculated: number;
  dfrnce: number;
  deductions: number;
  inDays: number;
  isCalculated: boolean;
  isEditable: boolean;
  status?: 'draft' | 'calculated' | 'generated';
}

interface PayrollTableProps {
  entries: PayrollEntry[];
  onUpdateCell: (entryId: string, field: string, value: any) => void;
  onSave: () => void;
  isSaving: boolean;
  month: number;
  year: number;
  periodStatus?: 'draft' | 'calculated' | 'generated';
  onRowClick?: (entry: PayrollEntry) => void;
}

const PayrollTable: React.FC<PayrollTableProps> = ({
  entries,
  onUpdateCell,
  onSave,
  isSaving,
  month,
  year,
  periodStatus = 'draft',
  onRowClick
}) => {

  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [hoveredCell, setHoveredCell] = useState<{ entryId: string; field: string } | null>(null);
  
  // Track clicks and double clicks
  const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDoubleClick, setIsDoubleClick] = useState(false);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Determine if table is editable based on period status
  const isTableEditable = periodStatus !== 'generated';
  
  // Get status badge - MUCH DARKER
  const getStatusBadge = () => {
    switch(periodStatus) {
      case 'generated':
        return <span className="bg-green-100 text-green-900 px-3 py-1 rounded-full text-xs font-bold">✓ Generated</span>;
      case 'calculated':
        return <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">⟲ Calculated</span>;
      default:
        return <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">📝 Draft</span>;
    }
  };
  
  // Soft pastel color palette for groups
  const columns = [
    // Employee Info
    { key: 'sr', label: 'SR', width: 50, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
    { key: 'name', label: 'Name', width: 200, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
    { key: 'designation', label: 'Designation', width: 200, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
    { key: 'department', label: 'Department', width: 150, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
    
    // Month Info
    { key: 'month', label: 'Month', width: 100, editable: false, group: 'MONTH', groupColor: 'bg-teal-50/60' },
    { key: 'year', label: 'Year', width: 80, editable: false, group: 'MONTH', groupColor: 'bg-teal-50/60' },
    { key: 'totalDays', label: 'Total Days', width: 120, editable: false, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
    { key: 'offDays', label: 'Off Days', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
    { key: 'leaveTaken', label: 'Leave', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
    { key: 'workedDays', label: 'Worked Days', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
    
    // Salary & Rates
    { key: 'ctc', label: 'CTC', width: 130, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
    { key: 'dailyRate', label: 'Daily Rate', width: 120, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
    { key: 'hourlyRate', label: 'Hourly Rate', width: 120, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
    
    // Special Days
    { key: 'offDaysWorked', label: 'Off Days Worked', width: 160, editable: true, group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
    { key: 'offDayAmount', label: 'Off Day Amount', width: 150, editable: false, format: 'currency', group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
    { key: 'holidayWorked', label: 'Holiday Worked', width: 160, editable: true, group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
    { key: 'holidayAmount', label: 'Holiday Amount', width: 150, editable: false, format: 'currency', group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
    
    // Earnings
    { key: 'leaveSalary', label: 'Leave Salary', width: 140, editable: true, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
    { key: 'cashAdvance', label: 'Cash Advance', width: 140, editable: true, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
    { key: 'penaltyPoints', label: 'Penalty', width: 120, editable: true, group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
    { key: 'total', label: 'TOTAL', width: 140, editable: false, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
    
    // Deductions
    { key: 'visaCost', label: 'Visa Cost', width: 120, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'fines', label: 'Fines', width: 120, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'cleaningFees', label: 'Cleaning Fees', width: 150, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'absences', label: 'Absences', width: 100, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'unauthorizedAbsences', label: 'Unauth Absences', width: 160, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'lateHours', label: 'Late Hours', width: 120, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'authAbsenceDeduction', label: 'Auth Deduction', width: 140, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'unauthAbsenceDeduction', label: 'Unauth Deduction', width: 150, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'tardiness', label: 'Tardiness', width: 120, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    { key: 'allDeductions', label: 'Total Deductions', width: 150, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    
    // Overtime
    { key: 'overtimeHours', label: 'OT Hours', width: 120, editable: true, group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
    { key: 'overtimeAmount', label: 'OT Amount', width: 140, editable: false, format: 'currency', group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
    { key: 'netDeductions', label: 'Net Deductions', width: 140, editable: false, format: 'currency', group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
    
    // Additional
    { key: 'extraFromManager', label: 'Manager Extra', width: 140, editable: true, format: 'currency', group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
    { key: 'backPayment', label: 'Back Payment', width: 140, editable: true, format: 'currency', group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
    { key: 'finalModification', label: 'Final Salary Mod', width: 140, editable: true, group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
    { key: 'hrNotes', label: "HR / Shamso's Notes", width: 200, editable: true, group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
    
    // Net Salary
    { key: 'januaryNetSalary', label: 'Net Salary', width: 140, editable: false, format: 'currency', group: 'NET', groupColor: 'bg-sky-50/60' },
    { key: 'targetRate', label: 'Target %', width: 100, editable: false, group: 'NET', groupColor: 'bg-sky-50/60' },
    { key: 'totalJanuarySalary', label: 'Total Salary', width: 140, editable: false, format: 'currency', group: 'NET', groupColor: 'bg-sky-50/60' },
    
    // Final
    { key: 'beforeOT', label: 'Before OT', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
    { key: 'ot', label: 'OT', width: 100, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
    { key: 'totalCalculated', label: 'Total Calc', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
    { key: 'dfrnce', label: 'Difference', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
    { key: 'deductions', label: 'Deductions', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
    { key: 'inDays', label: 'In Days', width: 100, editable: false, group: 'FINAL', groupColor: 'bg-slate-100/80' }
  ];

  // MUCH DARKER group header colors
  const columnGroups = [
    { name: 'EMPLOYEE', start: 0, end: 3, color: 'bg-blue-200 text-blue-900 border-blue-300 font-bold' },
    { name: 'MONTH', start: 4, end: 5, color: 'bg-teal-200 text-teal-900 border-teal-300 font-bold' },
    { name: 'ATTENDANCE', start: 6, end: 9, color: 'bg-amber-200 text-amber-900 border-amber-300 font-bold' },
    { name: 'SALARY', start: 10, end: 12, color: 'bg-purple-200 text-purple-900 border-purple-300 font-bold' },
    { name: 'SPECIAL', start: 13, end: 16, color: 'bg-orange-200 text-orange-900 border-orange-300 font-bold' },
    { name: 'EARNINGS', start: 17, end: 20, color: 'bg-emerald-200 text-emerald-900 border-emerald-300 font-bold' },
    { name: 'DEDUCTIONS', start: 21, end: 30, color: 'bg-rose-200 text-rose-900 border-rose-300 font-bold' },
    { name: 'OVERTIME', start: 31, end: 33, color: 'bg-cyan-200 text-cyan-900 border-cyan-300 font-bold' },
    { name: 'ADDITIONAL', start: 34, end: 37, color: 'bg-indigo-200 text-indigo-900 border-indigo-300 font-bold' },
    { name: 'NET', start: 38, end: 40, color: 'bg-sky-200 text-sky-900 border-sky-300 font-bold' },
    { name: 'FINAL', start: 41, end: 46, color: 'bg-slate-300 text-slate-900 border-slate-400 font-bold' }
  ];

  // Updated formatValue to remove .00 and show whole numbers
  const formatValue = (value: any, format?: string, field?: string) => {
    if (value === null || value === undefined || value === '') return '';
    
    if (field === 'workedDays' && value === 0) return '';
    if ((field === 'leaveTaken' || field === 'absences') && value === 0) return '';
    
    const num = Number(value);
    if (isNaN(num)) return value;
    
    // Return empty string for zero values
    if (num === 0) return '';
    
    if (format === 'currency') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'AED',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
    }
    
    // Check if the number is an integer (no decimal part)
    if (Number.isInteger(num)) {
      return num.toString(); // Return as whole number without decimals
    }
    
    // For non-integers, show up to 2 decimal places but remove trailing zeros
    return num.toFixed(2).replace(/\.?0+$/, '');
  };

  const handleCellClick = (entryId: string, field: string, currentValue: any, editable: boolean) => {
    if (!editable || !isTableEditable) return;
    
    // Also check the specific entry's isEditable flag
    const entry = entries.find(e => e.id === entryId);
    if (!entry?.isEditable) return;
    
    setEditingCell({ entryId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellSave = () => {
    if (editingCell) {
      const numValue = parseFloat(editValue);
      onUpdateCell(editingCell.entryId, editingCell.field, isNaN(numValue) ? editValue : numValue);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent default form submission behavior
      e.stopPropagation();
      handleCellSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const toggleColumn = (key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleRowClick = (entry: PayrollEntry, event: React.MouseEvent) => {
    console.log('🔵 ROW CLICKED - Entry:', entry.name);
    
    // CRITICAL: Always check if clicking on input first
    if (event.target instanceof HTMLInputElement) {
      console.log('⛔ Clicked on input, preventing navigation');
      event.stopPropagation();
      return;
    }

    // Check if clicking on editable cell
    const target = event.target as HTMLElement;
    const td = target.closest('td');
    if (td) {
      const field = td.getAttribute('data-field');
      const column = columns.find(c => c.key === field);
      
      // If this is an editable column and table is editable, let cell handle it
      if (column?.editable && isTableEditable) {
        console.log('⛔ Clicked on editable cell, preventing navigation');
        return; // Don't navigate
      }
    }
    
    // CRITICAL: Reset double-click flag immediately
    if (isDoubleClick) {
      console.log('⛔ Double click detected, resetting flag');
      setIsDoubleClick(false);
    }
    
    // Clear any pending timers
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current);
      doubleClickTimerRef.current = null;
    }
    
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    console.log('✅ Proceeding with navigation for:', entry.name);
    onRowClick?.(entry);
  };

  const handleCellDoubleClick = (
    entryId: string, 
    field: string, 
    value: any, 
    isFieldEditable: boolean,
    entry: PayrollEntry
  ) => {
    if (!isFieldEditable) return;
    
    console.log('🖱️ DOUBLE CLICK on cell - starting edit');
    
    // CRITICAL: Set flag BEFORE anything else
    setIsDoubleClick(true);
    
    // Clear any existing timers
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    if (doubleClickTimerRef.current) {
      clearTimeout(doubleClickTimerRef.current);
    }
    
    // Reset flag after a delay
    doubleClickTimerRef.current = setTimeout(() => {
      console.log('⏰ Resetting double-click flag');
      setIsDoubleClick(false);
    }, 300); // Reduced to 300ms for faster reset
    
    // Handle cell edit
    handleCellClick(entryId, field, value, true);
  };

  const handleCellMouseEnter = (entryId: string, field: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCell({ entryId, field });
    }, 2000); // 2 second delay
  };

  const handleCellMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    setHoveredCell(null);
  };

  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc.totalEmployees++;
      acc.totalCTC += entry.ctc || 0;
      acc.totalWorkedDays += entry.workedDays || 0;
      acc.totalLeave += entry.leaveTaken || 0;
      acc.totalAbsences += entry.absences || 0;
      acc.totalOvertimeHours += entry.overtimeHours || 0;
      acc.totalEarnings += entry.total || 0;
      acc.totalDeductions += entry.allDeductions || 0;
      acc.totalNetSalary += entry.januaryNetSalary || 0;
      acc.totalJanuarySalary += entry.totalJanuarySalary || 0;
      acc.totalDfrnce += entry.dfrnce || 0;
      
      acc.totalOffDaysWorked += entry.offDaysWorked || 0;
      acc.totalOffDayAmount += entry.offDayAmount || 0;
      acc.totalHolidayWorked += entry.holidayWorked || 0;
      acc.totalHolidayAmount += entry.holidayAmount || 0;
      acc.totalLeaveSalary += entry.leaveSalary || 0;
      acc.totalCashAdvance += entry.cashAdvance || 0;
      acc.totalPenaltyPoints += entry.penaltyPoints || 0;
      acc.totalVisaCost += entry.visaCost || 0;
      acc.totalFines += entry.fines || 0;
      acc.totalCleaningFees += entry.cleaningFees || 0;
      acc.totalUnauthorizedAbsences += entry.unauthorizedAbsences || 0;
      acc.totalLateHours += entry.lateHours || 0;
      acc.totalAuthDeduction += entry.authAbsenceDeduction || 0;
      acc.totalUnauthDeduction += entry.unauthAbsenceDeduction || 0;
      acc.totalTardiness += entry.tardiness || 0;
      acc.totalOvertimeAmount += entry.overtimeAmount || 0;
      acc.totalNetDeductions += entry.netDeductions || 0;
      acc.totalExtraFromManager += entry.extraFromManager || 0;
      acc.totalBackPayment += entry.backPayment || 0;
      acc.totalFinalModification += entry.finalModification || 0;
      acc.totalBeforeOT += entry.beforeOT || 0;
      acc.totalOT += entry.ot || 0;
      acc.totalCalculated += entry.totalCalculated || 0;
      acc.totalDeductionsFinal += entry.deductions || 0;
      acc.totalInDays += entry.inDays || 0;
      acc.totalTargetRate += entry.targetRate || 0;
      
      return acc;
    }, {
      totalEmployees: 0,
      totalCTC: 0,
      totalWorkedDays: 0,
      totalLeave: 0,
      totalAbsences: 0,
      totalOvertimeHours: 0,
      totalEarnings: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      totalJanuarySalary: 0,
      totalDfrnce: 0,
      
      totalOffDaysWorked: 0,
      totalOffDayAmount: 0,
      totalHolidayWorked: 0,
      totalHolidayAmount: 0,
      totalLeaveSalary: 0,
      totalCashAdvance: 0,
      totalPenaltyPoints: 0,
      totalVisaCost: 0,
      totalFines: 0,
      totalCleaningFees: 0,
      totalUnauthorizedAbsences: 0,
      totalLateHours: 0,
      totalAuthDeduction: 0,
      totalUnauthDeduction: 0,
      totalTardiness: 0,
      totalOvertimeAmount: 0,
      totalNetDeductions: 0,
      totalExtraFromManager: 0,
      totalBackPayment: 0,
      totalFinalModification: 0,
      totalBeforeOT: 0,
      totalOT: 0,
      totalCalculated: 0,
      totalDeductionsFinal: 0,
      totalInDays: 0,
      totalTargetRate: 0
    });
  }, [entries]);

  const handleExcelDownload = () => {
    const monthName = entries.length > 0 ? entries[0].month : months[month - 1];
    const yearVal = entries.length > 0 ? entries[0].year : year;

    // Build header rows
    const groupHeaderRow: string[] = [];
    const columnHeaderRow: string[] = [];

    columns.forEach((col) => {
      if (columnVisibility[col.key] === false) return;
      groupHeaderRow.push(col.group);
      columnHeaderRow.push(col.label);
    });

    // Build data rows
    const dataRows = entries.map((entry) =>
      columns
        .filter((col) => columnVisibility[col.key] !== false)
        .map((col) => {
          const val = (entry as any)[col.key];
          if (col.format === 'currency') return typeof val === 'number' ? val : 0;
          return val ?? '';
        })
    );

    // Build totals row
    const visibleColumns = columns.filter((col) => columnVisibility[col.key] !== false);
    const totalsRow = visibleColumns.map((col) => {
      const numericFields = [
        'ctc','dailyRate','hourlyRate','offDayAmount','holidayAmount','leaveSalary',
        'cashAdvance','total','visaCost','fines','cleaningFees','authAbsenceDeduction',
        'unauthAbsenceDeduction','tardiness','allDeductions','overtimeAmount','netDeductions',
        'extraFromManager','backPayment','januaryNetSalary','totalJanuarySalary','beforeOT',
        'ot','totalCalculated','dfrnce','deductions','offDaysWorked','holidayWorked',
        'penaltyPoints','absences','unauthorizedAbsences','lateHours','overtimeHours',
        'workedDays','leaveTaken','totalDays','offDays','inDays','finalModification',
      ];
      if (col.key === 'sr' || col.key === 'name' || col.key === 'designation' ||
          col.key === 'department' || col.key === 'month' || col.key === 'year' ||
          col.key === 'hrNotes' || col.key === 'targetRate') return col.key === 'name' ? 'TOTALS' : '';
      if (numericFields.includes(col.key)) {
        return entries.reduce((sum, e) => sum + ((e as any)[col.key] || 0), 0);
      }
      return '';
    });

    const wsData = [groupHeaderRow, columnHeaderRow, ...dataRows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style: column widths
    ws['!cols'] = visibleColumns.map((col) => ({ wch: Math.max(col.label.length + 2, 14) }));

    // Merge group header cells
    const merges: XLSX.Range[] = [];
    let colIdx = 0;
    let i = 0;
    while (i < groupHeaderRow.length) {
      let j = i;
      while (j < groupHeaderRow.length - 1 && groupHeaderRow[j + 1] === groupHeaderRow[i]) j++;
      if (j > i) merges.push({ s: { r: 0, c: i }, e: { r: 0, c: j } });
      i = j + 1;
    }
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${yearVal}`);
    XLSX.writeFile(wb, `Payroll_${monthName}_${yearVal}.xlsx`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header with status - DARKER */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 flex justify-between items-center shadow-md">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Payroll • <span className="text-sky-700">
                {entries.length > 0 ? entries[0].month : months[month-1]} {entries.length > 0 ? entries[0].year : year}
              </span>
            </h2>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-gray-700 mt-1 flex items-center gap-2 font-medium">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-600"></span>
            {entries.length} employees • {entries.length > 0 ? entries[0].totalDays - entries[0].offDays : 0} working days
            {!isTableEditable && <span className="ml-2 text-green-800 text-xs font-bold">(Read-only - Generated)</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Download Excel Button - always visible */}
          <button
            onClick={handleExcelDownload}
            disabled={entries.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
            title="Download payroll as Excel"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Excel</span>
          </button>

          {/* Show generate button only if editable */}
          {isTableEditable ? (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>Generate Payroll</span>
                </>
              )}
            </Button>
          ) : (
            <div className="bg-green-100 text-green-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Payroll Generated - Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Read-only warning for generated payrolls - DARKER */}
      {!isTableEditable && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-amber-900 text-sm font-bold flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>This payroll has been generated and is now read-only. No further edits can be made.</span>
        </div>
      )}

      {/* Clean column chooser - DARKER */}
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
        <details className="group">
          <summary className="flex items-center cursor-pointer px-5 py-3 text-sm font-bold text-gray-800 hover:text-sky-700 bg-slate-100">
            <span className="mr-2 text-gray-600">📋</span>
            <span>Show/Hide Columns</span>
            <span className="ml-2 text-xs text-gray-700">({Object.keys(columnVisibility).filter(k => columnVisibility[k] !== false).length}/{columns.length})</span>
            <svg className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="p-4 border-t border-slate-300 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {columns.map(col => (
                <label key={col.key} className="flex items-center space-x-2 text-xs hover:bg-slate-100 p-1.5 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={columnVisibility[col.key] !== false}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-slate-400 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-gray-800 font-medium truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Clean table design - MUCH DARKER with LEFT-ALIGNED cells */}
      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-md">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="sticky top-0 z-20">
              <tr>
                {columnGroups.map((group, idx) => {
                  const colSpan = group.end - group.start + 1;
                  return ( 
                    <th
                      key={idx}
                      colSpan={colSpan}
                      className={`px-4 py-2.5 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 ${group.color}`}
                    >
                      {group.name}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {columns.map((col, idx) => (
                  columnVisibility[col.key] !== false && (
                    <th
                      key={idx}
                      className={`px-4 py-2.5 text-xs font-bold border border-slate-300 ${
                        col.editable ? 'bg-white' : 'bg-slate-100'
                      } sticky top-[41px] z-10 text-gray-800 text-left`}
                      style={{ minWidth: col.width, maxWidth: col.width }}
                    >
                      <div className="flex flex-col items-start">
                        <span>{col.label}</span>
                        {col.editable && isTableEditable && (
                          <span className="text-[8px] text-sky-600 mt-1 font-normal">double-click to edit</span>
                        )}
                      </div>
                    </th>
                  )
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr 
                  key={entry.id} 
                  onClick={(e) => handleRowClick(entry, e)}
                  className={`border-b border-gray-200 cursor-pointer hover:bg-indigo-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    if (columnVisibility[col.key] === false) return null;
                    
                    const value = entry[col.key as keyof PayrollEntry];
                    const isEditing = editingCell?.entryId === entry.id && editingCell?.field === col.key;
                    
                    // Check if this specific field should be editable
                    const isFieldEditable = col.editable && isTableEditable && entry.isEditable === true;
                    
                    let cellBg = '';
                    if (col.key === 'total' || col.key === 'totalJanuarySalary' || col.key === 'januaryNetSalary') {
                      cellBg = 'bg-sky-100';
                    } else if (col.key.includes('deduction') || col.key.includes('Deductions') || col.key.includes('fines') || col.key.includes('visaCost')) {
                      cellBg = 'bg-rose-100';
                    } else if (col.key.includes('overtime') || col.key === 'ot') {
                      cellBg = 'bg-cyan-100';
                    }
                    
                    const isHovered = hoveredCell?.entryId === entry.id && hoveredCell?.field === col.key;
                    
                    return (
                      <td
                        key={`${entry.id}-${colIdx}`}
                        className={`px-4 py-2 border border-slate-300 ${
                          isFieldEditable 
                            ? 'relative' 
                            : ''
                        } ${cellBg} text-left`}
                        data-field={col.key}
                        onMouseEnter={() => isFieldEditable && !isEditing && handleCellMouseEnter(entry.id, col.key)}
                        onMouseLeave={handleCellMouseLeave}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Cancel any pending row click
                          if (clickTimerRef.current) {
                            clearTimeout(clickTimerRef.current);
                            clickTimerRef.current = null;
                          }
                          handleCellDoubleClick(entry.id, col.key, value, isFieldEditable, entry);
                        }}
                      >
                        {/* Tooltip - absolutely positioned to not affect layout */}
                        {isFieldEditable && !isEditing && isHovered && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
                            double-click to edit
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        )}
                        
                        {isEditing && isFieldEditable ? (
                          <input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="w-full px-2 py-1 border border-sky-400 rounded focus:outline-none focus:ring-2 focus:ring-sky-400 text-left font-bold text-gray-900"
                            step="0.01"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        ) : (
                          <div className={`font-mono text-sm font-bold ${
                            col.format === 'currency' ? 'tracking-wide' : ''
                          } ${
                            Number(value) < 0 ? 'text-rose-700' : 
                            Number(value) > 0 && (col.key === 'total' || col.key === 'totalJanuarySalary') ? 'text-sky-800' : 
                            'text-gray-900'
                          }`}>
                            {col.format === 'currency' 
                              ? formatValue(value, 'currency', col.key)
                              : formatValue(value, undefined, col.key)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Grand total row - EXTRA DARK with LEFT-ALIGNED cells */}
              {entries.length > 0 ? (
                <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
                  <td className="px-4 py-3 text-left text-sm border border-slate-400 font-bold text-gray-900" colSpan={4}>GRAND TOTAL:</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold" colSpan={2}>—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(entries[0]?.totalDays) ? entries[0]?.totalDays?.toString() : entries[0]?.totalDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(entries[0]?.offDays) ? entries[0]?.offDays?.toString() : entries[0]?.offDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalLeave) ? totals.totalLeave?.toString() : totals.totalLeave?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalWorkedDays) ? totals.totalWorkedDays?.toString() : totals.totalWorkedDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCTC, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalOffDaysWorked) ? totals.totalOffDaysWorked?.toString() : totals.totalOffDaysWorked?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOffDayAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalHolidayWorked) ? totals.totalHolidayWorked?.toString() : totals.totalHolidayWorked?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalHolidayAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalLeaveSalary || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCashAdvance || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalPenaltyPoints) ? totals.totalPenaltyPoints?.toString() : totals.totalPenaltyPoints?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalEarnings, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalVisaCost || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFines || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCleaningFees || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalAbsences) ? totals.totalAbsences?.toString() : totals.totalAbsences?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalUnauthorizedAbsences) ? totals.totalUnauthorizedAbsences?.toString() : totals.totalUnauthorizedAbsences?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalLateHours) ? totals.totalLateHours?.toString() : totals.totalLateHours?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalAuthDeduction || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalUnauthDeduction || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalTardiness || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-rose-700 font-bold bg-white/80">{formatValue(totals.totalDeductions, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalOvertimeHours) ? totals.totalOvertimeHours?.toString() : totals.totalOvertimeHours?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOvertimeAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalNetDeductions || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalExtraFromManager || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBackPayment || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFinalModification || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalNetSalary, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalJanuarySalary, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBeforeOT || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOT || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCalculated || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-amber-700 font-bold bg-white/80">{formatValue(totals.totalDfrnce, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalDeductionsFinal || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {Number.isInteger(totals.totalInDays) ? totals.totalInDays?.toString() : totals.totalInDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
                  </td>
                </tr>
              ) : (
                <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
                  <td className="px-4 py-3 text-left text-sm border border-slate-400 text-gray-900 font-bold" colSpan={46}>No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards - MUCH DARKER with LEFT-ALIGNED text */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
              <span className="text-blue-800 text-sm font-bold">📅</span>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">Period</span>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-1 text-left">
            {entries.length > 0 ? (entries[0].totalDays - entries[0].offDays) : '0'}
          </div>
          <div className="text-sm font-bold text-gray-700 mb-2 text-left">Working Days</div>
          <div className="flex justify-between text-xs font-medium text-gray-600 border-t border-slate-200 pt-2">
            <span>Total: {entries[0]?.totalDays || 0}d</span>
            <span>Off: {entries[0]?.offDays || 0}d</span>
          </div>
        </div>
        
        <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-200 flex items-center justify-center">
              <span className="text-emerald-800 text-sm font-bold">👥</span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-1 text-left">{totals.totalEmployees}</div>
          <div className="text-sm font-bold text-gray-700 mb-2 text-left">Employees</div>
          <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
            Active this period
          </div>
        </div>
        
        <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-200 flex items-center justify-center">
              <span className="text-purple-800 text-sm font-bold">💰</span>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">CTC</span>
          </div>
          <div className="text-base font-bold text-gray-900 mb-1 tracking-tight text-left">{formatValue(totals.totalCTC, 'currency')}</div>
          <div className="text-sm font-bold text-gray-700 mb-2 text-left">Total CTC</div>
          <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
            Sum of all salaries
          </div>
        </div>
        
        <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
              <span className="text-amber-800 text-sm font-bold">⏱️</span>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Hours</span>
          </div>
          <div className="text-xl font-bold text-gray-900 mb-1 text-left">{totals.totalOvertimeHours.toFixed(1)}</div>
          <div className="text-sm font-bold text-gray-700 mb-2 text-left">Overtime Hours</div>
          <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
            Total across all employees
          </div>
        </div>
        
        <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-200 flex items-center justify-center">
              <span className="text-sky-800 text-sm font-bold">💵</span>
            </div>
            <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">Net Pay</span>
          </div>
          <div className="text-base font-bold text-gray-900 mb-1 tracking-tight text-left">{formatValue(totals.totalJanuarySalary, 'currency')}</div>
          <div className="text-sm font-bold text-gray-700 mb-2 text-left">Net Payroll</div>
          <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
            Total to pay employees
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollTable;


// import React, { useState, useMemo, useRef } from 'react';
// import { Button } from './UI';
// import { CheckIcon } from './Icons';
// import * as XLSX from 'xlsx';

// interface PayrollEntry {
//   id: string;
//   sr: number;
//   name: string;
//   designation: string;
//   department: string;
//   month: string;
//   year: number;
//   totalDays: number;
//   offDays: number;
//   leaveTaken: number;
//   workedDays: number;
//   ctc: number;
//   dailyRate: number;
//   hourlyRate: number;
//   offDaysWorked: number;
//   offDayAmount: number;
//   holidayWorked: number;
//   holidayAmount: number;
//   leaveSalary: number;
//   cashAdvance: number;
//   penaltyPoints: number;
//   total: number;
//   visaCost: number;
//   absences: number;
//   unauthorizedAbsences: number;
//   lateHours: number;
//   authAbsenceDeduction: number;
//   unauthAbsenceDeduction: number;
//   tardiness: number;
//   fines: number;
//   cleaningFees: number;
//   allDeductions: number;
//   overtimeHours: number;
//   overtimeAmount: number;
//   netDeductions: number;
//   extraFromManager: number;
//   januaryNetSalary: number;
//   targetRate: number;
//   backPayment: number;
//   totalJanuarySalary: number;
//   finalModification: number;
//   hrNotes: string;
//   beforeOT: number;
//   ot: number;
//   totalCalculated: number;
//   dfrnce: number;
//   deductions: number;
//   inDays: number;
//   isCalculated: boolean;
//   isEditable: boolean;
//   status?: 'draft' | 'calculated' | 'generated';
// }

// interface PayrollTableProps {
//   entries: PayrollEntry[];
//   onUpdateCell: (entryId: string, field: string, value: any) => void;
//   onSave: () => void;
//   isSaving: boolean;
//   month: number;
//   year: number;
//   periodStatus?: 'draft' | 'calculated' | 'generated';
//   onRowClick?: (entry: PayrollEntry) => void;
// }

// const PayrollTable: React.FC<PayrollTableProps> = ({
//   entries,
//   onUpdateCell,
//   onSave,
//   isSaving,
//   month,
//   year,
//   periodStatus = 'draft',
//   onRowClick
// }) => {

//   const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
//   const [editValue, setEditValue] = useState<string>('');
//   const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
//   const [hoveredCell, setHoveredCell] = useState<{ entryId: string; field: string } | null>(null);
  
//   // Track clicks and double clicks
//   const doubleClickTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const [isDoubleClick, setIsDoubleClick] = useState(false);
  
//   const months = [
//     'January', 'February', 'March', 'April', 'May', 'June',
//     'July', 'August', 'September', 'October', 'November', 'December'
//   ];
  
//   // Determine if table is editable based on period status
//   const isTableEditable = periodStatus !== 'generated';
  
//   // Get status badge - MUCH DARKER
//   const getStatusBadge = () => {
//     switch(periodStatus) {
//       case 'generated':
//         return <span className="bg-green-100 text-green-900 px-3 py-1 rounded-full text-xs font-bold">✓ Generated</span>;
//       case 'calculated':
//         return <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-bold">⟲ Calculated</span>;
//       default:
//         return <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold">📝 Draft</span>;
//     }
//   };
  
//   // Soft pastel color palette for groups
//   const columns = [
//     // Employee Info
//     { key: 'sr', label: 'SR', width: 50, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
//     { key: 'name', label: 'Name', width: 200, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
//     { key: 'designation', label: 'Designation', width: 200, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
//     { key: 'department', label: 'Department', width: 150, editable: false, group: 'EMPLOYEE INFORMATION', groupColor: 'bg-blue-50/60' },
    
//     // Month Info
//     { key: 'month', label: 'Month', width: 100, editable: false, group: 'MONTH', groupColor: 'bg-teal-50/60' },
//     { key: 'year', label: 'Year', width: 80, editable: false, group: 'MONTH', groupColor: 'bg-teal-50/60' },
//     { key: 'totalDays', label: 'Total Days', width: 120, editable: false, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
//     { key: 'offDays', label: 'Off Days', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
//     { key: 'leaveTaken', label: 'Leave', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
//     { key: 'workedDays', label: 'Worked Days', width: 100, editable: true, group: 'ATTENDANCE', groupColor: 'bg-amber-50/60' },
    
//     // Salary & Rates
//     { key: 'ctc', label: 'CTC', width: 130, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
//     { key: 'dailyRate', label: 'Daily Rate', width: 120, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
//     { key: 'hourlyRate', label: 'Hourly Rate', width: 120, editable: false, format: 'currency', group: 'SALARY', groupColor: 'bg-purple-50/60' },
    
//     // Special Days
//     { key: 'offDaysWorked', label: 'Off Days Worked', width: 160, editable: true, group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
//     { key: 'offDayAmount', label: 'Off Day Amount', width: 150, editable: false, format: 'currency', group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
//     { key: 'holidayWorked', label: 'Holiday Worked', width: 160, editable: true, group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
//     { key: 'holidayAmount', label: 'Holiday Amount', width: 150, editable: false, format: 'currency', group: 'SPECIAL', groupColor: 'bg-orange-50/60' },
    
//     // Earnings
//     { key: 'leaveSalary', label: 'Leave Salary', width: 140, editable: true, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
//     { key: 'cashAdvance', label: 'Cash Advance', width: 140, editable: true, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
//     { key: 'penaltyPoints', label: 'Penalty', width: 120, editable: true, group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
//     { key: 'total', label: 'TOTAL', width: 140, editable: false, format: 'currency', group: 'EARNINGS', groupColor: 'bg-emerald-50/60' },
    
//     // Deductions
//     { key: 'visaCost', label: 'Visa Cost', width: 120, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'fines', label: 'Fines', width: 120, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'cleaningFees', label: 'Cleaning Fees', width: 150, editable: true, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'absences', label: 'Absences', width: 100, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'unauthorizedAbsences', label: 'Unauth Absences', width: 160, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'lateHours', label: 'Late Hours', width: 120, editable: true, group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'authAbsenceDeduction', label: 'Auth Deduction', width: 140, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'unauthAbsenceDeduction', label: 'Unauth Deduction', width: 150, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'tardiness', label: 'Tardiness', width: 120, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
//     { key: 'allDeductions', label: 'Total Deductions', width: 150, editable: false, format: 'currency', group: 'DEDUCTIONS', groupColor: 'bg-rose-50/60' },
    
//     // Overtime
//     { key: 'overtimeHours', label: 'OT Hours', width: 120, editable: true, group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
//     { key: 'overtimeAmount', label: 'OT Amount', width: 140, editable: false, format: 'currency', group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
//     { key: 'netDeductions', label: 'Net Deductions', width: 140, editable: false, format: 'currency', group: 'OVERTIME', groupColor: 'bg-cyan-50/60' },
    
//     // Additional
//     { key: 'extraFromManager', label: 'Manager Extra', width: 140, editable: true, format: 'currency', group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
//     { key: 'backPayment', label: 'Back Payment', width: 140, editable: true, format: 'currency', group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
//     { key: 'finalModification', label: 'Final Salary Mod', width: 140, editable: true, group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
//     { key: 'hrNotes', label: "HR / Shamso's Notes", width: 200, editable: true, group: 'ADDITIONAL', groupColor: 'bg-indigo-50/60' },
    
//     // Net Salary
//     { key: 'januaryNetSalary', label: 'Net Salary', width: 140, editable: false, format: 'currency', group: 'NET', groupColor: 'bg-sky-50/60' },
//     { key: 'targetRate', label: 'Target %', width: 100, editable: false, group: 'NET', groupColor: 'bg-sky-50/60' },
//     { key: 'totalJanuarySalary', label: 'Total Salary', width: 140, editable: false, format: 'currency', group: 'NET', groupColor: 'bg-sky-50/60' },
    
//     // Final
//     { key: 'beforeOT', label: 'Before OT', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
//     { key: 'ot', label: 'OT', width: 100, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
//     { key: 'totalCalculated', label: 'Total Calc', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
//     { key: 'dfrnce', label: 'Difference', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
//     { key: 'deductions', label: 'Deductions', width: 120, editable: false, format: 'currency', group: 'FINAL', groupColor: 'bg-slate-100/80' },
//     { key: 'inDays', label: 'In Days', width: 100, editable: false, group: 'FINAL', groupColor: 'bg-slate-100/80' }
//   ];

//   // MUCH DARKER group header colors
//   const columnGroups = [
//     { name: 'EMPLOYEE', start: 0, end: 3, color: 'bg-blue-200 text-blue-900 border-blue-300 font-bold' },
//     { name: 'MONTH', start: 4, end: 5, color: 'bg-teal-200 text-teal-900 border-teal-300 font-bold' },
//     { name: 'ATTENDANCE', start: 6, end: 9, color: 'bg-amber-200 text-amber-900 border-amber-300 font-bold' },
//     { name: 'SALARY', start: 10, end: 12, color: 'bg-purple-200 text-purple-900 border-purple-300 font-bold' },
//     { name: 'SPECIAL', start: 13, end: 16, color: 'bg-orange-200 text-orange-900 border-orange-300 font-bold' },
//     { name: 'EARNINGS', start: 17, end: 20, color: 'bg-emerald-200 text-emerald-900 border-emerald-300 font-bold' },
//     { name: 'DEDUCTIONS', start: 21, end: 30, color: 'bg-rose-200 text-rose-900 border-rose-300 font-bold' },
//     { name: 'OVERTIME', start: 31, end: 33, color: 'bg-cyan-200 text-cyan-900 border-cyan-300 font-bold' },
//     { name: 'ADDITIONAL', start: 34, end: 37, color: 'bg-indigo-200 text-indigo-900 border-indigo-300 font-bold' },
//     { name: 'NET', start: 38, end: 40, color: 'bg-sky-200 text-sky-900 border-sky-300 font-bold' },
//     { name: 'FINAL', start: 41, end: 46, color: 'bg-slate-300 text-slate-900 border-slate-400 font-bold' }
//   ];

//   // Updated formatValue to remove .00 and show whole numbers
//   const formatValue = (value: any, format?: string, field?: string) => {
//     if (value === null || value === undefined || value === '') return '';
    
//     if (field === 'workedDays' && value === 0) return '';
//     if ((field === 'leaveTaken' || field === 'absences') && value === 0) return '';
    
//     const num = Number(value);
//     if (isNaN(num)) return value;
    
//     // Return empty string for zero values
//     if (num === 0) return '';
    
//     if (format === 'currency') {
//         return new Intl.NumberFormat('en-US', {
//           style: 'currency',
//           currency: 'AED',
//           minimumFractionDigits: 2,
//           maximumFractionDigits: 2
//         }).format(num);
//     }
    
//     // Check if the number is an integer (no decimal part)
//     if (Number.isInteger(num)) {
//       return num.toString(); // Return as whole number without decimals
//     }
    
//     // For non-integers, show up to 2 decimal places but remove trailing zeros
//     return num.toFixed(2).replace(/\.?0+$/, '');
//   };

//   const handleCellClick = (entryId: string, field: string, currentValue: any, editable: boolean) => {
//     if (!editable || !isTableEditable) return;
    
//     // Also check the specific entry's isEditable flag
//     const entry = entries.find(e => e.id === entryId);
//     if (!entry?.isEditable) return;
    
//     setEditingCell({ entryId, field });
//     setEditValue(currentValue?.toString() || '');
//   };

//   const handleCellSave = () => {
//     if (editingCell) {
//       const numValue = parseFloat(editValue);
//       onUpdateCell(editingCell.entryId, editingCell.field, isNaN(numValue) ? editValue : numValue);
//       setEditingCell(null);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       e.preventDefault(); // Prevent default form submission behavior
//       e.stopPropagation();
//       handleCellSave();
//     } else if (e.key === 'Escape') {
//       setEditingCell(null);
//     }
//   };

//   const toggleColumn = (key: string) => {
//     setColumnVisibility(prev => ({
//       ...prev,
//       [key]: !prev[key]
//     }));
//   };

//   const handleRowClick = (entry: PayrollEntry, event: React.MouseEvent) => {
//     // Don't navigate if clicking on an input element
//     if (event.target instanceof HTMLInputElement) {
//       event.stopPropagation();
//       return;
//     }

//     // Don't navigate if clicking on an editable cell (to allow editing)
//     const target = event.target as HTMLElement;
//     const td = target.closest('td');
//     if (td) {
//       const field = td.getAttribute('data-field');
//       const column = columns.find(c => c.key === field);
//       if (column?.editable && isTableEditable) {
//         return; // Don't navigate, let the cell handle the click
//       }
//     }
    
//     // If there's a timer already, clear it
//     if (clickTimerRef.current) {
//       clearTimeout(clickTimerRef.current);
//       clickTimerRef.current = null;
//     }
    
//     // If this is a double click, don't navigate
//     if (isDoubleClick) {
//       setIsDoubleClick(false);
//       return;
//     }
    
//     console.log('🔍 Row clicked, navigating to detail page for:', entry.name);
//     onRowClick?.(entry);
//   };

//   const handleCellDoubleClick = (
//     entryId: string, 
//     field: string, 
//     value: any, 
//     isFieldEditable: boolean,
//     entry: PayrollEntry
//   ) => {
//     if (!isFieldEditable) return;
    
//     console.log('🖱️ Double click detected on cell - preventing row navigation');
    
//     // Cancel any pending row click IMMEDIATELY
//     if (clickTimerRef.current) {
//       clearTimeout(clickTimerRef.current);
//       clickTimerRef.current = null;
//     }
    
//     // Set flag to prevent row navigation
//     setIsDoubleClick(true);
    
//     // Clear any existing timer
//     if (doubleClickTimerRef.current) {
//       clearTimeout(doubleClickTimerRef.current);
//     }
    
//     // Reset the flag after a longer delay to ensure it doesn't interfere
//     doubleClickTimerRef.current = setTimeout(() => {
//       setIsDoubleClick(false);
//     }, 500);
    
//     // Handle cell edit
//     handleCellClick(entryId, field, value, true);
//   };

//   const handleCellMouseEnter = (entryId: string, field: string) => {
//     if (hoverTimerRef.current) {
//       clearTimeout(hoverTimerRef.current);
//     }
    
//     hoverTimerRef.current = setTimeout(() => {
//       setHoveredCell({ entryId, field });
//     }, 2000); // 2 second delay
//   };

//   const handleCellMouseLeave = () => {
//     if (hoverTimerRef.current) {
//       clearTimeout(hoverTimerRef.current);
//     }
//     setHoveredCell(null);
//   };

//   const totals = useMemo(() => {
//     return entries.reduce((acc, entry) => {
//       acc.totalEmployees++;
//       acc.totalCTC += entry.ctc || 0;
//       acc.totalWorkedDays += entry.workedDays || 0;
//       acc.totalLeave += entry.leaveTaken || 0;
//       acc.totalAbsences += entry.absences || 0;
//       acc.totalOvertimeHours += entry.overtimeHours || 0;
//       acc.totalEarnings += entry.total || 0;
//       acc.totalDeductions += entry.allDeductions || 0;
//       acc.totalNetSalary += entry.januaryNetSalary || 0;
//       acc.totalJanuarySalary += entry.totalJanuarySalary || 0;
//       acc.totalDfrnce += entry.dfrnce || 0;
      
//       acc.totalOffDaysWorked += entry.offDaysWorked || 0;
//       acc.totalOffDayAmount += entry.offDayAmount || 0;
//       acc.totalHolidayWorked += entry.holidayWorked || 0;
//       acc.totalHolidayAmount += entry.holidayAmount || 0;
//       acc.totalLeaveSalary += entry.leaveSalary || 0;
//       acc.totalCashAdvance += entry.cashAdvance || 0;
//       acc.totalPenaltyPoints += entry.penaltyPoints || 0;
//       acc.totalVisaCost += entry.visaCost || 0;
//       acc.totalFines += entry.fines || 0;
//       acc.totalCleaningFees += entry.cleaningFees || 0;
//       acc.totalUnauthorizedAbsences += entry.unauthorizedAbsences || 0;
//       acc.totalLateHours += entry.lateHours || 0;
//       acc.totalAuthDeduction += entry.authAbsenceDeduction || 0;
//       acc.totalUnauthDeduction += entry.unauthAbsenceDeduction || 0;
//       acc.totalTardiness += entry.tardiness || 0;
//       acc.totalOvertimeAmount += entry.overtimeAmount || 0;
//       acc.totalNetDeductions += entry.netDeductions || 0;
//       acc.totalExtraFromManager += entry.extraFromManager || 0;
//       acc.totalBackPayment += entry.backPayment || 0;
//       acc.totalFinalModification += entry.finalModification || 0;
//       acc.totalBeforeOT += entry.beforeOT || 0;
//       acc.totalOT += entry.ot || 0;
//       acc.totalCalculated += entry.totalCalculated || 0;
//       acc.totalDeductionsFinal += entry.deductions || 0;
//       acc.totalInDays += entry.inDays || 0;
//       acc.totalTargetRate += entry.targetRate || 0;
      
//       return acc;
//     }, {
//       totalEmployees: 0,
//       totalCTC: 0,
//       totalWorkedDays: 0,
//       totalLeave: 0,
//       totalAbsences: 0,
//       totalOvertimeHours: 0,
//       totalEarnings: 0,
//       totalDeductions: 0,
//       totalNetSalary: 0,
//       totalJanuarySalary: 0,
//       totalDfrnce: 0,
      
//       totalOffDaysWorked: 0,
//       totalOffDayAmount: 0,
//       totalHolidayWorked: 0,
//       totalHolidayAmount: 0,
//       totalLeaveSalary: 0,
//       totalCashAdvance: 0,
//       totalPenaltyPoints: 0,
//       totalVisaCost: 0,
//       totalFines: 0,
//       totalCleaningFees: 0,
//       totalUnauthorizedAbsences: 0,
//       totalLateHours: 0,
//       totalAuthDeduction: 0,
//       totalUnauthDeduction: 0,
//       totalTardiness: 0,
//       totalOvertimeAmount: 0,
//       totalNetDeductions: 0,
//       totalExtraFromManager: 0,
//       totalBackPayment: 0,
//       totalFinalModification: 0,
//       totalBeforeOT: 0,
//       totalOT: 0,
//       totalCalculated: 0,
//       totalDeductionsFinal: 0,
//       totalInDays: 0,
//       totalTargetRate: 0
//     });
//   }, [entries]);

//   const handleExcelDownload = () => {
//     const monthName = entries.length > 0 ? entries[0].month : months[month - 1];
//     const yearVal = entries.length > 0 ? entries[0].year : year;

//     // Build header rows
//     const groupHeaderRow: string[] = [];
//     const columnHeaderRow: string[] = [];

//     columns.forEach((col) => {
//       if (columnVisibility[col.key] === false) return;
//       groupHeaderRow.push(col.group);
//       columnHeaderRow.push(col.label);
//     });

//     // Build data rows
//     const dataRows = entries.map((entry) =>
//       columns
//         .filter((col) => columnVisibility[col.key] !== false)
//         .map((col) => {
//           const val = (entry as any)[col.key];
//           if (col.format === 'currency') return typeof val === 'number' ? val : 0;
//           return val ?? '';
//         })
//     );

//     // Build totals row
//     const visibleColumns = columns.filter((col) => columnVisibility[col.key] !== false);
//     const totalsRow = visibleColumns.map((col) => {
//       const numericFields = [
//         'ctc','dailyRate','hourlyRate','offDayAmount','holidayAmount','leaveSalary',
//         'cashAdvance','total','visaCost','fines','cleaningFees','authAbsenceDeduction',
//         'unauthAbsenceDeduction','tardiness','allDeductions','overtimeAmount','netDeductions',
//         'extraFromManager','backPayment','januaryNetSalary','totalJanuarySalary','beforeOT',
//         'ot','totalCalculated','dfrnce','deductions','offDaysWorked','holidayWorked',
//         'penaltyPoints','absences','unauthorizedAbsences','lateHours','overtimeHours',
//         'workedDays','leaveTaken','totalDays','offDays','inDays','finalModification',
//       ];
//       if (col.key === 'sr' || col.key === 'name' || col.key === 'designation' ||
//           col.key === 'department' || col.key === 'month' || col.key === 'year' ||
//           col.key === 'hrNotes' || col.key === 'targetRate') return col.key === 'name' ? 'TOTALS' : '';
//       if (numericFields.includes(col.key)) {
//         return entries.reduce((sum, e) => sum + ((e as any)[col.key] || 0), 0);
//       }
//       return '';
//     });

//     const wsData = [groupHeaderRow, columnHeaderRow, ...dataRows, totalsRow];
//     const ws = XLSX.utils.aoa_to_sheet(wsData);

//     // Style: column widths
//     ws['!cols'] = visibleColumns.map((col) => ({ wch: Math.max(col.label.length + 2, 14) }));

//     // Merge group header cells
//     const merges: XLSX.Range[] = [];
//     let colIdx = 0;
//     let i = 0;
//     while (i < groupHeaderRow.length) {
//       let j = i;
//       while (j < groupHeaderRow.length - 1 && groupHeaderRow[j + 1] === groupHeaderRow[i]) j++;
//       if (j > i) merges.push({ s: { r: 0, c: i }, e: { r: 0, c: j } });
//       i = j + 1;
//     }
//     ws['!merges'] = merges;

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, `${monthName} ${yearVal}`);
//     XLSX.writeFile(wb, `Payroll_${monthName}_${yearVal}.xlsx`);
//   };

//   return (
//     <div className="space-y-6 font-sans">
//       {/* Header with status - DARKER */}
//       <div className="bg-white border border-slate-300 rounded-xl p-5 flex justify-between items-center shadow-md">
//         <div>
//           <div className="flex items-center gap-3">
//             <h2 className="text-xl font-bold text-gray-900 tracking-tight">
//               Payroll • <span className="text-sky-700">
//                 {entries.length > 0 ? entries[0].month : months[month-1]} {entries.length > 0 ? entries[0].year : year}
//               </span>
//             </h2>
//             {getStatusBadge()}
//           </div>
//           <p className="text-sm text-gray-700 mt-1 flex items-center gap-2 font-medium">
//             <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-600"></span>
//             {entries.length} employees • {entries.length > 0 ? entries[0].totalDays - entries[0].offDays : 0} working days
//             {!isTableEditable && <span className="ml-2 text-green-800 text-xs font-bold">(Read-only - Generated)</span>}
//           </p>
//         </div>
        
//         <div className="flex items-center gap-3">
//           {/* Download Excel Button - always visible */}
//           <button
//             onClick={handleExcelDownload}
//             disabled={entries.length === 0}
//             className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
//             title="Download payroll as Excel"
//           >
//             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//             </svg>
//             <span>Download Excel</span>
//           </button>

//           {/* Show generate button only if editable */}
//           {isTableEditable ? (
//             <Button
//               onClick={onSave}
//               disabled={isSaving}
//               className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
//             >
//               {isSaving ? (
//                 <>
//                   <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                   </svg>
//                   <span>Processing...</span>
//                 </>
//               ) : (
//                 <>
//                   <CheckIcon className="h-4 w-4" />
//                   <span>Generate Payroll</span>
//                 </>
//               )}
//             </Button>
//           ) : (
//             <div className="bg-green-100 text-green-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-300">
//               <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//               </svg>
//               <span>Payroll Generated - Locked</span>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Read-only warning for generated payrolls - DARKER */}
//       {!isTableEditable && (
//         <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-amber-900 text-sm font-bold flex items-center gap-2">
//           <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//           </svg>
//           <span>This payroll has been generated and is now read-only. No further edits can be made.</span>
//         </div>
//       )}

//       {/* Clean column chooser - DARKER */}
//       <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
//         <details className="group">
//           <summary className="flex items-center cursor-pointer px-5 py-3 text-sm font-bold text-gray-800 hover:text-sky-700 bg-slate-100">
//             <span className="mr-2 text-gray-600">📋</span>
//             <span>Show/Hide Columns</span>
//             <span className="ml-2 text-xs text-gray-700">({Object.keys(columnVisibility).filter(k => columnVisibility[k] !== false).length}/{columns.length})</span>
//             <svg className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//             </svg>
//           </summary>
//           <div className="p-4 border-t border-slate-300 bg-white">
//             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
//               {columns.map(col => (
//                 <label key={col.key} className="flex items-center space-x-2 text-xs hover:bg-slate-100 p-1.5 rounded transition-colors">
//                   <input
//                     type="checkbox"
//                     checked={columnVisibility[col.key] !== false}
//                     onChange={() => toggleColumn(col.key)}
//                     className="rounded border-slate-400 text-sky-600 focus:ring-sky-500"
//                   />
//                   <span className="text-gray-800 font-medium truncate">{col.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//         </details>
//       </div>

//       {/* Clean table design - MUCH DARKER with LEFT-ALIGNED cells */}
//       <div className="bg-white rounded-xl border border-slate-300 overflow-hidden shadow-md">
//         <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
//           <table className="min-w-full text-sm border-collapse">
//             <thead className="sticky top-0 z-20">
//               <tr>
//                 {columnGroups.map((group, idx) => {
//                   const colSpan = group.end - group.start + 1;
//                   return ( 
//                     <th
//                       key={idx}
//                       colSpan={colSpan}
//                       className={`px-4 py-2.5 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 ${group.color}`}
//                     >
//                       {group.name}
//                     </th>
//                   );
//                 })}
//               </tr>
//               <tr>
//                 {columns.map((col, idx) => (
//                   columnVisibility[col.key] !== false && (
//                     <th
//                       key={idx}
//                       className={`px-4 py-2.5 text-xs font-bold border border-slate-300 ${
//                         col.editable ? 'bg-white' : 'bg-slate-100'
//                       } sticky top-[41px] z-10 text-gray-800 text-left`}
//                       style={{ minWidth: col.width, maxWidth: col.width }}
//                     >
//                       <div className="flex flex-col items-start">
//                         <span>{col.label}</span>
//                         {col.editable && isTableEditable && (
//                           <span className="text-[8px] text-sky-600 mt-1 font-normal">double-click to edit</span>
//                         )}
//                       </div>
//                     </th>
//                   )
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {entries.map((entry, index) => (
//                 <tr 
//                   key={entry.id} 
//                   onClick={(e) => handleRowClick(entry, e)}
//                   className={`border-b border-gray-200 cursor-pointer hover:bg-indigo-50 transition-colors ${
//                     index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
//                   }`}
//                 >
//                   {columns.map((col, colIdx) => {
//                     if (columnVisibility[col.key] === false) return null;
                    
//                     const value = entry[col.key as keyof PayrollEntry];
//                     const isEditing = editingCell?.entryId === entry.id && editingCell?.field === col.key;
                    
//                     // Check if this specific field should be editable
//                     const isFieldEditable = col.editable && isTableEditable && entry.isEditable === true;
                    
//                     let cellBg = '';
//                     if (col.key === 'total' || col.key === 'totalJanuarySalary' || col.key === 'januaryNetSalary') {
//                       cellBg = 'bg-sky-100';
//                     } else if (col.key.includes('deduction') || col.key.includes('Deductions') || col.key.includes('fines') || col.key.includes('visaCost')) {
//                       cellBg = 'bg-rose-100';
//                     } else if (col.key.includes('overtime') || col.key === 'ot') {
//                       cellBg = 'bg-cyan-100';
//                     }
                    
//                     const isHovered = hoveredCell?.entryId === entry.id && hoveredCell?.field === col.key;
                    
//                     return (
//                       <td
//                         key={`${entry.id}-${colIdx}`}
//                         className={`px-4 py-2 border border-slate-300 ${
//                           isFieldEditable 
//                             ? 'relative' 
//                             : ''
//                         } ${cellBg} text-left`}
//                         data-field={col.key}
//                         onMouseEnter={() => isFieldEditable && !isEditing && handleCellMouseEnter(entry.id, col.key)}
//                         onMouseLeave={handleCellMouseLeave}
//                         onDoubleClick={(e) => {
//                           e.stopPropagation();
//                           e.preventDefault();
//                           // Cancel any pending row click
//                           if (clickTimerRef.current) {
//                             clearTimeout(clickTimerRef.current);
//                             clickTimerRef.current = null;
//                           }
//                           handleCellDoubleClick(entry.id, col.key, value, isFieldEditable, entry);
//                         }}
//                       >
//                         {/* Tooltip - absolutely positioned to not affect layout */}
//                         {isFieldEditable && !isEditing && isHovered && (
//                           <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
//                             double-click to edit
//                             <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
//                           </div>
//                         )}
                        
//                         {isEditing && isFieldEditable ? (
//                           <input
//                             type={typeof value === 'number' ? 'number' : 'text'}
//                             value={editValue}
//                             onChange={(e) => setEditValue(e.target.value)}
//                             onBlur={handleCellSave}
//                             onKeyDown={handleKeyDown}
//                             autoFocus
//                             className="w-full px-2 py-1 border border-sky-400 rounded focus:outline-none focus:ring-2 focus:ring-sky-400 text-left font-bold text-gray-900"
//                             step="0.01"
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               e.preventDefault();
//                             }}
//                             onDoubleClick={(e) => {
//                               e.stopPropagation();
//                               e.preventDefault();
//                             }}
//                             onMouseDown={(e) => {
//                               e.stopPropagation();
//                             }}
//                           />
//                         ) : (
//                           <div className={`font-mono text-sm font-bold ${
//                             col.format === 'currency' ? 'tracking-wide' : ''
//                           } ${
//                             Number(value) < 0 ? 'text-rose-700' : 
//                             Number(value) > 0 && (col.key === 'total' || col.key === 'totalJanuarySalary') ? 'text-sky-800' : 
//                             'text-gray-900'
//                           }`}>
//                             {col.format === 'currency' 
//                               ? formatValue(value, 'currency', col.key)
//                               : formatValue(value, undefined, col.key)}
//                           </div>
//                         )}
//                       </td>
//                     );
//                   })}
//                 </tr>
//               ))}
              
//               {/* Grand total row - EXTRA DARK with LEFT-ALIGNED cells */}
//               {entries.length > 0 ? (
//                 <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
//                   <td className="px-4 py-3 text-left text-sm border border-slate-400 font-bold text-gray-900" colSpan={4}>GRAND TOTAL:</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold" colSpan={2}>—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(entries[0]?.totalDays) ? entries[0]?.totalDays?.toString() : entries[0]?.totalDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(entries[0]?.offDays) ? entries[0]?.offDays?.toString() : entries[0]?.offDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalLeave) ? totals.totalLeave?.toString() : totals.totalLeave?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalWorkedDays) ? totals.totalWorkedDays?.toString() : totals.totalWorkedDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCTC, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalOffDaysWorked) ? totals.totalOffDaysWorked?.toString() : totals.totalOffDaysWorked?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOffDayAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalHolidayWorked) ? totals.totalHolidayWorked?.toString() : totals.totalHolidayWorked?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalHolidayAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalLeaveSalary || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCashAdvance || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalPenaltyPoints) ? totals.totalPenaltyPoints?.toString() : totals.totalPenaltyPoints?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalEarnings, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalVisaCost || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFines || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCleaningFees || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalAbsences) ? totals.totalAbsences?.toString() : totals.totalAbsences?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalUnauthorizedAbsences) ? totals.totalUnauthorizedAbsences?.toString() : totals.totalUnauthorizedAbsences?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalLateHours) ? totals.totalLateHours?.toString() : totals.totalLateHours?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalAuthDeduction || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalUnauthDeduction || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalTardiness || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-rose-700 font-bold bg-white/80">{formatValue(totals.totalDeductions, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalOvertimeHours) ? totals.totalOvertimeHours?.toString() : totals.totalOvertimeHours?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOvertimeAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalNetDeductions || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalExtraFromManager || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBackPayment || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFinalModification || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalNetSalary, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-sky-800 font-bold bg-white/80">{formatValue(totals.totalJanuarySalary, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBeforeOT || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOT || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCalculated || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-amber-700 font-bold bg-white/80">{formatValue(totals.totalDfrnce, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalDeductionsFinal || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {Number.isInteger(totals.totalInDays) ? totals.totalInDays?.toString() : totals.totalInDays?.toFixed(2).replace(/\.?0+$/, '') || '0'}
//                   </td>
//                 </tr>
//               ) : (
//                 <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
//                   <td className="px-4 py-3 text-left text-sm border border-slate-400 text-gray-900 font-bold" colSpan={46}>No data available</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Summary cards - MUCH DARKER with LEFT-ALIGNED text */}
//       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
//         <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
//               <span className="text-blue-800 text-sm font-bold">📅</span>
//             </div>
//             <span className="text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">Period</span>
//           </div>
//           <div className="text-xl font-bold text-gray-900 mb-1 text-left">
//             {entries.length > 0 ? (entries[0].totalDays - entries[0].offDays) : '0'}
//           </div>
//           <div className="text-sm font-bold text-gray-700 mb-2 text-left">Working Days</div>
//           <div className="flex justify-between text-xs font-medium text-gray-600 border-t border-slate-200 pt-2">
//             <span>Total: {entries[0]?.totalDays || 0}d</span>
//             <span>Off: {entries[0]?.offDays || 0}d</span>
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-lg bg-emerald-200 flex items-center justify-center">
//               <span className="text-emerald-800 text-sm font-bold">👥</span>
//             </div>
//             <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>
//           </div>
//           <div className="text-xl font-bold text-gray-900 mb-1 text-left">{totals.totalEmployees}</div>
//           <div className="text-sm font-bold text-gray-700 mb-2 text-left">Employees</div>
//           <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
//             Active this period
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-lg bg-purple-200 flex items-center justify-center">
//               <span className="text-purple-800 text-sm font-bold">💰</span>
//             </div>
//             <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">CTC</span>
//           </div>
//           <div className="text-base font-bold text-gray-900 mb-1 tracking-tight text-left">{formatValue(totals.totalCTC, 'currency')}</div>
//           <div className="text-sm font-bold text-gray-700 mb-2 text-left">Total CTC</div>
//           <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
//             Sum of all salaries
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center">
//               <span className="text-amber-800 text-sm font-bold">⏱️</span>
//             </div>
//             <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Hours</span>
//           </div>
//           <div className="text-xl font-bold text-gray-900 mb-1 text-left">{totals.totalOvertimeHours.toFixed(1)}</div>
//           <div className="text-sm font-bold text-gray-700 mb-2 text-left">Overtime Hours</div>
//           <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
//             Total across all employees
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-8 h-8 rounded-lg bg-sky-200 flex items-center justify-center">
//               <span className="text-sky-800 text-sm font-bold">💵</span>
//             </div>
//             <span className="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">Net Pay</span>
//           </div>
//           <div className="text-base font-bold text-gray-900 mb-1 tracking-tight text-left">{formatValue(totals.totalJanuarySalary, 'currency')}</div>
//           <div className="text-sm font-bold text-gray-700 mb-2 text-left">Net Payroll</div>
//           <div className="text-xs font-medium text-gray-600 border-t border-slate-200 pt-2 text-left">
//             Total to pay employees
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PayrollTable;