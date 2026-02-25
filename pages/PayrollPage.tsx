// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { Card, Button, Select } from '../components/UI';
// import { useHRData } from '../hooks/useHRData';
// import { useAuth } from '../contexts/AuthContext';
// import { api } from '../services/api';
// import PayrollTable from '../components/PayrollTable';
// import { useNavigate } from 'react-router-dom';
// import PayslipModal from '../components/PayslipModal';

// const months = [
//   { value: 1, name: 'January' }, { value: 2, name: 'February' }, 
//   { value: 3, name: 'March' }, { value: 4, name: 'April' },
//   { value: 5, name: 'May' }, { value: 6, name: 'June' },
//   { value: 7, name: 'July' }, { value: 8, name: 'August' },
//   { value: 9, name: 'September' }, { value: 10, name: 'October' },
//   { value: 11, name: 'November' }, { value: 12, name: 'December' }
// ];

// const currentYear = new Date().getFullYear();
// const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

// // Helper function to count weekends (Fridays and Saturdays) in a month
// const countWeekendDays = (year: number, month: number): number => {
//   const date = new Date(year, month - 1, 1);
//   const daysInMonth = new Date(year, month, 0).getDate();
//   let weekendCount = 0;
  
//   for (let day = 1; day <= daysInMonth; day++) {
//     date.setDate(day);
//     const dayOfWeek = date.getDay();
//     // Friday = 5, Saturday = 6
//     if (dayOfWeek === 5 || dayOfWeek === 6) {
//       weekendCount++;
//     }
//   }
  
//   return weekendCount;
// };

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

// const PayrollPage: React.FC = () => {
//   const { employees } = useHRData();
//   const { hasPermission, employeeDetails, isAdmin, isManager } = useAuth();
//   const canManage = hasPermission('canManagePayroll');
//   const navigate = useNavigate();

//   const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
//   const [selectedYear, setSelectedYear] = useState<number>(currentYear);
//   const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
//   const [payrollPeriodId, setPayrollPeriodId] = useState<string | null>(null);
//   const [periodStatus, setPeriodStatus] = useState<'draft' | 'calculated' | 'generated'>('draft');
//   const [isLoading, setIsLoading] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
//   const [activeTab, setActiveTab] = useState(canManage ? 'create' : 'view');
//   const [lastEmployeeUpdate, setLastEmployeeUpdate] = useState<number>(Date.now());
//   const [settingsPeriods, setSettingsPeriods] = useState<any[]>([]);
//   const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
//   const isGenerating = useRef(false);
//   const [selectedPayslip, setSelectedPayslip] = useState<PayrollEntry | null>(null);
//   const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
//   const [generatedPayrolls, setGeneratedPayrolls] = useState<any[]>([]);
//   const [isLoadingPayslips, setIsLoadingPayslips] = useState(false);
//   const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<string>('');
//   const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
//   const [periodEntries, setPeriodEntries] = useState<any[]>([]);
//   const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
//   const isLoadingPayroll = useRef(false);

//   // ============= LOCAL CALCULATION FUNCTION =============
//   const calculateEntryLocally = useCallback((entry: PayrollEntry): PayrollEntry => {
//     const calculated = { ...entry };
    
//     // Daily rate = CTC ÷ 30
//     calculated.dailyRate = entry.ctc > 0 ? Number((entry.ctc / 30).toFixed(2)) : 0;
    
//     // Hourly rate = Daily rate ÷ 10
//     calculated.hourlyRate = calculated.dailyRate > 0 ? Number((calculated.dailyRate / 10).toFixed(2)) : 0;
    
//     // Off day amount = 1.5 × (offDaysWorked × dailyRate)
//     calculated.offDayAmount = calculated.dailyRate > 0 
//       ? Number((1.5 * (entry.offDaysWorked || 0) * calculated.dailyRate).toFixed(2)) 
//       : 0;
    
//     // Holiday amount = 2 × (holidayWorked × dailyRate)
//     calculated.holidayAmount = calculated.dailyRate > 0 
//       ? Number((2 * (entry.holidayWorked || 0) * calculated.dailyRate).toFixed(2)) 
//       : 0;
    
//     // Basic salary = (CTC ÷ Total Days) × Worked Days
//     const basicSalary = entry.totalDays > 0 && entry.workedDays > 0
//       ? (entry.ctc / entry.totalDays) * entry.workedDays
//       : 0;
    
//     // TOTAL = Basic Salary + Leave Salary - Cash Advance + Off Day Amount + Holiday Amount
//     calculated.total = Number((
//       basicSalary +
//       (entry.leaveSalary || 0) -
//       (entry.cashAdvance || 0) +
//       (calculated.offDayAmount || 0) +
//       (calculated.holidayAmount || 0)
//     ).toFixed(2));
    
//     // Authorised Absence deduction = Absences × Daily Rate
//     calculated.authAbsenceDeduction = calculated.dailyRate > 0 
//       ? Number(((entry.absences || 0) * calculated.dailyRate).toFixed(2)) 
//       : 0;
    
//     // Unauthorised Absence deduction = Unauthorized Absences × Daily Rate
//     calculated.unauthAbsenceDeduction = calculated.dailyRate > 0 
//       ? Number(((entry.unauthorizedAbsences || 0) * calculated.dailyRate).toFixed(2)) 
//       : 0;
    
//     // Tardiness = Hourly Rate × Late Hours
//     calculated.tardiness = calculated.hourlyRate > 0 
//       ? Number(((entry.lateHours || 0) * calculated.hourlyRate).toFixed(2)) 
//       : 0;
    
//     // All Deductions = VISA COST + (Auth + Unauth + Tardiness) + Fines + Cleaning
//     calculated.allDeductions = Number((
//       (entry.visaCost || 0) +
//       (calculated.authAbsenceDeduction || 0) +
//       (calculated.unauthAbsenceDeduction || 0) +
//       (calculated.tardiness || 0) +
//       (entry.fines || 0) +
//       (entry.cleaningFees || 0)
//     ).toFixed(2));
    
//     // Overtime amount = Overtime Hours × Hourly Rate × 1
//     calculated.overtimeAmount = calculated.hourlyRate > 0 
//       ? Number(((entry.overtimeHours || 0) * calculated.hourlyRate * 1).toFixed(2)) 
//       : 0;
    
//     // Net deductions = Overtime Amount - All Deductions
//     calculated.netDeductions = Number(((calculated.overtimeAmount || 0) - (calculated.allDeductions || 0)).toFixed(2));
    
//     // January Net Salary = TOTAL + Net deductions + Extra from manager
//     calculated.januaryNetSalary = Number((
//       (calculated.total || 0) +
//       (calculated.netDeductions || 0) +
//       (entry.extraFromManager || 0)
//     ).toFixed(2));
    
//     // Total January Salary = January Net Salary + Back Payment
//     calculated.totalJanuarySalary = Number(((calculated.januaryNetSalary || 0) + (entry.backPayment || 0)).toFixed(2));
    
//     // Before OT = Total January Salary - Overtime Amount - Extra from manager
//     calculated.beforeOT = Number((
//       (calculated.totalJanuarySalary || 0) -
//       (calculated.overtimeAmount || 0) -
//       (entry.extraFromManager || 0)
//     ).toFixed(2));
    
//     // OT = Overtime Amount + Extra from manager
//     calculated.ot = Number(((calculated.overtimeAmount || 0) + (entry.extraFromManager || 0)).toFixed(2));
    
//     // Total Calculated = Before OT + OT
//     calculated.totalCalculated = Number(((calculated.beforeOT || 0) + (calculated.ot || 0)).toFixed(2));
    
//     // DFRNCE = Total January Salary - Total Calculated
//     calculated.dfrnce = Number(((calculated.totalJanuarySalary || 0) - (calculated.totalCalculated || 0)).toFixed(2));
    
//     // deductions = All Deductions + Cash Advance
//     calculated.deductions = Number(((calculated.allDeductions || 0) + (entry.cashAdvance || 0)).toFixed(2));
    
//     // in days = deductions ÷ Daily Rate
//     calculated.inDays = calculated.dailyRate > 0 
//       ? Number(((calculated.deductions || 0) / calculated.dailyRate).toFixed(2)) 
//       : 0;
    
//     calculated.isCalculated = true;
    
//     return calculated;
//   }, []);

//   // Check if payroll is editable
//   const isPayrollEditable = useCallback(() => {
//     return periodStatus !== 'generated';
//   }, [periodStatus]);


//   // ============= LOAD PAYROLL DATA WITH PARAMS =============
//   const loadPayrollDataWithParams = useCallback(async (month: number, year: number, retryCount = 0) => {
//     // Prevent multiple simultaneous calls
//     if (isLoadingPayroll.current) return;
    
//     isLoadingPayroll.current = true;
//     setIsLoading(true);

//     try {
//       console.log(`📂 Loading payroll for ${month}/${year}...`);  
//       const response = await api.getPayrollByMonth(year, month);

//       console.log('📦 API Response:', response); 
//       if (response && response.period) {

//         const status = response.period.status || 'draft';
//         console.log(`📊 Period status: ${status}`);
        
//         // Set period ID and status
//         setPayrollPeriodId(response.period._id);
//         setPeriodStatus(status);
        
//         // Handle entries
//         if (response.entries && response.entries.length > 0) {
//           console.log(`📝 Found ${response.entries.length} entries`);
          
//           const loadedEntries = response.entries.map((entry: any) => ({
//             ...entry,
//             id: entry._id || entry.id,
//             isEditable: entry.isEditable !== undefined ? entry.isEditable : (status !== 'generated'),
//             status: status
//           }));
          
//           // Calculate locally but preserve isEditable
//           const calculatedEntries = loadedEntries.map((entry: PayrollEntry) => {
//             const calculated = calculateEntryLocally(entry);
//             return {
//               ...calculated,
//               isEditable: entry.isEditable
//             };
//           });
          
//           setPayrollEntries(calculatedEntries);
//           console.log(`✅ Loaded ${calculatedEntries.length} entries`);
          
//         } else if (retryCount < 3) {
//           // Only retry up to 3 times
//           console.log(`⚠️ Period exists but no entries found - retry ${retryCount + 1}/3...`);
//           isLoadingPayroll.current = false;
//           setIsLoading(false);
          
//           // Wait and retry
//           setTimeout(() => {
//             loadPayrollDataWithParams(month, year, retryCount + 1);
//           }, 500);
//           return; // Exit early to keep loading state
//         } else {
//           console.log('❌ No entries found after 3 retries');
//           setPayrollEntries([]);
//         }
//       } else {
//         console.log(`📭 No payroll period found for ${month}/${year}`);
//         setPayrollEntries([]);
//         setPayrollPeriodId(null);
//         setPeriodStatus('draft');
//       }
//     } catch (error) {
//       console.error('❌ Error loading payroll:', error);
//       setPayrollEntries([]);
//       setPayrollPeriodId(null);
//       setPeriodStatus('draft');
//     } finally {
//       setIsLoading(false);
//       isLoadingPayroll.current = false;
//     }
//   }, [calculateEntryLocally]);


//   // ============= LOAD PAYROLL DATA =============
//   const loadPayrollData = useCallback(() => {
//     return loadPayrollDataWithParams(selectedMonth, selectedYear);
//   }, [selectedMonth, selectedYear, loadPayrollDataWithParams]);


//   // ============= HANDLE CELL UPDATE =============
//   const handleUpdateCell = useCallback(async (entryId: string, field: string, value: any) => {
//     // Prevent updates if period is generated
//     if (periodStatus === 'generated') {
//       alert('This payroll has been generated and cannot be edited.');
//       return;
//     }
    
//     // First update the UI optimistically
//     let updatedEntry: PayrollEntry | undefined;
    
//     setPayrollEntries(prev => {
//       const updatedEntries = prev.map(entry => {
//         if (entry.id === entryId) {
//           // Update the field
//           const updated = { ...entry, [field]: value };
//           // Recalculate
//           return calculateEntryLocally(updated);
//         }
//         return entry;
//       });
      
//       // Store the updated entry for later use
//       updatedEntry = updatedEntries.find(e => e.id === entryId);
//       return updatedEntries;
//     });
    
//     // Then save to database
//     if (!updatedEntry) return;
    
//     try {
//       if (entryId.startsWith('temp-')) {
//         // This is a new entry that needs to be created in the database
//         if (!payrollPeriodId) {
//           console.log('⏳ Waiting for period ID...');
//           return;
//         }
        
//         console.log('📤 Creating new entry in database');
        
//         // Prepare entry data without temp ID
//         const { id, ...entryData } = updatedEntry;
//         const entryToCreate = {
//           ...entryData,
//           payrollPeriodId: payrollPeriodId,
//           employeeId: updatedEntry.employeeId || null
//         };
        
//         // Save to database
//         const savedEntry = await api.createPayrollEntry(entryToCreate);
        
//         // Update the local state with the real ID
//         setPayrollEntries(prev => 
//           prev.map(e => 
//             e.id === entryId 
//               ? { ...savedEntry, id: savedEntry._id, isEditable: true }
//               : e
//           )
//         );
        
//         console.log('✅ Entry created with ID:', savedEntry._id);
        
//       } else {
//         // Existing entry - update only the single field
//         console.log(`📤 Updating existing entry:`, { entryId, field, value });
        
//         // ✅ FIX: Send only the field that changed
//         const updateData = { [field]: value };
//         await api.updatePayrollEntry(entryId, updateData);
//       }
//     } catch (error) {
//       console.error('❌ Error saving entry:', error);
//       alert('Failed to save changes. Please try again.');
      
//       // Reload data to ensure consistency
//       await loadPayrollData();
//     }
//   }, [calculateEntryLocally, periodStatus, payrollPeriodId, loadPayrollData]);


//   // ============= GENERATE PAYROLL =============
//   const handleGeneratePayroll = useCallback(async () => {
//     if (isGenerating.current) {
//       console.log('⏳ Generation already in progress');
//       return;
//     }
    
//     if (periodStatus === 'generated') {
//       alert('This payroll has already been generated and cannot be generated again.');
//       return;
//     }
    
//     if (!payrollPeriodId) {
//       alert('Error: No payroll period found. Please refresh the page.');
//       return;
//     }
    
//     isGenerating.current = true;
//     setIsSaving(true);
    
//     try {
//       console.log('💾 Generating payroll...');
      
//       // Calculate all entries locally first
//       const calculatedEntries = payrollEntries.map(entry => calculateEntryLocally(entry));
      
//       // Update each entry in the database
//       let updateCount = 0;
//       const updatePromises = [];
      
//       for (const entry of calculatedEntries) {
//         if (!entry.id.startsWith('temp-')) {
//           console.log(`📤 Finalizing entry ${entry.id} for ${entry.name}`);
          
//           const updateData = {
//             offDaysWorked: entry.offDaysWorked,
//             holidayWorked: entry.holidayWorked,
//             leaveSalary: entry.leaveSalary,
//             cashAdvance: entry.cashAdvance,
//             penaltyPoints: entry.penaltyPoints,
//             visaCost: entry.visaCost,
//             fines: entry.fines,
//             cleaningFees: entry.cleaningFees,
//             absences: entry.absences,
//             unauthorizedAbsences: entry.unauthorizedAbsences,
//             lateHours: entry.lateHours,
//             overtimeHours: entry.overtimeHours,
//             extraFromManager: entry.extraFromManager,
//             backPayment: entry.backPayment,
//             finalModification: entry.finalModification,
//             hrNotes: entry.hrNotes,
//             isEditable: false,
//             isCalculated: true
//           };
          
//           updatePromises.push(
//             api.updatePayrollEntry(entry.id, updateData)
//               .then(() => {
//                 console.log(`✅ Updated entry ${entry.id}`);
//                 updateCount++;
//               })
//           );
//         }
//       }
      
//       await Promise.all(updatePromises);
//       console.log(`✅ All ${updateCount} entries updated`);
      
//       // Try to mark period as generated, but don't fail if it doesn't work
//       try {
//         console.log(`📤 Calling generatePayroll for period ${payrollPeriodId}`);
//         const generateResponse = await api.generatePayroll(payrollPeriodId);
//         console.log('📦 Generate response:', generateResponse);
//       } catch (genError: any) {
//         console.warn('⚠️ generatePayroll failed, but entries are already updated:', genError.message);
        
//         // Even if generatePayroll fails, the entries are locked
//         // We can still update the UI
//       }
      
//       // Update UI state regardless of API result
//       setPeriodStatus('generated');
//       setPayrollEntries(prev => prev.map(entry => ({
//         ...entry,
//         status: 'generated',
//         isEditable: false
//       })));
      
//       alert(`✅ Payroll generated and locked for ${updateCount} employees!`);
      
//       // Reload data to ensure consistency
//       await loadPayrollData();
      
//     } catch (error: any) {
//       console.error('❌ Error generating payroll:', error);
//       alert('Failed to generate payroll: ' + (error.message || 'Unknown error'));
//     } finally {
//       setIsSaving(false);
//       isGenerating.current = false;
//     }
//   }, [payrollPeriodId, payrollEntries, calculateEntryLocally, loadPayrollData, periodStatus]);

//   // ============= CLEAR DATA =============
//   const handleClearData = useCallback(async () => {
//     if (periodStatus === 'generated') {
//       alert('Cannot clear a generated payroll');
//       return;
//     }
    
//     if (!window.confirm('Are you sure you want to clear all payroll data for this month?')) {
//       return;
//     }
    
//     setIsLoading(true);
//     try {
//       console.log(`🗑️ Deleting payroll for ${selectedMonth}/${selectedYear}...`);
//       await api.deletePayrollByMonth(selectedYear, selectedMonth);
//       setPayrollEntries([]);
//       setPayrollPeriodId(null);
//       setPeriodStatus('draft');
//       alert('✅ Payroll data cleared successfully!');
//     } catch (error) {
//       console.error('❌ Error clearing payroll:', error);
//       alert('Failed to clear payroll data');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [selectedYear, selectedMonth, periodStatus]);

//   // Load only periods created in Settings
//   const loadSettingsPeriods = useCallback(async () => {
//     setIsLoadingPeriods(true);
//     try {
//       const periods = await api.getSettingsPeriods();
//       console.log('📦 Settings periods from API:', periods);
//       setSettingsPeriods(periods);
      
//       // Auto-select the most recent period
//       if (periods.length > 0) {
//         // Sort by year and month to get the most recent
//         const sortedPeriods = [...periods].sort((a, b) => {
//           if (a.year !== b.year) return b.year - a.year;
//           return b.month - a.month;
//         });
        
//         const mostRecent = sortedPeriods[0];
//         console.log('📅 Most recent period:', mostRecent);
        
//         setSelectedMonth(mostRecent.month);
//         setSelectedYear(mostRecent.year);
//       }
//     } catch (error) {
//       console.error('Failed to load settings periods:', error);
//       setSettingsPeriods([]);
//     } finally {
//       setIsLoadingPeriods(false);
//     }
//   }, []);

//   useEffect(() => {
//     console.log('📊 Current selected month/year:', selectedMonth, selectedYear);
//     console.log('📊 Settings periods available:', settingsPeriods);
//   }, [selectedMonth, selectedYear, settingsPeriods]);

//   // Load generated payrolls for view tab
//   const loadGeneratedPayrolls = useCallback(async () => {
//     setIsLoadingPayslips(true);
//     try {
//       // Get all generated payroll periods - no filters for admin
//       const response = await api.getAllPayrolls({ isGenerated: true });
//       console.log('📦 All generated periods:', response);
//       setGeneratedPayrolls(Array.isArray(response) ? response : []);
//     } catch (error) {
//       console.error('Failed to load generated payrolls:', error);
//       setGeneratedPayrolls([]);
//     } finally {
//       setIsLoadingPayslips(false);
//     }
//   }, []);

//   // Function to handle viewing a payslip
//   const handleViewPayslip = async (periodId: string, employeeId?: string) => {
//     try {
//       console.log('═══════════════════════════════════════════════');
//       console.log('📄 STEP 1: Starting handleViewPayslip');
//       console.log('Period ID:', periodId);
//       console.log('Employee ID:', employeeId);
//       console.log('═══════════════════════════════════════════════');
      
//       setSelectedPeriodId(periodId);
      
//       // Get all entries for this period
//       const entries = await api.getPayrollEntriesByPeriod(periodId);
//       console.log('📦 STEP 2: Received entries from API:', entries.length);
      
//       if (!entries || entries.length === 0) {
//         alert('No payslips found for this period');
//         return;
//       }

//       // Log the RAW data from API
//       console.log('🔍 STEP 3: First entry RAW data:', JSON.stringify(entries[0], null, 2));
      
//       setPeriodEntries(entries);
      
//       // Helper function to safely get employee ID as string
//       const getEmployeeIdString = (entry: any): string => {
//         if (!entry.employeeId) return '';
        
//         // Log the RAW employeeId
//         console.log('🆔 Raw employeeId type:', typeof entry.employeeId);
//         console.log('🆔 Raw employeeId value:', entry.employeeId);
//         console.log('🆔 Raw employeeId keys:', Object.keys(entry.employeeId || {}));
        
//         if (typeof entry.employeeId === 'object' && entry.employeeId !== null) {
//           // MongoDB ObjectId with $oid
//           if ('$oid' in entry.employeeId) {
//             console.log('✅ Using $oid format');
//             return entry.employeeId.$oid;
//           }
//           // BSON ObjectId
//           if (entry.employeeId._bsontype === 'ObjectID') {
//             console.log('✅ Using BSON format');
//             if (entry.employeeId.toHexString) {
//               return entry.employeeId.toHexString();
//             }
//           }
//           // Generic object with toString
//           if (typeof entry.employeeId.toString === 'function') {
//             const str = entry.employeeId.toString();
//             console.log('✅ Using toString:', str);
//             return str;
//           }
//         }
        
//         // Plain string
//         if (typeof entry.employeeId === 'string') {
//           console.log('✅ Already a string');
//           return entry.employeeId;
//         }
        
//         console.log('⚠️ Falling back to String()');
//         return String(entry.employeeId);
//       };
      
//       // For admin, populate employee dropdown
//       if (isAdmin || isManager) {
//         const employeesInPeriod = entries.map((entry: any) => {
//           const extractedId = getEmployeeIdString(entry);
//           console.log(`👤 Employee: ${entry.name} → ID: ${extractedId}`);
//           return {
//             id: extractedId,
//             name: entry.name,
//             designation: entry.designation,
//             department: entry.department
//           };
//         });
        
//         console.log('📋 STEP 4: Available employees for dropdown:', employeesInPeriod);
//         setAvailableEmployees(employeesInPeriod);
//       }
      
//       // Determine which employee to show
//       let targetEmployeeId = employeeId;
      
//       if ((isAdmin || isManager) && (!employeeId || employeeId === 'all')) {
//         targetEmployeeId = getEmployeeIdString(entries[0]);
//         console.log('🎯 Using first employee:', targetEmployeeId);
//       } else if (!isAdmin && !isManager) {
//         targetEmployeeId = employeeDetails?.id;
//         console.log('🎯 Using current employee:', targetEmployeeId);
//       }
      
//       // Find the entry for the target employee
//       console.log('🔍 STEP 5: Searching for employee:', targetEmployeeId);
//       const entry = targetEmployeeId 
//         ? entries.find((e: any) => {
//             const eId = getEmployeeIdString(e);
//             console.log(`  Comparing: "${eId}" === "${targetEmployeeId}" → ${eId === targetEmployeeId}`);
//             return eId === targetEmployeeId;
//           })
//         : entries[0];
      
//       if (entry) {
//         const employeeIdString = getEmployeeIdString(entry);
//         console.log('✅ STEP 6: Found entry!');
//         console.log('   Name:', entry.name);
//         console.log('   ID:', employeeIdString);

//         setSelectedEmployeeForPayslip(employeeIdString);

//         setSelectedPayslip({
//           ...entry,
//           id: entry._id,
//           employeeId: employeeIdString
//         });

//         setIsPayslipModalOpen(true);
//         console.log('═══════════════════════════════════════════════');
//         console.log('✅ Modal opened successfully');
//         console.log('═══════════════════════════════════════════════');
//       } else {
//         console.error('❌ STEP 6: No entry found!');
//         console.error('Target ID:', targetEmployeeId);
//         console.error('Available IDs:', entries.map(e => getEmployeeIdString(e)));
//         alert('No payslip found for this period');
//       }
//     } catch (error) {
//       console.error('❌ Error in handleViewPayslip:', error);
//       alert('Failed to load payslip');
//     }
//   };

//   // Add function to handle employee selection change
//   const handleEmployeeChange = async (employeeId: string) => {
//     console.log('═══════════════════════════════════════════════');
//     console.log('🔄 EMPLOYEE CHANGE TRIGGERED');
//     console.log('Selected Employee ID:', employeeId);
//     console.log('Type:', typeof employeeId);
//     console.log('═══════════════════════════════════════════════');
    
//     setSelectedEmployeeForPayslip(employeeId);
    
//     // Verify periodEntries exists
//     if (!periodEntries || periodEntries.length === 0) {
//       console.error('❌ periodEntries is empty!');
//       alert('Error: Payroll entries not loaded');
//       return;
//     }
    
//     console.log('📦 Total entries to search:', periodEntries.length);
    
//     // Helper function
//     const getEmployeeIdString = (entry: any): string => {
//       if (!entry.employeeId) return '';
      
//       if (typeof entry.employeeId === 'object' && entry.employeeId !== null) {
//         if ('$oid' in entry.employeeId) return entry.employeeId.$oid;
//         if (entry.employeeId.toHexString) return entry.employeeId.toHexString();
//         if (entry.employeeId.toString) return entry.employeeId.toString();
//       }
      
//       if (typeof entry.employeeId === 'string') return entry.employeeId;
      
//       return String(entry.employeeId);
//     };
    
//     // Log ALL entries before searching
//     console.log('🔍 All available entries:');
//     periodEntries.forEach((e: any, idx: number) => {
//       const extractedId = getEmployeeIdString(e);
//       console.log(`  [${idx}] ${e.name} → ID: "${extractedId}" (${typeof extractedId})`);
//     });
    
//     console.log('🎯 Looking for ID:', `"${employeeId}"`, `(${typeof employeeId})`);
    
//     // Search for the entry
//     const entry = periodEntries.find((e: any) => {
//       const eId = getEmployeeIdString(e);
//       const match = eId === employeeId;
      
//       if (match) {
//         console.log('✅ ✅ ✅ MATCH FOUND! ✅ ✅ ✅');
//         console.log('   Name:', e.name);
//         console.log('   Matched ID:', eId);
//       }
      
//       return match;
//     });
    
//     if (entry) {
//       console.log('✅ SUCCESS: Found entry');
      
//       const payslipEntry = {
//         id: entry._id || entry.id,
//         employeeId: getEmployeeIdString(entry),
//         staffId: entry.staffId,
//         sr: entry.sr,
//         name: entry.name,
//         designation: entry.designation,
//         department: entry.department,
//         month: entry.month,
//         year: entry.year,
//         totalDays: entry.totalDays,
//         offDays: entry.offDays,
//         leaveTaken: entry.leaveTaken,
//         workedDays: entry.workedDays,
//         ctc: entry.ctc,
//         dailyRate: entry.dailyRate,
//         hourlyRate: entry.hourlyRate,
//         offDaysWorked: entry.offDaysWorked,
//         offDayAmount: entry.offDayAmount,
//         holidayWorked: entry.holidayWorked,
//         holidayAmount: entry.holidayAmount,
//         leaveSalary: entry.leaveSalary,
//         cashAdvance: entry.cashAdvance,
//         penaltyPoints: entry.penaltyPoints,
//         total: entry.total,
//         visaCost: entry.visaCost,
//         absences: entry.absences,
//         unauthorizedAbsences: entry.unauthorizedAbsences,
//         lateHours: entry.lateHours,
//         authAbsenceDeduction: entry.authAbsenceDeduction,
//         unauthAbsenceDeduction: entry.unauthAbsenceDeduction,
//         tardiness: entry.tardiness,
//         fines: entry.fines,
//         cleaningFees: entry.cleaningFees,
//         allDeductions: entry.allDeductions,
//         overtimeHours: entry.overtimeHours,
//         overtimeAmount: entry.overtimeAmount,
//         netDeductions: entry.netDeductions,
//         extraFromManager: entry.extraFromManager,
//         januaryNetSalary: entry.januaryNetSalary,
//         targetRate: entry.targetRate,
//         backPayment: entry.backPayment,
//         totalJanuarySalary: entry.totalJanuarySalary,
//         finalModification: entry.finalModification,
//         hrNotes: entry.hrNotes,
//         beforeOT: entry.beforeOT,
//         ot: entry.ot,
//         totalCalculated: entry.totalCalculated,
//         dfrnce: entry.dfrnce,
//         deductions: entry.deductions,
//         inDays: entry.inDays,
//         isCalculated: entry.isCalculated,
//         isEditable: entry.isEditable,
//         status: entry.status
//       };
      
//       console.log('📄 Setting payslip for:', payslipEntry.name);
//       setSelectedPayslip(payslipEntry);
      
//       if (!isPayslipModalOpen) {
//         setIsPayslipModalOpen(true);
//       }
      
//       console.log('═══════════════════════════════════════════════');
//       console.log('✅ EMPLOYEE CHANGE COMPLETE');
//       console.log('═══════════════════════════════════════════════');
      
//     } else {
//       console.error('❌ ❌ ❌ NO MATCH FOUND! ❌ ❌ ❌');
//       console.error('Searched for:', employeeId);
//       console.error('Available IDs:', periodEntries.map((e: any) => getEmployeeIdString(e)));
//       alert(`No payslip found!\n\nSearching for: ${employeeId}\n\nAvailable: ${periodEntries.length} entries`);
//     }
//   };

//   // ============= LOAD MY PAYSLIPS =============
//   const loadMyPayslips = useCallback(async () => {
//     if (!employeeDetails?.id) return;
    
//     setIsLoadingPayslips(true);
//     try {
//       // Get all generated payroll periods
//       const allPeriods = await api.getAllPayrolls({ isGenerated: true });
//       console.log('📦 All periods:', allPeriods);
      
//       // Helper function to safely get employee ID as string
//       const getEmployeeIdString = (entry: any): string => {
//         if (!entry.employeeId) return '';
        
//         // Handle MongoDB ObjectId format
//         if (typeof entry.employeeId === 'object' && entry.employeeId !== null) {
//           if ('$oid' in entry.employeeId) {
//             return entry.employeeId.$oid;
//           }
//           if (typeof entry.employeeId.toString === 'function') {
//             return entry.employeeId.toString();
//           }
//         }
        
//         // Handle string format
//         if (typeof entry.employeeId === 'string') {
//           return entry.employeeId;
//         }
        
//         return String(entry.employeeId);
//       };
      
//       // Filter periods that have entries for this employee
//       const employeePeriods = [];
//       const employeeIdStr = employeeDetails.id.toString();
      
//       for (const period of allPeriods) {
//         try {
//           const entries = await api.getPayrollEntriesByPeriod(period._id);
          
//           // Check if this employee has an entry
//           const hasEmployeeEntry = entries.some((e: any) => {
//             const eId = getEmployeeIdString(e);
//             return eId === employeeIdStr;
//           });
          
//           if (hasEmployeeEntry) {
//             employeePeriods.push(period);
//           }
//         } catch (err) {
//           console.log(`No entries for period ${period._id}`);
//         }
//       }
      
//       console.log('📋 Employee periods:', employeePeriods);
//       setGeneratedPayrolls(employeePeriods);
//     } catch (error) {
//       console.error('Failed to load my payslips:', error);
//       setGeneratedPayrolls([]);
//     } finally {
//       setIsLoadingPayslips(false);
//     }
//   }, [employeeDetails?.id]);

//   // Update the useEffect for view tab
//   useEffect(() => {
//     if (activeTab === 'view') {
//       if (isAdmin || isManager) {
//         // Admins/managers see all generated payrolls
//         loadGeneratedPayrolls();
//       } else {
//         // Regular employees see only their payslips
//         loadMyPayslips();
//       }
//     }
//   }, [activeTab, loadGeneratedPayrolls, loadMyPayslips, isAdmin, isManager]);

//   useEffect(() => {
//     loadSettingsPeriods();
//   }, [loadSettingsPeriods]);

//   // Load data when month/year changes AND settings are loaded
//   useEffect(() => {
//     if (employees.length > 0 && !isLoadingPeriods) {
//       loadPayrollDataWithParams(selectedMonth, selectedYear);
//     }
//   }, [selectedYear, selectedMonth, employees, loadPayrollDataWithParams, isLoadingPeriods]);

//   useEffect(() => {
//     console.log('📊 Period status changed to:', periodStatus);
//   }, [periodStatus]);

//   useEffect(() => {
//     console.log('📊 Period status:', periodStatus);
//     console.log('📝 Payroll entries count:', payrollEntries.length);
//     console.log('🆔 Payroll period ID:', payrollPeriodId);
    
//     if (payrollEntries.length > 0) {
//       console.log('📝 First entry:', {
//         id: payrollEntries[0].id,
//         name: payrollEntries[0].name,
//         isEditable: payrollEntries[0].isEditable,
//         status: payrollEntries[0].status
//       });
//     }
//   }, [periodStatus, payrollEntries, payrollPeriodId]);

//   return (
//     <div className="space-y-6 p-4 max-w-7xl mx-auto">
//       {/* Header with Tabs */}
//       <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//         <div className="border-b border-gray-200 px-6">
//           <nav className="-mb-px flex space-x-8" aria-label="Tabs">
//             {canManage && (
//               <button
//                 onClick={() => setActiveTab('create')}
//                 className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
//                   activeTab === 'create' 
//                     ? 'border-indigo-600 text-indigo-600' 
//                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                 }`}
//               >
//                 Create Payroll
//               </button>
//             )}
//             <button
//               onClick={() => setActiveTab('view')}
//               className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
//                 activeTab === 'view' 
//                   ? 'border-indigo-600 text-indigo-600' 
//                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//               }`}
//             >
//               View Payslips
//             </button>
//           </nav>
//         </div>

//         <div className="p-6">
//           {activeTab === 'create' && canManage && (
//             <>
//               {/* Month/Year Selector */}
//               <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-lg items-center">
//                 {isLoadingPeriods ? (
//                   <div className="flex items-center gap-2">
//                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
//                     <span className="text-sm text-gray-500">Loading periods...</span>
//                   </div>
//                 ) : settingsPeriods.length === 0 ? (
//                   <div className="w-full text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
//                     No payroll periods created yet. Go to Settings → Payroll Settings to create one.
//                   </div>
//                 ) : (
//                   <>
//                     <div className="flex items-center gap-2">
//                       <label className="text-sm font-medium text-gray-700">Period:</label>
//                       <select
//                         value={selectedMonth}
//                         onChange={(e) => {
//                           const month = Number(e.target.value);
//                           const period = settingsPeriods.find(p => p.month === month && p.year === selectedYear);
                          
//                           if (period) {
//                             const newMonth = month;
//                             const newYear = period.year;
                            
//                             // Update state
//                             setSelectedMonth(newMonth);
//                             if (newYear !== selectedYear) {
//                               setSelectedYear(newYear);
//                             }
                            
//                             // Load data with the new values directly
//                             loadPayrollDataWithParams(newMonth, newYear);
//                           }
//                         }}
//                         className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[200px]"
//                       >
//                         {settingsPeriods.map(period => (
//                           <option key={period._id} value={period.month}>
//                             {period.monthName} {period.year}
//                           </option>
//                         ))}
//                       </select>
//                     </div>

//                     {/* Show period dates */}
//                     {settingsPeriods.length > 0 && (
//                       <div className="text-sm text-gray-500">
//                         {settingsPeriods.find(p => p.month === selectedMonth && p.year === selectedYear)?.startDate || ''} 
//                         {' to '}
//                         {settingsPeriods.find(p => p.month === selectedMonth && p.year === selectedYear)?.endDate || ''}
//                       </div>
//                     )}

//                     {/* Status Badge */}
//                     {periodStatus && (
//                       <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
//                         periodStatus === 'generated' ? 'bg-green-100 text-green-700' :
//                         periodStatus === 'calculated' ? 'bg-blue-100 text-blue-700' :
//                         'bg-amber-100 text-amber-700'
//                       }`}>
//                         {periodStatus === 'generated' ? '✓ Generated' :
//                         periodStatus === 'calculated' ? '⟲ Calculated' :
//                         '📝 Draft'}
//                       </div>
//                     )}
                    
//                     {/* Clear button for draft periods */}
//                     {payrollEntries.length > 0 && periodStatus !== 'generated' && (
//                       <Button 
//                         onClick={handleClearData} 
//                         variant="danger" 
//                         size="sm"
//                         className="ml-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
//                       >
//                         <span className="text-base">🗑️</span>
//                         <span>Clear Data</span>
//                       </Button> 
//                     )}
                    
//                     {/* Generated badge for read-only mode */}
//                     {periodStatus === 'generated' && (
//                       <div className="ml-auto bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
//                         <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
//                         </svg>
//                         <span>Read Only - Generated</span>
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>

//               {/* Payroll Table */}
//               {isLoading ? (
//                 <div className="flex justify-center py-12">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//                 </div>
//               ) : payrollEntries.length > 0 ? (
//                 <PayrollTable
//                   entries={payrollEntries}
//                   onUpdateCell={handleUpdateCell}
//                   onSave={handleGeneratePayroll}
//                   isSaving={isSaving}
//                   month={payrollEntries.length > 0 ? (months.findIndex(m => m.name === payrollEntries[0].month) + 1) : selectedMonth}
//                   year={payrollEntries.length > 0 ? payrollEntries[0].year : selectedYear}
//                   periodStatus={periodStatus}
//                   onRowClick={(entry) => {
//                     console.log('🖱️ Row clicked in PayrollPage:', entry.name);
//                     // Navigate to detail page with the entry data
//                     navigate(`/payroll/${entry.id}`, { state: { entry } });
//                   }}
//                 />
//               ) : (
//                 <div className="text-center py-16">
//                   <div className="text-6xl mb-4 text-gray-300">📊</div>
//                   <p className="text-lg text-gray-600 mb-2">No payroll data found</p>
//                   <p className="text-sm text-gray-500">
//                     {periodStatus === 'generated' 
//                       ? 'Entries were generated but failed to load. Try refreshing.' 
//                       : 'Select a month and year to create payroll'}
//                   </p>
//                 </div>
//               )}
//             </>
//           )}

//           {activeTab === 'view' && (
//             <div className="space-y-6">
//               {isLoadingPayslips ? (
//                 <div className="flex justify-center py-12">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//                 </div>
//               ) : generatedPayrolls.length === 0 ? (
//                 <div className="text-center py-16">
//                   <div className="text-6xl mb-4 text-gray-300">📄</div>
//                   <p className="text-lg text-gray-600">
//                     {isAdmin || isManager ? 'No generated payrolls found' : 'No payslips available'}
//                   </p>
//                   <p className="text-sm text-gray-500 mt-2">
//                     {isAdmin || isManager 
//                       ? 'Generate payroll in the Create tab to see periods here.'
//                       : 'Your payslips will appear here after payroll is generated.'}
//                   </p>
//                 </div>
//               ) : (
//                 <>
//                   {/* Show user info for regular employees */}
//                   {!isAdmin && !isManager && employeeDetails && (
//                     <div className="bg-blue-50 p-3 rounded-lg mb-4">
//                       <p className="text-sm">
//                         <span className="font-medium">Showing payslips for: </span>
//                         {employeeDetails.firstName} {employeeDetails.lastName}
//                       </p>
//                       {generatedPayrolls.length === 0 && (
//                         <p className="text-xs text-gray-600 mt-1">
//                           No payslips found. Payroll must be generated first.
//                         </p>
//                       )}
//                     </div>
//                   )}
                  
//                   {/* For Admin/Manager view - show all generated payrolls with employee filter */}
//                   {(isAdmin || isManager) ? (
//                     <div className="space-y-4">
//                       <h3 className="text-lg font-medium text-gray-900">Generated Payroll Periods</h3>
//                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//                         {generatedPayrolls.map((period) => (
//                           <div
//                             key={period._id}
//                             className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
//                           >
//                             <div className="flex items-start justify-between mb-3">
//                               <div>
//                                 <h4 className="font-medium text-gray-900">
//                                   {period.monthName} {period.year}
//                                 </h4>
//                                 <p className="text-sm text-gray-500">
//                                   Generated: {new Date(period.createdAt).toLocaleDateString()}
//                                 </p>
//                               </div>
//                               <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
//                                 Generated
//                               </span>
//                             </div>
                            
//                             <div className="flex gap-2 mt-4">
//                               <button
//                                 onClick={() => handleViewPayslip(period._id)}
//                                 className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
//                               >
//                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                                 </svg>
//                                 View Payslips
//                               </button>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   ) : (
//                     /* For Employee view - show only their payslips in a simple list */
//                     <div className="space-y-4">
//                       <h3 className="text-lg font-medium text-gray-900">My Payslips</h3>
//                       <div className="bg-white border border-gray-200 rounded-lg divide-y">
//                         {generatedPayrolls.map((period) => (
//                           <div key={period._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
//                             <div>
//                               <p className="font-medium">{period.monthName} {period.year}</p>
//                               <p className="text-sm text-gray-500">
//                                 Generated on: {new Date(period.createdAt).toLocaleDateString()}
//                               </p>
//                             </div>
//                             <button
//                               onClick={() => handleViewPayslip(period._id, employeeDetails?.id)}
//                               className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-2"
//                             >
//                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                               </svg>
//                               View Payslip
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Payslip Modal */}
//       <PayslipModal
//         isOpen={isPayslipModalOpen}
//         onClose={() => {
//           setIsPayslipModalOpen(false);
//           setSelectedPayslip(null);
//           setSelectedEmployeeForPayslip('');
//         }}
//         entry={selectedPayslip}
//         month={selectedPayslip?.month ? months.findIndex(m => m.name === selectedPayslip.month) + 1 : selectedMonth}
//         year={selectedPayslip?.year || selectedYear}
//         // Add these props for admin
//         isAdmin={isAdmin || isManager}
//         employees={availableEmployees}
//         onEmployeeChange={handleEmployeeChange}
//         selectedEmployeeId={selectedEmployeeForPayslip}
//       />
//     </div>
//   );
// };

// export default PayrollPage;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Select } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import PayrollTable from '../components/PayrollTable';
import { useNavigate } from 'react-router-dom';
import PayslipModal from '../components/PayslipModal';

const months = [
  { value: 1, name: 'January' }, { value: 2, name: 'February' }, 
  { value: 3, name: 'March' }, { value: 4, name: 'April' },
  { value: 5, name: 'May' }, { value: 6, name: 'June' },
  { value: 7, name: 'July' }, { value: 8, name: 'August' },
  { value: 9, name: 'September' }, { value: 10, name: 'October' },
  { value: 11, name: 'November' }, { value: 12, name: 'December' }
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Helper function to count weekends (Fridays and Saturdays) in a month
const countWeekendDays = (year: number, month: number): number => {
  const date = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  let weekendCount = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();
    // Friday = 5, Saturday = 6
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      weekendCount++;
    }
  }
  
  return weekendCount;
};

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

const PayrollPage: React.FC = () => {
  const { employees } = useHRData();
  const { hasPermission, employeeDetails, isAdmin, isManager } = useAuth();
  const canManage = hasPermission('canManagePayroll');
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [payrollPeriodId, setPayrollPeriodId] = useState<string | null>(null);
  const [periodStatus, setPeriodStatus] = useState<'draft' | 'calculated' | 'generated'>('draft');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(canManage ? 'create' : 'view');
  const [lastEmployeeUpdate, setLastEmployeeUpdate] = useState<number>(Date.now());
  const [settingsPeriods, setSettingsPeriods] = useState<any[]>([]);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(true);
  const isGenerating = useRef(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollEntry | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [generatedPayrolls, setGeneratedPayrolls] = useState<any[]>([]);
  const [isLoadingPayslips, setIsLoadingPayslips] = useState(false);
  const [selectedEmployeeForPayslip, setSelectedEmployeeForPayslip] = useState<string>('');
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([]);
  const [periodEntries, setPeriodEntries] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const isLoadingPayroll = useRef(false);

  // ============= LOCAL CALCULATION FUNCTION =============
  const calculateEntryLocally = useCallback((entry: PayrollEntry): PayrollEntry => {
    const calculated = { ...entry };
    
    // Daily rate = CTC ÷ 30
    calculated.dailyRate = entry.ctc > 0 ? Number((entry.ctc / 30).toFixed(2)) : 0;
    
    // Hourly rate = Daily rate ÷ 10
    calculated.hourlyRate = calculated.dailyRate > 0 ? Number((calculated.dailyRate / 10).toFixed(2)) : 0;
    
    // Off day amount = 1.5 × (offDaysWorked × dailyRate)
    calculated.offDayAmount = calculated.dailyRate > 0 
      ? Number((1.5 * (entry.offDaysWorked || 0) * calculated.dailyRate).toFixed(2)) 
      : 0;
    
    // Holiday amount = 2 × (holidayWorked × dailyRate)
    calculated.holidayAmount = calculated.dailyRate > 0 
      ? Number((2 * (entry.holidayWorked || 0) * calculated.dailyRate).toFixed(2)) 
      : 0;
    
    // Basic salary = (CTC ÷ Total Days) × Worked Days
    const basicSalary = entry.totalDays > 0 && entry.workedDays > 0
      ? (entry.ctc / entry.totalDays) * entry.workedDays
      : 0;
    
    // TOTAL = Basic Salary + Leave Salary - Cash Advance + Off Day Amount + Holiday Amount
    calculated.total = Number((
      basicSalary +
      (entry.leaveSalary || 0) -
      (entry.cashAdvance || 0) +
      (calculated.offDayAmount || 0) +
      (calculated.holidayAmount || 0)
    ).toFixed(2));
    
    // Authorised Absence deduction = Absences × Daily Rate
    calculated.authAbsenceDeduction = calculated.dailyRate > 0 
      ? Number(((entry.absences || 0) * calculated.dailyRate).toFixed(2)) 
      : 0;
    
    // Unauthorised Absence deduction = Unauthorized Absences × Daily Rate
    calculated.unauthAbsenceDeduction = calculated.dailyRate > 0 
      ? Number(((entry.unauthorizedAbsences || 0) * calculated.dailyRate).toFixed(2)) 
      : 0;
    
    // Tardiness = Hourly Rate × Late Hours
    calculated.tardiness = calculated.hourlyRate > 0 
      ? Number(((entry.lateHours || 0) * calculated.hourlyRate).toFixed(2)) 
      : 0;
    
    // All Deductions = VISA COST + (Auth + Unauth + Tardiness) + Fines + Cleaning
    calculated.allDeductions = Number((
      (entry.visaCost || 0) +
      (calculated.authAbsenceDeduction || 0) +
      (calculated.unauthAbsenceDeduction || 0) +
      (calculated.tardiness || 0) +
      (entry.fines || 0) +
      (entry.cleaningFees || 0)
    ).toFixed(2));
    
    // Overtime amount = Overtime Hours × Hourly Rate × 1
    calculated.overtimeAmount = calculated.hourlyRate > 0 
      ? Number(((entry.overtimeHours || 0) * calculated.hourlyRate * 1).toFixed(2)) 
      : 0;
    
    // Net deductions = Overtime Amount - All Deductions
    calculated.netDeductions = Number(((calculated.overtimeAmount || 0) - (calculated.allDeductions || 0)).toFixed(2));
    
    // January Net Salary = TOTAL + Net deductions + Extra from manager
    calculated.januaryNetSalary = Number((
      (calculated.total || 0) +
      (calculated.netDeductions || 0) +
      (entry.extraFromManager || 0)
    ).toFixed(2));
    
    // Total January Salary = January Net Salary + Back Payment
    calculated.totalJanuarySalary = Number(((calculated.januaryNetSalary || 0) + (entry.backPayment || 0)).toFixed(2));
    
    // Before OT = Total January Salary - Overtime Amount - Extra from manager
    calculated.beforeOT = Number((
      (calculated.totalJanuarySalary || 0) -
      (calculated.overtimeAmount || 0) -
      (entry.extraFromManager || 0)
    ).toFixed(2));
    
    // OT = Overtime Amount + Extra from manager
    calculated.ot = Number(((calculated.overtimeAmount || 0) + (entry.extraFromManager || 0)).toFixed(2));
    
    // Total Calculated = Before OT + OT
    calculated.totalCalculated = Number(((calculated.beforeOT || 0) + (calculated.ot || 0)).toFixed(2));
    
    // DFRNCE = Total January Salary - Total Calculated
    calculated.dfrnce = Number(((calculated.totalJanuarySalary || 0) - (calculated.totalCalculated || 0)).toFixed(2));
    
    // deductions = All Deductions + Cash Advance
    calculated.deductions = Number(((calculated.allDeductions || 0) + (entry.cashAdvance || 0)).toFixed(2));
    
    // in days = deductions ÷ Daily Rate
    calculated.inDays = calculated.dailyRate > 0 
      ? Number(((calculated.deductions || 0) / calculated.dailyRate).toFixed(2)) 
      : 0;
    
    calculated.isCalculated = true;
    
    return calculated;
  }, []);

  // Check if payroll is editable
  const isPayrollEditable = useCallback(() => {
    return periodStatus !== 'generated';
  }, [periodStatus]);


  // ============= LOAD PAYROLL DATA WITH PARAMS =============
  const loadPayrollDataWithParams = useCallback(async (month: number, year: number, retryCount = 0) => {
    // Prevent multiple simultaneous calls
    if (isLoadingPayroll.current) return;
    
    isLoadingPayroll.current = true;
    setIsLoading(true);

    try {
      console.log(`📂 Loading payroll for ${month}/${year}...`);  
      const response = await api.getPayrollByMonth(year, month);

      console.log('📦 API Response:', response); 
      if (response && response.period) {

        const status = response.period.status || 'draft';
        console.log(`📊 Period status: ${status}`);
        
        // Set period ID and status
        setPayrollPeriodId(response.period._id);
        setPeriodStatus(status);
        
        // Handle entries
        if (response.entries && response.entries.length > 0) {
          console.log(`📝 Found ${response.entries.length} entries`);
          
          const loadedEntries = response.entries.map((entry: any) => ({
            ...entry,
            id: entry._id || entry.id,
            isEditable: entry.isEditable !== undefined ? entry.isEditable : (status !== 'generated'),
            status: status
          }));
          
          // Calculate locally but preserve isEditable
          const calculatedEntries = loadedEntries.map((entry: PayrollEntry) => {
            const calculated = calculateEntryLocally(entry);
            return {
              ...calculated,
              isEditable: entry.isEditable
            };
          });
          
          setPayrollEntries(calculatedEntries);
          console.log(`✅ Loaded ${calculatedEntries.length} entries`);
          
        } else if (retryCount < 3) {
          // Only retry up to 3 times
          console.log(`⚠️ Period exists but no entries found - retry ${retryCount + 1}/3...`);
          isLoadingPayroll.current = false;
          setIsLoading(false);
          
          // Wait and retry
          setTimeout(() => {
            loadPayrollDataWithParams(month, year, retryCount + 1);
          }, 500);
          return; // Exit early to keep loading state
        } else {
          console.log('❌ No entries found after 3 retries');
          setPayrollEntries([]);
        }
      } else {
        console.log(`📭 No payroll period found for ${month}/${year}`);
        setPayrollEntries([]);
        setPayrollPeriodId(null);
        setPeriodStatus('draft');
      }
    } catch (error) {
      console.error('❌ Error loading payroll:', error);
      setPayrollEntries([]);
      setPayrollPeriodId(null);
      setPeriodStatus('draft');
    } finally {
      setIsLoading(false);
      isLoadingPayroll.current = false;
    }
  }, [calculateEntryLocally]);


  // ============= LOAD PAYROLL DATA =============
  const loadPayrollData = useCallback(() => {
    return loadPayrollDataWithParams(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, loadPayrollDataWithParams]);


  // ============= HANDLE CELL UPDATE =============
  const handleUpdateCell = useCallback(async (entryId: string, field: string, value: any) => {
    // Prevent updates if period is generated
    if (periodStatus === 'generated') {
      alert('This payroll has been generated and cannot be edited.');
      return;
    }
    
    // First update the UI optimistically
    let updatedEntry: PayrollEntry | undefined;
    
    setPayrollEntries(prev => {
      const updatedEntries = prev.map(entry => {
        if (entry.id === entryId) {
          // Update the field
          const updated = { ...entry, [field]: value };
          // Recalculate
          return calculateEntryLocally(updated);
        }
        return entry;
      });
      
      // Store the updated entry for later use
      updatedEntry = updatedEntries.find(e => e.id === entryId);
      return updatedEntries;
    });
    
    // Then save to database
    if (!updatedEntry) return;
    
    try {
      if (entryId.startsWith('temp-')) {
        // This is a new entry that needs to be created in the database
        if (!payrollPeriodId) {
          console.log('⏳ Waiting for period ID...');
          return;
        }
        
        console.log('📤 Creating new entry in database');
        
        // Prepare entry data without temp ID
        const { id, ...entryData } = updatedEntry;
        const entryToCreate = {
          ...entryData,
          payrollPeriodId: payrollPeriodId,
          employeeId: updatedEntry.employeeId || null
        };
        
        // Save to database
        const savedEntry = await api.createPayrollEntry(entryToCreate);
        
        // Update the local state with the real ID
        setPayrollEntries(prev => 
          prev.map(e => 
            e.id === entryId 
              ? { ...savedEntry, id: savedEntry._id, isEditable: true }
              : e
          )
        );
        
        console.log('✅ Entry created with ID:', savedEntry._id);
        
      } else {
        // Existing entry - update only the single field
        console.log(`📤 Updating existing entry:`, { entryId, field, value });
        
        // ✅ FIX: Send only the field that changed
        const updateData = { [field]: value };
        await api.updatePayrollEntry(entryId, updateData);
      }
    } catch (error) {
      console.error('❌ Error saving entry:', error);
      alert('Failed to save changes. Please try again.');
      
      // Reload data to ensure consistency
      await loadPayrollData();
    }
  }, [calculateEntryLocally, periodStatus, payrollPeriodId, loadPayrollData]);


  // ============= GENERATE PAYROLL =============
  const handleGeneratePayroll = useCallback(async () => {
    if (isGenerating.current) {
      console.log('⏳ Generation already in progress');
      return;
    }
    
    if (periodStatus === 'generated') {
      alert('This payroll has already been generated and cannot be generated again.');
      return;
    }
    
    if (!payrollPeriodId) {
      alert('Error: No payroll period found. Please refresh the page.');
      return;
    }
    
    isGenerating.current = true;
    setIsSaving(true);
    
    try {
      console.log('💾 Generating payroll...');
      
      // Calculate all entries locally first
      const calculatedEntries = payrollEntries.map(entry => calculateEntryLocally(entry));
      
      // Update each entry in the database
      let updateCount = 0;
      const updatePromises = [];
      
      for (const entry of calculatedEntries) {
        if (!entry.id.startsWith('temp-')) {
          console.log(`📤 Finalizing entry ${entry.id} for ${entry.name}`);
          
          const updateData = {
            offDaysWorked: entry.offDaysWorked,
            holidayWorked: entry.holidayWorked,
            leaveSalary: entry.leaveSalary,
            cashAdvance: entry.cashAdvance,
            penaltyPoints: entry.penaltyPoints,
            visaCost: entry.visaCost,
            fines: entry.fines,
            cleaningFees: entry.cleaningFees,
            absences: entry.absences,
            unauthorizedAbsences: entry.unauthorizedAbsences,
            lateHours: entry.lateHours,
            overtimeHours: entry.overtimeHours,
            extraFromManager: entry.extraFromManager,
            backPayment: entry.backPayment,
            finalModification: entry.finalModification,
            hrNotes: entry.hrNotes,
            isEditable: false,
            isCalculated: true
          };
          
          updatePromises.push(
            api.updatePayrollEntry(entry.id, updateData)
              .then(() => {
                console.log(`✅ Updated entry ${entry.id}`);
                updateCount++;
              })
          );
        }
      }
      
      await Promise.all(updatePromises);
      console.log(`✅ All ${updateCount} entries updated`);
      
      // Try to mark period as generated, but don't fail if it doesn't work
      try {
        console.log(`📤 Calling generatePayroll for period ${payrollPeriodId}`);
        const generateResponse = await api.generatePayroll(payrollPeriodId);
        console.log('📦 Generate response:', generateResponse);
      } catch (genError: any) {
        console.warn('⚠️ generatePayroll failed, but entries are already updated:', genError.message);
        
        // Even if generatePayroll fails, the entries are locked
        // We can still update the UI
      }
      
      // Update UI state regardless of API result
      setPeriodStatus('generated');
      setPayrollEntries(prev => prev.map(entry => ({
        ...entry,
        status: 'generated',
        isEditable: false
      })));
      
      alert(`✅ Payroll generated and locked for ${updateCount} employees!`);
      
      // Reload data to ensure consistency
      await loadPayrollData();
      
    } catch (error: any) {
      console.error('❌ Error generating payroll:', error);
      alert('Failed to generate payroll: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
      isGenerating.current = false;
    }
  }, [payrollPeriodId, payrollEntries, calculateEntryLocally, loadPayrollData, periodStatus]);

  // ============= CLEAR DATA =============
  const handleClearData = useCallback(async () => {
    if (periodStatus === 'generated') {
      alert('Cannot clear a generated payroll');
      return;
    }
    
    if (!window.confirm('Are you sure you want to clear all payroll data for this month?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      console.log(`🗑️ Deleting payroll for ${selectedMonth}/${selectedYear}...`);
      await api.deletePayrollByMonth(selectedYear, selectedMonth);
      setPayrollEntries([]);
      setPayrollPeriodId(null);
      setPeriodStatus('draft');
      alert('✅ Payroll data cleared successfully!');
    } catch (error) {
      console.error('❌ Error clearing payroll:', error);
      alert('Failed to clear payroll data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth, periodStatus]);

  // Load only periods created in Settings
  const loadSettingsPeriods = useCallback(async () => {
    setIsLoadingPeriods(true);
    try {
      const periods = await api.getSettingsPeriods();
      console.log('📦 Settings periods from API:', periods);
      setSettingsPeriods(periods);
      
      // Auto-select the most recent period
      if (periods.length > 0) {
        // Sort by year and month to get the most recent
        const sortedPeriods = [...periods].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        
        const mostRecent = sortedPeriods[0];
        console.log('📅 Most recent period:', mostRecent);
        
        setSelectedMonth(mostRecent.month);
        setSelectedYear(mostRecent.year);
      }
    } catch (error) {
      console.error('Failed to load settings periods:', error);
      setSettingsPeriods([]);
    } finally {
      setIsLoadingPeriods(false);
    }
  }, []);

  useEffect(() => {
    console.log('📊 Current selected month/year:', selectedMonth, selectedYear);
    console.log('📊 Settings periods available:', settingsPeriods);
  }, [selectedMonth, selectedYear, settingsPeriods]);

  // Load generated payrolls for view tab
  const loadGeneratedPayrolls = useCallback(async () => {
    setIsLoadingPayslips(true);
    try {
      // Get all generated payroll periods - no filters for admin
      const response = await api.getAllPayrolls({ isGenerated: true });
      console.log('📦 All generated periods:', response);
      setGeneratedPayrolls(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load generated payrolls:', error);
      setGeneratedPayrolls([]);
    } finally {
      setIsLoadingPayslips(false);
    }
  }, []);

  // Function to handle viewing a payslip
  const handleViewPayslip = async (periodId: string, employeeId?: string) => {
    try {
      console.log('📄 Viewing payslip for period:', periodId, 'employee:', employeeId);
      
      setSelectedPeriodId(periodId);
      
      const entries = await api.getPayrollEntriesByPeriod(periodId);
      console.log('📦 Period entries:', entries);
      
      if (!entries || entries.length === 0) {
        alert('No payslips found for this period');
        return;
      }

      // ✅ FIX: Normalize ALL employeeIds to strings immediately
      const normalizedEntries = entries.map((entry: any) => ({
        ...entry,
        employeeId: entry.employeeId?.toString() || 
                    entry.employeeId?.$oid || 
                    entry.employeeId
      }));

      setPeriodEntries(normalizedEntries);
      
      // For admin, populate employee dropdown with normalized IDs
      if (isAdmin || isManager) {
        const employeesInPeriod = normalizedEntries.map((entry: any) => ({
          id: entry.employeeId, // Already normalized above
          name: entry.name,
          designation: entry.designation,
          department: entry.department
        }));
        setAvailableEmployees(employeesInPeriod);
      }
      
      // Determine which employee to show
      let targetEmployeeId = employeeId;
      
      if ((isAdmin || isManager) && (!employeeId || employeeId === 'all')) {
        targetEmployeeId = normalizedEntries[0].employeeId;
      } else if (!isAdmin && !isManager) {
        targetEmployeeId = employeeDetails?.id;
      }
      
      // Find the entry
      const entry = targetEmployeeId 
        ? normalizedEntries.find((e: any) => e.employeeId === targetEmployeeId)
        : normalizedEntries[0];
      
      if (entry) {
        setSelectedEmployeeForPayslip(entry.employeeId);

        setSelectedPayslip({
          ...entry,
          id: entry._id,
          employeeId: entry.employeeId
        });

        setIsPayslipModalOpen(true);
      } else {
        alert('No payslip found for this period');
      }
    } catch (error) {
      console.error('Failed to load payslip:', error);
      alert('Failed to load payslip');
    }
  };

  // Add function to handle employee selection change
  const handleEmployeeChange = async (employeeId: string) => {
    console.log('👤 Employee changed to:', employeeId);
    setSelectedEmployeeForPayslip(employeeId);
    
    if (!periodEntries || periodEntries.length === 0) {
      console.error('❌ periodEntries is empty!');
      alert('No payslip data found for this employee');
      return;
    }
    
    // ✅ FIX: Direct comparison (IDs are already normalized)
    const entry = periodEntries.find((e: any) => e.employeeId === employeeId);
    
    if (entry) {
      console.log('✅ Found entry for selected employee:', entry.name);
      
      // Create payslip entry with ALL fields
      const payslipEntry = {
        id: entry._id || entry.id,
        employeeId: entry.employeeId,
        staffId: entry.staffId,
        sr: entry.sr,
        name: entry.name,
        designation: entry.designation,
        department: entry.department,
        month: entry.month,
        year: entry.year,
        totalDays: entry.totalDays,
        offDays: entry.offDays,
        leaveTaken: entry.leaveTaken,
        workedDays: entry.workedDays,
        ctc: entry.ctc,
        dailyRate: entry.dailyRate,
        hourlyRate: entry.hourlyRate,
        offDaysWorked: entry.offDaysWorked,
        offDayAmount: entry.offDayAmount,
        holidayWorked: entry.holidayWorked,
        holidayAmount: entry.holidayAmount,
        leaveSalary: entry.leaveSalary,
        cashAdvance: entry.cashAdvance,
        penaltyPoints: entry.penaltyPoints,
        total: entry.total,
        visaCost: entry.visaCost,
        absences: entry.absences,
        unauthorizedAbsences: entry.unauthorizedAbsences,
        lateHours: entry.lateHours,
        authAbsenceDeduction: entry.authAbsenceDeduction,
        unauthAbsenceDeduction: entry.unauthAbsenceDeduction,
        tardiness: entry.tardiness,
        fines: entry.fines,
        cleaningFees: entry.cleaningFees,
        allDeductions: entry.allDeductions,
        overtimeHours: entry.overtimeHours,
        overtimeAmount: entry.overtimeAmount,
        netDeductions: entry.netDeductions,
        extraFromManager: entry.extraFromManager,
        januaryNetSalary: entry.januaryNetSalary,
        targetRate: entry.targetRate,
        backPayment: entry.backPayment,
        totalJanuarySalary: entry.totalJanuarySalary,
        finalModification: entry.finalModification,
        hrNotes: entry.hrNotes,
        beforeOT: entry.beforeOT,
        ot: entry.ot,
        totalCalculated: entry.totalCalculated,
        dfrnce: entry.dfrnce,
        deductions: entry.deductions,
        inDays: entry.inDays,
        isCalculated: entry.isCalculated,
        isEditable: entry.isEditable,
        status: entry.status
      };
      
      console.log('📄 Setting selected payslip:', payslipEntry);
      setSelectedPayslip(payslipEntry);
      
      if (!isPayslipModalOpen) {
        setIsPayslipModalOpen(true);
      }
      
    } else {
      console.warn('❌ No entry found for employee:', employeeId);
      console.log('Available entries:', periodEntries.map((e: any) => ({
        id: e.employeeId,
        name: e.name
      })));
      alert('No payslip data found for this employee');
    }
  };

  // ============= LOAD MY PAYSLIPS =============
  const loadMyPayslips = useCallback(async () => {
    if (!employeeDetails?.id) return;
    
    setIsLoadingPayslips(true);
    try {
      // Get all generated payroll periods
      const allPeriods = await api.getAllPayrolls({ isGenerated: true });
      console.log('📦 All periods:', allPeriods);
      
      // Helper function to safely get employee ID as string
      const getEmployeeIdString = (entry: any): string => {
        if (!entry.employeeId) return '';
        
        // Handle MongoDB ObjectId format
        if (typeof entry.employeeId === 'object' && entry.employeeId !== null) {
          if ('$oid' in entry.employeeId) {
            return entry.employeeId.$oid;
          }
          if (typeof entry.employeeId.toString === 'function') {
            return entry.employeeId.toString();
          }
        }
        
        // Handle string format
        if (typeof entry.employeeId === 'string') {
          return entry.employeeId;
        }
        
        return String(entry.employeeId);
      };
      
      // Filter periods that have entries for this employee
      const employeePeriods = [];
      const employeeIdStr = employeeDetails.id.toString();
      
      for (const period of allPeriods) {
        try {
          const entries = await api.getPayrollEntriesByPeriod(period._id);
          
          // Check if this employee has an entry
          const hasEmployeeEntry = entries.some((e: any) => {
            const eId = getEmployeeIdString(e);
            return eId === employeeIdStr;
          });
          
          if (hasEmployeeEntry) {
            employeePeriods.push(period);
          }
        } catch (err) {
          console.log(`No entries for period ${period._id}`);
        }
      }
      
      console.log('📋 Employee periods:', employeePeriods);
      setGeneratedPayrolls(employeePeriods);
    } catch (error) {
      console.error('Failed to load my payslips:', error);
      setGeneratedPayrolls([]);
    } finally {
      setIsLoadingPayslips(false);
    }
  }, [employeeDetails?.id]);

  // Update the useEffect for view tab
  useEffect(() => {
    if (activeTab === 'view') {
      if (isAdmin || isManager) {
        // Admins/managers see all generated payrolls
        loadGeneratedPayrolls();
      } else {
        // Regular employees see only their payslips
        loadMyPayslips();
      }
    }
  }, [activeTab, loadGeneratedPayrolls, loadMyPayslips, isAdmin, isManager]);

  useEffect(() => {
    loadSettingsPeriods();
  }, [loadSettingsPeriods]);

  // Load data when month/year changes AND settings are loaded
  useEffect(() => {
    if (employees.length > 0 && !isLoadingPeriods) {
      loadPayrollDataWithParams(selectedMonth, selectedYear);
    }
  }, [selectedYear, selectedMonth, employees, loadPayrollDataWithParams, isLoadingPeriods]);

  useEffect(() => {
    console.log('📊 Period status changed to:', periodStatus);
  }, [periodStatus]);

  useEffect(() => {
    console.log('📊 Period status:', periodStatus);
    console.log('📝 Payroll entries count:', payrollEntries.length);
    console.log('🆔 Payroll period ID:', payrollPeriodId);
    
    if (payrollEntries.length > 0) {
      console.log('📝 First entry:', {
        id: payrollEntries[0].id,
        name: payrollEntries[0].name,
        isEditable: payrollEntries[0].isEditable,
        status: payrollEntries[0].status
      });
    }
  }, [periodStatus, payrollEntries, payrollPeriodId]);

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header with Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {canManage && (
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'create' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Create Payroll
              </button>
            )}
            <button
              onClick={() => setActiveTab('view')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'view' 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Payslips
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'create' && canManage && (
            <>
              {/* Month/Year Selector */}
              <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-lg items-center">
                {isLoadingPeriods ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-500">Loading periods...</span>
                  </div>
                ) : settingsPeriods.length === 0 ? (
                  <div className="w-full text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    No payroll periods created yet. Go to Settings → Payroll Settings to create one.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Period:</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const month = Number(e.target.value);
                          const period = settingsPeriods.find(p => p.month === month && p.year === selectedYear);
                          
                          if (period) {
                            const newMonth = month;
                            const newYear = period.year;
                            
                            // Update state
                            setSelectedMonth(newMonth);
                            if (newYear !== selectedYear) {
                              setSelectedYear(newYear);
                            }
                            
                            // Load data with the new values directly
                            loadPayrollDataWithParams(newMonth, newYear);
                          }
                        }}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[200px]"
                      >
                        {settingsPeriods.map(period => (
                          <option key={period._id} value={period.month}>
                            {period.monthName} {period.year}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Show period dates */}
                    {settingsPeriods.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {settingsPeriods.find(p => p.month === selectedMonth && p.year === selectedYear)?.startDate || ''} 
                        {' to '}
                        {settingsPeriods.find(p => p.month === selectedMonth && p.year === selectedYear)?.endDate || ''}
                      </div>
                    )}

                    {/* Status Badge */}
                    {periodStatus && (
                      <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        periodStatus === 'generated' ? 'bg-green-100 text-green-700' :
                        periodStatus === 'calculated' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {periodStatus === 'generated' ? '✓ Generated' :
                        periodStatus === 'calculated' ? '⟲ Calculated' :
                        '📝 Draft'}
                      </div>
                    )}
                    
                    {/* Clear button for draft periods */}
                    {payrollEntries.length > 0 && periodStatus !== 'generated' && (
                      <Button 
                        onClick={handleClearData} 
                        variant="danger" 
                        size="sm"
                        className="ml-auto bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <span className="text-base">🗑️</span>
                        <span>Clear Data</span>
                      </Button> 
                    )}
                    
                    {/* Generated badge for read-only mode */}
                    {periodStatus === 'generated' && (
                      <div className="ml-auto bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Read Only - Generated</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Payroll Table */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : payrollEntries.length > 0 ? (
                <PayrollTable
                  entries={payrollEntries}
                  onUpdateCell={handleUpdateCell}
                  onSave={handleGeneratePayroll}
                  isSaving={isSaving}
                  month={payrollEntries.length > 0 ? (months.findIndex(m => m.name === payrollEntries[0].month) + 1) : selectedMonth}
                  year={payrollEntries.length > 0 ? payrollEntries[0].year : selectedYear}
                  periodStatus={periodStatus}
                  onRowClick={(entry) => {
                    console.log('🖱️ Row clicked in PayrollPage:', entry.name);
                    // Navigate to detail page with the entry data
                    navigate(`/payroll/${entry.id}`, { state: { entry } });
                  }}
                />
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 text-gray-300">📊</div>
                  <p className="text-lg text-gray-600 mb-2">No payroll data found</p>
                  <p className="text-sm text-gray-500">
                    {periodStatus === 'generated' 
                      ? 'Entries were generated but failed to load. Try refreshing.' 
                      : 'Select a month and year to create payroll'}
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'view' && (
            <div className="space-y-6">
              {isLoadingPayslips ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : generatedPayrolls.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 text-gray-300">📄</div>
                  <p className="text-lg text-gray-600">
                    {isAdmin || isManager ? 'No generated payrolls found' : 'No payslips available'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {isAdmin || isManager 
                      ? 'Generate payroll in the Create tab to see periods here.'
                      : 'Your payslips will appear here after payroll is generated.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Show user info for regular employees */}
                  {!isAdmin && !isManager && employeeDetails && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm">
                        <span className="font-medium">Showing payslips for: </span>
                        {employeeDetails.firstName} {employeeDetails.lastName}
                      </p>
                      {generatedPayrolls.length === 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          No payslips found. Payroll must be generated first.
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* For Admin/Manager view - show all generated payrolls with employee filter */}
                  {(isAdmin || isManager) ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Generated Payroll Periods</h3>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {generatedPayrolls.map((period) => (
                          <div
                            key={period._id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {period.monthName} {period.year}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  Generated: {new Date(period.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                Generated
                              </span>
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleViewPayslip(period._id)}
                                className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Payslips
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* For Employee view - show only their payslips in a simple list */
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">My Payslips</h3>
                      <div className="bg-white border border-gray-200 rounded-lg divide-y">
                        {generatedPayrolls.map((period) => (
                          <div key={period._id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="font-medium">{period.monthName} {period.year}</p>
                              <p className="text-sm text-gray-500">
                                Generated on: {new Date(period.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleViewPayslip(period._id, employeeDetails?.id)}
                              className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Payslip
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => {
          setIsPayslipModalOpen(false);
          setSelectedPayslip(null);
          setSelectedEmployeeForPayslip('');
        }}
        entry={selectedPayslip}
        month={selectedPayslip?.month ? months.findIndex(m => m.name === selectedPayslip.month) + 1 : selectedMonth}
        year={selectedPayslip?.year || selectedYear}
        // Add these props for admin
        isAdmin={isAdmin || isManager}
        employees={availableEmployees}
        onEmployeeChange={handleEmployeeChange}
        selectedEmployeeId={selectedEmployeeForPayslip}
      />
    </div>
  );
};

export default PayrollPage;