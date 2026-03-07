// payroll table
import React, { useState, useMemo, useRef } from 'react';
import { Button } from './UI';
import { CheckIcon } from './Icons';
import * as XLSX from 'xlsx';

interface PayrollEntry {
  id: string;
  employeeId?: string;
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
  onDeleteEntry?: (entryId: string) => Promise<void>;
}

const PayrollTable: React.FC<PayrollTableProps> = ({
  entries,
  onUpdateCell,
  onSave,
  isSaving,
  month,
  year,
  periodStatus = 'draft',
  onRowClick,
  onDeleteEntry
}) => {
  const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [hoveredCell, setHoveredCell] = useState<{ entryId: string; field: string } | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
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
  
  // Get unique departments for filter
  const departments = useMemo(() => {
    return [...new Set(entries.map(e => e.department).filter(Boolean))].sort();
  }, [entries]);

  // Get status badge
  const getStatusBadge = () => {
    switch(periodStatus) {
      case 'generated':
        return <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-green-200">✓ Generated</span>;
      case 'calculated':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-blue-200">⟲ Calculated</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-amber-200">📝 Draft</span>;
    }
  };
  
  // Filtered entries based on search and filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Global search
      const globalMatch = globalFilter === '' || 
        entry.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        entry.designation?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        entry.department?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        entry.staffId?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        entry.sr?.toString().includes(globalFilter);
      
      // Department filter
      const deptMatch = departmentFilter === '' || entry.department === departmentFilter;
      
      // Status filter
      const statusMatch = statusFilter === '' || entry.status === statusFilter;
      
      return globalMatch && deptMatch && statusMatch;
    });
  }, [entries, globalFilter, departmentFilter, statusFilter]);
  
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
      let finalValue;
      
      // Check if the user deleted the value (empty string)
      if (editValue === '' || editValue === null || editValue === undefined) {
        finalValue = 0; // Treat empty as zero - this is a DELETE operation!
        console.log(`🗑️ Empty value detected for ${editingCell.field}, setting to 0`);
      } else {
        const numValue = parseFloat(editValue);
        finalValue = isNaN(numValue) ? editValue : numValue;
      }
      
      onUpdateCell(editingCell.entryId, editingCell.field, finalValue);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
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


  // const handleRowClick = (entry: PayrollEntry, event: React.MouseEvent) => {
  //   console.log('🔵 ROW CLICKED - Entry:', entry.name);
    
  //   // If this is a double click, don't navigate
  //   if (isDoubleClick) {
  //     console.log('⛔ Double click detected, preventing navigation');
  //     event.preventDefault();
  //     event.stopPropagation();
  //     return;
  //   }
    
  //   // Get the actual element that was clicked
  //   const target = event.target as HTMLElement;
    
  //   // Check if clicking on interactive elements that should NOT trigger navigation
  //   if (
  //     target instanceof HTMLInputElement || 
  //     target.closest('button') || 
  //     target.closest('input') ||
  //     target.closest('select') ||
  //     target.closest('textarea')
  //   ) {
  //     console.log('⛔ Clicked on interactive element, preventing navigation');
  //     event.stopPropagation();
  //     return;
  //   }
    
  //   // Check if clicking on an editable cell (but only when in edit mode)
  //   const td = target.closest('td');
  //   if (td) {
  //     const field = td.getAttribute('data-field');
  //     const column = columns.find(c => c.key === field);
      
  //     // Only block navigation if this is an editable column AND we're in edit mode
  //     if (column?.editable && isTableEditable && editingCell?.entryId === entry.id && editingCell?.field === field) {
  //       console.log('⛔ Clicked on actively editing cell, preventing navigation');
  //       return;
  //     }
  //   }
    
  //   // Clear any pending timers
  //   if (doubleClickTimerRef.current) {
  //     clearTimeout(doubleClickTimerRef.current);
  //     doubleClickTimerRef.current = null;
  //   }
    
  //   if (clickTimerRef.current) {
  //     clearTimeout(clickTimerRef.current);
  //     clickTimerRef.current = null;
  //   }
    
  //   // Prevent default but don't stop propagation aggressively
  //   event.preventDefault();
    
  //   console.log('✅ Proceeding with navigation for:', entry.name);
    
  //   // Navigate immediately
  //   if (onRowClick) {
  //     onRowClick(entry);
  //   } else {
  //     console.error('❌ onRowClick is not defined');
  //   }
  // };
  const handleRowClick = (entry: PayrollEntry, event: React.MouseEvent) => {
    console.log('🔵 ROW CLICKED - Entry:', entry.name);
    
    // CRITICAL: Always check if clicking on input or button first
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target.closest('button')) {
      console.log('⛔ Clicked on input or button, preventing navigation');
      event.stopPropagation();
      return;
    }

    // Check if clicking on editable cell
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
    entry: PayrollEntry,
    event: React.MouseEvent  // Add event parameter
  ) => {
    // Stop propagation immediately to prevent row click
    event.stopPropagation();
    event.preventDefault();
    
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
    }, 300);
    
    // Handle cell edit
    handleCellClick(entryId, field, value, true);
  };

  const handleCellMouseEnter = (entryId: string, field: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    hoverTimerRef.current = setTimeout(() => {
      setHoveredCell({ entryId, field });
    }, 2000);
  };

  const handleCellMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    setHoveredCell(null);
  };

  const handleDeleteClick = async (entryId: string) => {
    if (!isTableEditable) {
      alert('Cannot delete entries from a generated payroll');
      return;
    }
    setShowDeleteConfirm(entryId);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm || !onDeleteEntry) return;
    
    setDeletingId(showDeleteConfirm);
    try {
      await onDeleteEntry(showDeleteConfirm);
      
      // SR numbers will be updated by the parent component
      // The parent should handle renumbering when it updates the entries
      
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const totals = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => {
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
  }, [filteredEntries]);

  const handleExcelDownload = () => {
    const monthName = filteredEntries.length > 0 ? filteredEntries[0].month : months[month - 1];
    const yearVal = filteredEntries.length > 0 ? filteredEntries[0].year : year;

    // Build header rows
    const groupHeaderRow: string[] = [];
    const columnHeaderRow: string[] = [];

    columns.forEach((col) => {
      if (columnVisibility[col.key] === false) return;
      groupHeaderRow.push(col.group);
      columnHeaderRow.push(col.label);
    });

    // Build data rows
    const dataRows = filteredEntries.map((entry) =>
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
        return filteredEntries.reduce((sum, e) => sum + ((e as any)[col.key] || 0), 0);
      }
      return '';
    });

    const wsData = [groupHeaderRow, columnHeaderRow, ...dataRows, totalsRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style: column widths
    ws['!cols'] = visibleColumns.map((col) => ({ wch: Math.max(col.label.length + 2, 14) }));

    // Merge group header cells
    const merges: XLSX.Range[] = [];
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

  const clearFilters = () => {
    setGlobalFilter('');
    setDepartmentFilter('');
    setStatusFilter('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Employee from Payroll</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this employee from the payroll? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={!!deletingId}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={!!deletingId}
              >
                {deletingId === showDeleteConfirm ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with status - Professional Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Payroll • <span className="text-indigo-600">
                {filteredEntries.length > 0 ? filteredEntries[0].month : months[month-1]} {filteredEntries.length > 0 ? filteredEntries[0].year : year}
              </span>
            </h2>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-gray-600 mt-1.5 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            {filteredEntries.length} of {entries.length} employees • {filteredEntries.length > 0 ? filteredEntries[0].totalDays - filteredEntries[0].offDays : 0} working days
            {!isTableEditable && <span className="ml-2 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-1 rounded-full">Read-only</span>}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Download Excel Button */}
          <button
            onClick={handleExcelDownload}
            disabled={filteredEntries.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download Excel</span>
          </button>

          {/* Generate button */}
          {isTableEditable ? (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm"
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
                  <span className="hidden sm:inline">Generate Payroll</span>
                </>
              )}
            </Button>
          ) : (
            <div className="bg-green-100 text-green-800 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-200">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Generated</span>
            </div>
          )}
        </div>
      </div>

      {/* Read-only warning */}
      {!isTableEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-center gap-2">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>This payroll has been generated and is now read-only. No edits can be made.</span>
        </div>
      )}

      {/* Filters Section - Like Personnel Page */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search by name, designation, department..."
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-40">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="calculated">Calculated</option>
              <option value="generated">Generated</option>
            </select>
          </div>

          {(globalFilter || departmentFilter || statusFilter) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Filter summary */}
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <span>Showing <span className="font-semibold text-gray-900">{filteredEntries.length}</span> of {entries.length} entries</span>
          {(globalFilter || departmentFilter || statusFilter) && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
              Filtered
            </span>
          )}
        </div>
      </div>

      {/* Column chooser */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <details className="group">
          <summary className="flex items-center cursor-pointer px-5 py-3.5 text-sm font-medium text-gray-700 hover:text-indigo-600 bg-slate-50">
            <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Show/Hide Columns</span>
            <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {Object.keys(columnVisibility).filter(k => columnVisibility[k] !== false).length}/{columns.length}
            </span>
            <svg className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {columns.map(col => (
                <label key={col.key} className="flex items-center space-x-2 text-sm hover:bg-slate-50 p-1.5 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={columnVisibility[col.key] !== false}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
                      className={`px-4 py-3 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 ${group.color}`}
                    >
                      {group.name}
                    </th>
                  );
                })}
                {/* Actions column header */}
                <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 bg-slate-300 text-slate-900">
                  ACTIONS
                </th>
              </tr>
              <tr>
                {columns.map((col, idx) => (
                  columnVisibility[col.key] !== false && (
                    <th
                      key={idx}
                      className={`px-4 py-3 text-xs font-bold border border-slate-300 ${
                        col.editable ? 'bg-white' : 'bg-slate-100'
                      } sticky top-[41px] z-10 text-gray-800 text-left`}
                      style={{ minWidth: col.width, maxWidth: col.width }}
                    >
                      <div className="flex flex-col items-start">
                        <span>{col.label}</span>
                        {col.editable && isTableEditable && (
                          <span className="text-[8px] text-indigo-600 mt-1 font-normal">double-click</span>
                        )}
                      </div>
                    </th>
                  )
                ))}
                {/* Empty cell for actions header alignment */}
                <th className="px-4 py-3 border border-slate-300 bg-slate-100 sticky top-[41px] z-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(c => columnVisibility[c.key] !== false).length + 1} className="text-center py-16 text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="font-medium">No matching entries found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => (
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
                        cellBg = 'bg-indigo-50';
                      } else if (col.key.includes('deduction') || col.key.includes('Deductions') || col.key.includes('fines') || col.key.includes('visaCost')) {
                        cellBg = 'bg-rose-50';
                      } else if (col.key.includes('overtime') || col.key === 'ot') {
                        cellBg = 'bg-cyan-50';
                      }
                      
                      const isHovered = hoveredCell?.entryId === entry.id && hoveredCell?.field === col.key;
                      
                      return (
                        <td
                          key={`${entry.id}-${colIdx}`}
                          className={`px-4 py-2.5 border border-slate-200 ${
                            isFieldEditable ? 'relative' : ''
                          } ${cellBg} text-left`}
                          data-field={col.key}
                          onMouseEnter={() => isFieldEditable && !isEditing && handleCellMouseEnter(entry.id, col.key)}
                          onMouseLeave={handleCellMouseLeave}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (clickTimerRef.current) {
                              clearTimeout(clickTimerRef.current);
                              clickTimerRef.current = null;
                            }
                            handleCellDoubleClick(entry.id, col.key, value, isFieldEditable, entry, e);
                          }}
                        >
                          {/* Tooltip */}
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
                              className="w-full px-2 py-1 border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left font-bold text-gray-900"
                              step="0.01"
                              placeholder="0" // Add placeholder
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className={`font-mono text-sm font-bold ${
                              col.format === 'currency' ? 'tracking-wide' : ''
                            } ${
                              Number(value) < 0 ? 'text-rose-700' : 
                              Number(value) > 0 && (col.key === 'total' || col.key === 'totalJanuarySalary') ? 'text-indigo-700' : 
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
                    
                    {/* Actions cell with delete button */}
                    <td className="px-4 py-2.5 border border-slate-200 text-center">
                      {isTableEditable && entry.isEditable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(entry.id);
                          }}
                          disabled={deletingId === entry.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete from payroll"
                        >
                          {deletingId === entry.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              
              {/* Grand total row */}
              {filteredEntries.length > 0 && (
                <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
                  <td className="px-4 py-3 text-left text-sm border border-slate-400 font-bold text-gray-900" colSpan={4}>GRAND TOTAL:</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold" colSpan={2}>—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {filteredEntries[0]?.totalDays?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {filteredEntries[0]?.offDays?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalLeave?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalWorkedDays?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCTC, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalOffDaysWorked?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOffDayAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalHolidayWorked?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalHolidayAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalLeaveSalary || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCashAdvance || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalPenaltyPoints?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalEarnings, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalVisaCost || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFines || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCleaningFees || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalAbsences?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalUnauthorizedAbsences?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalLateHours?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalAuthDeduction || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalUnauthDeduction || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalTardiness || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-rose-700 font-bold bg-white/80">{formatValue(totals.totalDeductions, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalOvertimeHours?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOvertimeAmount || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalNetDeductions || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalExtraFromManager || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBackPayment || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFinalModification || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalNetSalary, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalJanuarySalary, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBeforeOT || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOT || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCalculated || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-amber-700 font-bold bg-white/80">{formatValue(totals.totalDfrnce, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalDeductionsFinal || 0, 'currency')}</td>
                  <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
                    {totals.totalInDays?.toString() || '0'}
                  </td>
                  <td className="px-4 py-2 border border-slate-400 bg-white/80"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards - Professional design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 text-lg">📅</span>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">Period</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {filteredEntries.length > 0 ? (filteredEntries[0].totalDays - filteredEntries[0].offDays) : '0'}
          </div>
          <div className="text-sm font-medium text-gray-600 mb-2">Working Days</div>
          <div className="flex justify-between text-xs text-gray-500 border-t border-slate-200 pt-3">
            <span>Total: {filteredEntries[0]?.totalDays || 0}d</span>
            <span>Off: {filteredEntries[0]?.offDays || 0}d</span>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 text-lg">👥</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Active</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totals.totalEmployees}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Employees</div>
          <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
            Active this period
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <span className="text-purple-700 text-lg">💰</span>
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">CTC</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1 tracking-tight">{formatValue(totals.totalCTC, 'currency')}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Total CTC</div>
          <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
            Sum of all salaries
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700 text-lg">⏱️</span>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Hours</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totals.totalOvertimeHours.toFixed(1)}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Overtime Hours</div>
          <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
            Total across all employees
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-700 text-lg">💵</span>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">Net Pay</span>
          </div>
          <div className="text-lg font-bold text-gray-900 mb-1 tracking-tight">{formatValue(totals.totalJanuarySalary, 'currency')}</div>
          <div className="text-sm font-medium text-gray-600 mb-2">Net Payroll</div>
          <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
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
//   employeeId?: string;
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
//   onDeleteEntry?: (entryId: string) => Promise<void>;
// }

// const PayrollTable: React.FC<PayrollTableProps> = ({
//   entries,
//   onUpdateCell,
//   onSave,
//   isSaving,
//   month,
//   year,
//   periodStatus = 'draft',
//   onRowClick,
//   onDeleteEntry
// }) => {
//   const [editingCell, setEditingCell] = useState<{ entryId: string; field: string } | null>(null);
//   const [editValue, setEditValue] = useState<string>('');
//   const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
//   const [hoveredCell, setHoveredCell] = useState<{ entryId: string; field: string } | null>(null);
//   const [globalFilter, setGlobalFilter] = useState('');
//   const [departmentFilter, setDepartmentFilter] = useState('');
//   const [statusFilter, setStatusFilter] = useState('');
//   const [deletingId, setDeletingId] = useState<string | null>(null);
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
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
  
//   // Get unique departments for filter
//   const departments = useMemo(() => {
//     return [...new Set(entries.map(e => e.department).filter(Boolean))].sort();
//   }, [entries]);

//   // Get status badge
//   const getStatusBadge = () => {
//     switch(periodStatus) {
//       case 'generated':
//         return <span className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-green-200">✓ Generated</span>;
//       case 'calculated':
//         return <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-blue-200">⟲ Calculated</span>;
//       default:
//         return <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-amber-200">📝 Draft</span>;
//     }
//   };
  
//   // Filtered entries based on search and filters
//   const filteredEntries = useMemo(() => {
//     return entries.filter(entry => {
//       // Global search
//       const globalMatch = globalFilter === '' || 
//         entry.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         entry.designation?.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         entry.department?.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         entry.staffId?.toLowerCase().includes(globalFilter.toLowerCase()) ||
//         entry.sr?.toString().includes(globalFilter);
      
//       // Department filter
//       const deptMatch = departmentFilter === '' || entry.department === departmentFilter;
      
//       // Status filter
//       const statusMatch = statusFilter === '' || entry.status === statusFilter;
      
//       return globalMatch && deptMatch && statusMatch;
//     });
//   }, [entries, globalFilter, departmentFilter, statusFilter]);
  
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
//       let finalValue;
      
//       // Check if the user deleted the value (empty string)
//       if (editValue === '' || editValue === null || editValue === undefined) {
//         finalValue = 0; // Treat empty as zero - this is a DELETE operation!
//         console.log(`🗑️ Empty value detected for ${editingCell.field}, setting to 0`);
//       } else {
//         const numValue = parseFloat(editValue);
//         finalValue = isNaN(numValue) ? editValue : numValue;
//       }
      
//       onUpdateCell(editingCell.entryId, editingCell.field, finalValue);
//       setEditingCell(null);
//     }
//   };

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
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
//     console.log('🔵 ROW CLICKED - Entry:', entry.name);
    
//     // Get the actual element that was clicked
//     const target = event.target as HTMLElement;
    
//     // Check if clicking on interactive elements that should NOT trigger navigation
//     if (
//       target instanceof HTMLInputElement || 
//       target.closest('button') || 
//       target.closest('input') ||
//       target.closest('select') ||
//       target.closest('textarea')
//     ) {
//       console.log('⛔ Clicked on interactive element, preventing navigation');
//       event.stopPropagation();
//       return;
//     }
    
//     // Check if clicking on an editable cell (but only when in edit mode)
//     const td = target.closest('td');
//     if (td) {
//       const field = td.getAttribute('data-field');
//       const column = columns.find(c => c.key === field);
      
//       // Only block navigation if this is an editable column AND we're in edit mode
//       if (column?.editable && isTableEditable && editingCell?.entryId === entry.id && editingCell?.field === field) {
//         console.log('⛔ Clicked on actively editing cell, preventing navigation');
//         return;
//       }
      
//       // Don't block navigation for regular cell clicks - they should navigate
//     }
    
//     // CRITICAL: Reset double-click flag
//     if (isDoubleClick) {
//       console.log('⛔ Double click detected, resetting flag');
//       setIsDoubleClick(false);
//       return;
//     }
    
//     // Clear any pending timers
//     if (doubleClickTimerRef.current) {
//       clearTimeout(doubleClickTimerRef.current);
//       doubleClickTimerRef.current = null;
//     }
    
//     if (clickTimerRef.current) {
//       clearTimeout(clickTimerRef.current);
//       clickTimerRef.current = null;
//     }
    
//     // Prevent default but don't stop propagation aggressively
//     event.preventDefault();
    
//     console.log('✅ Proceeding with navigation for:', entry.name);
    
//     // Navigate immediately
//     if (onRowClick) {
//       onRowClick(entry);
//     } else {
//       console.error('❌ onRowClick is not defined');
//     }
//   };
//   // const handleRowClick = (entry: PayrollEntry, event: React.MouseEvent) => {
//   //   console.log('🔵 ROW CLICKED - Entry:', entry.name);
    
//   //   // CRITICAL: Always check if clicking on input or button first
//   //   const target = event.target as HTMLElement;
//   //   if (target instanceof HTMLInputElement || target.closest('button')) {
//   //     console.log('⛔ Clicked on input or button, preventing navigation');
//   //     event.stopPropagation();
//   //     return;
//   //   }

//   //   // Check if clicking on editable cell
//   //   const td = target.closest('td');
//   //   if (td) {
//   //     const field = td.getAttribute('data-field');
//   //     const column = columns.find(c => c.key === field);
      
//   //     // If this is an editable column and table is editable, let cell handle it
//   //     if (column?.editable && isTableEditable) {
//   //       console.log('⛔ Clicked on editable cell, preventing navigation');
//   //       return; // Don't navigate
//   //     }
//   //   }
    
//   //   // CRITICAL: Reset double-click flag immediately
//   //   if (isDoubleClick) {
//   //     console.log('⛔ Double click detected, resetting flag');
//   //     setIsDoubleClick(false);
//   //   }
    
//   //   // Clear any pending timers
//   //   if (doubleClickTimerRef.current) {
//   //     clearTimeout(doubleClickTimerRef.current);
//   //     doubleClickTimerRef.current = null;
//   //   }
    
//   //   if (clickTimerRef.current) {
//   //     clearTimeout(clickTimerRef.current);
//   //     clickTimerRef.current = null;
//   //   }
    
//   //   console.log('✅ Proceeding with navigation for:', entry.name);
//   //   onRowClick?.(entry);
//   // };

//   const handleCellDoubleClick = (
//     entryId: string, 
//     field: string, 
//     value: any, 
//     isFieldEditable: boolean,
//     entry: PayrollEntry
//   ) => {
//     if (!isFieldEditable) return;
    
//     console.log('🖱️ DOUBLE CLICK on cell - starting edit');
    
//     // CRITICAL: Set flag BEFORE anything else
//     setIsDoubleClick(true);
    
//     // Clear any existing timers
//     if (clickTimerRef.current) {
//       clearTimeout(clickTimerRef.current);
//       clickTimerRef.current = null;
//     }
    
//     if (doubleClickTimerRef.current) {
//       clearTimeout(doubleClickTimerRef.current);
//     }
    
//     // Reset flag after a delay
//     doubleClickTimerRef.current = setTimeout(() => {
//       console.log('⏰ Resetting double-click flag');
//       setIsDoubleClick(false);
//     }, 300);
    
//     // Handle cell edit
//     handleCellClick(entryId, field, value, true);
//   };

//   const handleCellMouseEnter = (entryId: string, field: string) => {
//     if (hoverTimerRef.current) {
//       clearTimeout(hoverTimerRef.current);
//     }
    
//     hoverTimerRef.current = setTimeout(() => {
//       setHoveredCell({ entryId, field });
//     }, 2000);
//   };

//   const handleCellMouseLeave = () => {
//     if (hoverTimerRef.current) {
//       clearTimeout(hoverTimerRef.current);
//     }
//     setHoveredCell(null);
//   };

//   const handleDeleteClick = async (entryId: string) => {
//     if (!isTableEditable) {
//       alert('Cannot delete entries from a generated payroll');
//       return;
//     }
//     setShowDeleteConfirm(entryId);
//   };

//   const confirmDelete = async () => {
//     if (!showDeleteConfirm || !onDeleteEntry) return;
    
//     setDeletingId(showDeleteConfirm);
//     try {
//       await onDeleteEntry(showDeleteConfirm);
      
//       // SR numbers will be updated by the parent component
//       // The parent should handle renumbering when it updates the entries
      
//     } finally {
//       setDeletingId(null);
//       setShowDeleteConfirm(null);
//     }
//   };

//   const totals = useMemo(() => {
//     return filteredEntries.reduce((acc, entry) => {
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
//   }, [filteredEntries]);

//   const handleExcelDownload = () => {
//     const monthName = filteredEntries.length > 0 ? filteredEntries[0].month : months[month - 1];
//     const yearVal = filteredEntries.length > 0 ? filteredEntries[0].year : year;

//     // Build header rows
//     const groupHeaderRow: string[] = [];
//     const columnHeaderRow: string[] = [];

//     columns.forEach((col) => {
//       if (columnVisibility[col.key] === false) return;
//       groupHeaderRow.push(col.group);
//       columnHeaderRow.push(col.label);
//     });

//     // Build data rows
//     const dataRows = filteredEntries.map((entry) =>
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
//         return filteredEntries.reduce((sum, e) => sum + ((e as any)[col.key] || 0), 0);
//       }
//       return '';
//     });

//     const wsData = [groupHeaderRow, columnHeaderRow, ...dataRows, totalsRow];
//     const ws = XLSX.utils.aoa_to_sheet(wsData);

//     // Style: column widths
//     ws['!cols'] = visibleColumns.map((col) => ({ wch: Math.max(col.label.length + 2, 14) }));

//     // Merge group header cells
//     const merges: XLSX.Range[] = [];
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

//   const clearFilters = () => {
//     setGlobalFilter('');
//     setDepartmentFilter('');
//     setStatusFilter('');
//   };

//   return (
//     <div className="space-y-6 font-sans">
//       {/* Delete Confirmation Modal */}
//       {showDeleteConfirm && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
//             <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Employee from Payroll</h3>
//             <p className="text-gray-600 mb-6">Are you sure you want to delete this employee from the payroll? This action cannot be undone.</p>
//             <div className="flex justify-end gap-3">
//               <button
//                 onClick={() => setShowDeleteConfirm(null)}
//                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//                 disabled={!!deletingId}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={confirmDelete}
//                 className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
//                 disabled={!!deletingId}
//               >
//                 {deletingId === showDeleteConfirm ? (
//                   <>
//                     <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                     </svg>
//                     <span>Deleting...</span>
//                   </>
//                 ) : (
//                   'Delete'
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Header with status - Professional Card */}
//       <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
//         <div>
//           <div className="flex items-center gap-3 flex-wrap">
//             <h2 className="text-xl font-bold text-gray-900 tracking-tight">
//               Payroll • <span className="text-indigo-600">
//                 {filteredEntries.length > 0 ? filteredEntries[0].month : months[month-1]} {filteredEntries.length > 0 ? filteredEntries[0].year : year}
//               </span>
//             </h2>
//             {getStatusBadge()}
//           </div>
//           <p className="text-sm text-gray-600 mt-1.5 flex items-center gap-2">
//             <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
//             {filteredEntries.length} of {entries.length} employees • {filteredEntries.length > 0 ? filteredEntries[0].totalDays - filteredEntries[0].offDays : 0} working days
//             {!isTableEditable && <span className="ml-2 text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-1 rounded-full">Read-only</span>}
//           </p>
//         </div>
        
//         <div className="flex items-center gap-3 w-full md:w-auto">
//           {/* Download Excel Button */}
//           <button
//             onClick={handleExcelDownload}
//             disabled={filteredEntries.length === 0}
//             className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm"
//           >
//             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
//             </svg>
//             <span className="hidden sm:inline">Download Excel</span>
//           </button>

//           {/* Generate button */}
//           {isTableEditable ? (
//             <Button
//               onClick={onSave}
//               disabled={isSaving}
//               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 flex items-center gap-2 text-sm"
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
//                   <span className="hidden sm:inline">Generate Payroll</span>
//                 </>
//               )}
//             </Button>
//           ) : (
//             <div className="bg-green-100 text-green-800 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-green-200">
//               <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//               </svg>
//               <span>Generated</span>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Read-only warning */}
//       {!isTableEditable && (
//         <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm flex items-center gap-2">
//           <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//           </svg>
//           <span>This payroll has been generated and is now read-only. No edits can be made.</span>
//         </div>
//       )}

//       {/* Filters Section - Like Personnel Page */}
//       <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
//         <div className="flex flex-col md:flex-row gap-4">
//           <div className="flex-1">
//             <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
//               Search
//             </label>
//             <div className="relative">
//               <input
//                 type="text"
//                 value={globalFilter}
//                 onChange={(e) => setGlobalFilter(e.target.value)}
//                 placeholder="Search by name, designation, department..."
//                 className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
//               />
//               {globalFilter && (
//                 <button
//                   onClick={() => setGlobalFilter('')}
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                 >
//                   ✕
//                 </button>
//               )}
//             </div>
//           </div>
          
//           <div className="w-full md:w-48">
//             <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
//               Department
//             </label>
//             <select
//               value={departmentFilter}
//               onChange={(e) => setDepartmentFilter(e.target.value)}
//               className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
//             >
//               <option value="">All Departments</option>
//               {departments.map(dept => (
//                 <option key={dept} value={dept}>{dept}</option>
//               ))}
//             </select>
//           </div>
          
//           <div className="w-full md:w-40">
//             <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
//               Status
//             </label>
//             <select
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//               className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
//             >
//               <option value="">All</option>
//               <option value="draft">Draft</option>
//               <option value="calculated">Calculated</option>
//               <option value="generated">Generated</option>
//             </select>
//           </div>

//           {(globalFilter || departmentFilter || statusFilter) && (
//             <div className="flex items-end">
//               <button
//                 onClick={clearFilters}
//                 className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//               >
//                 Clear Filters
//               </button>
//             </div>
//           )}
//         </div>

//         {/* Filter summary */}
//         <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
//           <span>Showing <span className="font-semibold text-gray-900">{filteredEntries.length}</span> of {entries.length} entries</span>
//           {(globalFilter || departmentFilter || statusFilter) && (
//             <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
//               Filtered
//             </span>
//           )}
//         </div>
//       </div>

//       {/* Column chooser */}
//       <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
//         <details className="group">
//           <summary className="flex items-center cursor-pointer px-5 py-3.5 text-sm font-medium text-gray-700 hover:text-indigo-600 bg-slate-50">
//             <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//             </svg>
//             <span>Show/Hide Columns</span>
//             <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
//               {Object.keys(columnVisibility).filter(k => columnVisibility[k] !== false).length}/{columns.length}
//             </span>
//             <svg className="w-4 h-4 ml-auto group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//             </svg>
//           </summary>
//           <div className="p-4 border-t border-slate-200 bg-white">
//             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
//               {columns.map(col => (
//                 <label key={col.key} className="flex items-center space-x-2 text-sm hover:bg-slate-50 p-1.5 rounded transition-colors">
//                   <input
//                     type="checkbox"
//                     checked={columnVisibility[col.key] !== false}
//                     onChange={() => toggleColumn(col.key)}
//                     className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
//                   />
//                   <span className="text-gray-700 truncate">{col.label}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//         </details>
//       </div>

//       {/* Table */}
//       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
//                       className={`px-4 py-3 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 ${group.color}`}
//                     >
//                       {group.name}
//                     </th>
//                   );
//                 })}
//                 {/* Actions column header */}
//                 <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider border border-slate-300 bg-slate-300 text-slate-900">
//                   ACTIONS
//                 </th>
//               </tr>
//               <tr>
//                 {columns.map((col, idx) => (
//                   columnVisibility[col.key] !== false && (
//                     <th
//                       key={idx}
//                       className={`px-4 py-3 text-xs font-bold border border-slate-300 ${
//                         col.editable ? 'bg-white' : 'bg-slate-100'
//                       } sticky top-[41px] z-10 text-gray-800 text-left`}
//                       style={{ minWidth: col.width, maxWidth: col.width }}
//                     >
//                       <div className="flex flex-col items-start">
//                         <span>{col.label}</span>
//                         {col.editable && isTableEditable && (
//                           <span className="text-[8px] text-indigo-600 mt-1 font-normal">double-click</span>
//                         )}
//                       </div>
//                     </th>
//                   )
//                 ))}
//                 {/* Empty cell for actions header alignment */}
//                 <th className="px-4 py-3 border border-slate-300 bg-slate-100 sticky top-[41px] z-10"></th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredEntries.length === 0 ? (
//                 <tr>
//                   <td colSpan={columns.filter(c => columnVisibility[c.key] !== false).length + 1} className="text-center py-16 text-gray-500">
//                     <div className="flex flex-col items-center gap-3">
//                       <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                       </svg>
//                       <p className="font-medium">No matching entries found</p>
//                       <p className="text-sm">Try adjusting your search or filters</p>
//                     </div>
//                   </td>
//                 </tr>
//               ) : (
//                 filteredEntries.map((entry, index) => (
//                   <tr 
//                     key={entry.id} 
//                     onClick={(e) => handleRowClick(entry, e)}
//                     className={`border-b border-gray-200 cursor-pointer hover:bg-indigo-50 transition-colors ${
//                       index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
//                     }`}
//                   >
//                     {columns.map((col, colIdx) => {
//                       if (columnVisibility[col.key] === false) return null;
                      
//                       const value = entry[col.key as keyof PayrollEntry];
//                       const isEditing = editingCell?.entryId === entry.id && editingCell?.field === col.key;
                      
//                       // Check if this specific field should be editable
//                       const isFieldEditable = col.editable && isTableEditable && entry.isEditable === true;
                      
//                       let cellBg = '';
//                       if (col.key === 'total' || col.key === 'totalJanuarySalary' || col.key === 'januaryNetSalary') {
//                         cellBg = 'bg-indigo-50';
//                       } else if (col.key.includes('deduction') || col.key.includes('Deductions') || col.key.includes('fines') || col.key.includes('visaCost')) {
//                         cellBg = 'bg-rose-50';
//                       } else if (col.key.includes('overtime') || col.key === 'ot') {
//                         cellBg = 'bg-cyan-50';
//                       }
                      
//                       const isHovered = hoveredCell?.entryId === entry.id && hoveredCell?.field === col.key;
                      
//                       return (
//                         <td
//                           key={`${entry.id}-${colIdx}`}
//                           className={`px-4 py-2.5 border border-slate-200 ${
//                             isFieldEditable ? 'relative' : ''
//                           } ${cellBg} text-left`}
//                           data-field={col.key}
//                           onMouseEnter={() => isFieldEditable && !isEditing && handleCellMouseEnter(entry.id, col.key)}
//                           onMouseLeave={handleCellMouseLeave}
//                           onDoubleClick={(e) => {
//                             e.stopPropagation();
//                             e.preventDefault();
//                             if (clickTimerRef.current) {
//                               clearTimeout(clickTimerRef.current);
//                               clickTimerRef.current = null;
//                             }
//                             handleCellDoubleClick(entry.id, col.key, value, isFieldEditable, entry);
//                           }}
//                         >
//                           {/* Tooltip */}
//                           {isFieldEditable && !isEditing && isHovered && (
//                             <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-lg">
//                               double-click to edit
//                               <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
//                             </div>
//                           )}
                          
//                           {isEditing && isFieldEditable ? (
//                             <input
//                               type={typeof value === 'number' ? 'number' : 'text'}
//                               value={editValue}
//                               onChange={(e) => setEditValue(e.target.value)}
//                               onBlur={handleCellSave}
//                               onKeyDown={handleKeyDown}
//                               autoFocus
//                               className="w-full px-2 py-1 border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 text-left font-bold text-gray-900"
//                               step="0.01"
//                               placeholder="0" // Add placeholder
//                               onClick={(e) => e.stopPropagation()}
//                               onDoubleClick={(e) => e.stopPropagation()}
//                               onMouseDown={(e) => e.stopPropagation()}
//                             />
//                           ) : (
//                             <div className={`font-mono text-sm font-bold ${
//                               col.format === 'currency' ? 'tracking-wide' : ''
//                             } ${
//                               Number(value) < 0 ? 'text-rose-700' : 
//                               Number(value) > 0 && (col.key === 'total' || col.key === 'totalJanuarySalary') ? 'text-indigo-700' : 
//                               'text-gray-900'
//                             }`}>
//                               {col.format === 'currency' 
//                                 ? formatValue(value, 'currency', col.key)
//                                 : formatValue(value, undefined, col.key)}
//                             </div>
//                           )}
//                         </td>
//                       );
//                     })}
                    
//                     {/* Actions cell with delete button */}
//                     <td className="px-4 py-2.5 border border-slate-200 text-center">
//                       {isTableEditable && entry.isEditable && (
//                         <button
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleDeleteClick(entry.id);
//                           }}
//                           disabled={deletingId === entry.id}
//                           className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
//                           title="Delete from payroll"
//                         >
//                           {deletingId === entry.id ? (
//                             <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
//                               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
//                             </svg>
//                           ) : (
//                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//                             </svg>
//                           )}
//                         </button>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
              
//               {/* Grand total row */}
//               {filteredEntries.length > 0 && (
//                 <tr className="bg-slate-300 text-gray-900 font-bold sticky bottom-0 border-t-2 border-slate-500">
//                   <td className="px-4 py-3 text-left text-sm border border-slate-400 font-bold text-gray-900" colSpan={4}>GRAND TOTAL:</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold" colSpan={2}>—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {filteredEntries[0]?.totalDays?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {filteredEntries[0]?.offDays?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalLeave?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalWorkedDays?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCTC, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalOffDaysWorked?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOffDayAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalHolidayWorked?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalHolidayAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalLeaveSalary || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCashAdvance || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalPenaltyPoints?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalEarnings, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalVisaCost || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFines || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCleaningFees || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalAbsences?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalUnauthorizedAbsences?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalLateHours?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalAuthDeduction || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalUnauthDeduction || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalTardiness || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-rose-700 font-bold bg-white/80">{formatValue(totals.totalDeductions, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalOvertimeHours?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOvertimeAmount || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalNetDeductions || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalExtraFromManager || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBackPayment || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalFinalModification || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalNetSalary, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">—</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-indigo-800 font-bold bg-white/80">{formatValue(totals.totalJanuarySalary, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalBeforeOT || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalOT || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalCalculated || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono text-amber-700 font-bold bg-white/80">{formatValue(totals.totalDfrnce, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 font-mono bg-white/80 text-gray-900 font-bold">{formatValue(totals.totalDeductionsFinal || 0, 'currency')}</td>
//                   <td className="px-4 py-2 text-left text-sm border border-slate-400 bg-white/80 text-gray-900 font-bold">
//                     {totals.totalInDays?.toString() || '0'}
//                   </td>
//                   <td className="px-4 py-2 border border-slate-400 bg-white/80"></td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Summary cards - Professional design */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
//         <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-3 mb-3">
//             <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
//               <span className="text-blue-700 text-lg">📅</span>
//             </div>
//             <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">Period</span>
//           </div>
//           <div className="text-2xl font-bold text-gray-900 mb-1">
//             {filteredEntries.length > 0 ? (filteredEntries[0].totalDays - filteredEntries[0].offDays) : '0'}
//           </div>
//           <div className="text-sm font-medium text-gray-600 mb-2">Working Days</div>
//           <div className="flex justify-between text-xs text-gray-500 border-t border-slate-200 pt-3">
//             <span>Total: {filteredEntries[0]?.totalDays || 0}d</span>
//             <span>Off: {filteredEntries[0]?.offDays || 0}d</span>
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-3 mb-3">
//             <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
//               <span className="text-emerald-700 text-lg">👥</span>
//             </div>
//             <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Active</span>
//           </div>
//           <div className="text-2xl font-bold text-gray-900 mb-1">{totals.totalEmployees}</div>
//           <div className="text-sm font-medium text-gray-600 mb-2">Employees</div>
//           <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
//             Active this period
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-3 mb-3">
//             <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
//               <span className="text-purple-700 text-lg">💰</span>
//             </div>
//             <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">CTC</span>
//           </div>
//           <div className="text-lg font-bold text-gray-900 mb-1 tracking-tight">{formatValue(totals.totalCTC, 'currency')}</div>
//           <div className="text-sm font-medium text-gray-600 mb-2">Total CTC</div>
//           <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
//             Sum of all salaries
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-3 mb-3">
//             <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
//               <span className="text-amber-700 text-lg">⏱️</span>
//             </div>
//             <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Hours</span>
//           </div>
//           <div className="text-2xl font-bold text-gray-900 mb-1">{totals.totalOvertimeHours.toFixed(1)}</div>
//           <div className="text-sm font-medium text-gray-600 mb-2">Overtime Hours</div>
//           <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
//             Total across all employees
//           </div>
//         </div>
        
//         <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
//           <div className="flex items-center gap-3 mb-3">
//             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
//               <span className="text-indigo-700 text-lg">💵</span>
//             </div>
//             <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">Net Pay</span>
//           </div>
//           <div className="text-lg font-bold text-gray-900 mb-1 tracking-tight">{formatValue(totals.totalJanuarySalary, 'currency')}</div>
//           <div className="text-sm font-medium text-gray-600 mb-2">Net Payroll</div>
//           <div className="text-xs text-gray-500 border-t border-slate-200 pt-3">
//             Total to pay employees
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PayrollTable;
