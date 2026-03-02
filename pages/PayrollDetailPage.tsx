import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, Button } from '../components/UI';
import { api } from '../services/api';

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

// Helper function to calculate entry (same logic as PayrollPage)
const calculateEntryLocally = (entry: PayrollEntry): PayrollEntry => {
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
  
  // Overtime amount = 1 × (overtimeHours × hourlyRate)
  calculated.overtimeAmount = calculated.hourlyRate > 0 
    ? Number(((entry.overtimeHours || 0) * calculated.hourlyRate * 1).toFixed(2)) 
    : 0;
  
  // Net Deductions = All Deductions - Overtime Amount
  calculated.netDeductions = Number((
    (calculated.allDeductions || 0) - (calculated.overtimeAmount || 0)
  ).toFixed(2));
  
  // January Net Salary = TOTAL - Net Deductions + Extra From Manager
  calculated.januaryNetSalary = Number((
    (calculated.total || 0) -
    (calculated.netDeductions || 0) +
    (entry.extraFromManager || 0)
  ).toFixed(2));
  
  // Total January Salary = January Net Salary + Back Payment
  calculated.totalJanuarySalary = Number((
    (calculated.januaryNetSalary || 0) +
    (entry.backPayment || 0) +
    (entry.finalModification || 0)
  ).toFixed(2));
  
  // Before OT = TOTAL - Net Deductions
  calculated.beforeOT = Number((
    (calculated.total || 0) - (calculated.netDeductions || 0)
  ).toFixed(2));
  
  // OT = Overtime Amount
  calculated.ot = calculated.overtimeAmount;
  
  // Total Calculated = Before OT + OT + Extra From Manager + Back Payment + Final Modification
  calculated.totalCalculated = Number((
    (calculated.beforeOT || 0) +
    (calculated.ot || 0) +
    (entry.extraFromManager || 0) +
    (entry.backPayment || 0) +
    (entry.finalModification || 0)
  ).toFixed(2));
  
  // Difference = Total Calculated - Target Rate
  calculated.dfrnce = Number((
    (calculated.totalCalculated || 0) - (entry.targetRate || 0)
  ).toFixed(2));
  
  // Deductions = Net Deductions
  calculated.deductions = calculated.netDeductions;
  
  // In Days = (Total January Salary ÷ CTC) × 30
  calculated.inDays = entry.ctc > 0 
    ? Number(((calculated.totalJanuarySalary / entry.ctc) * 30).toFixed(2)) 
    : 0;
  
  return calculated;
};

const PayrollDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { entryId } = useParams<{ entryId: string }>();
  const location = useLocation();
  
  // Get initial entry from navigation state
  const initialEntry = location.state?.entry as PayrollEntry | undefined;
  
  const [formData, setFormData] = useState<PayrollEntry | null>(initialEntry || null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // If no entry provided, go back to payroll page
  useEffect(() => {
    if (!initialEntry) {
      console.error('No entry data provided');
      navigate('/payroll');
    } else {
      console.log('📝 PayrollDetailPage loaded with entry:', {
        id: initialEntry.id,
        name: initialEntry.name,
        isEditable: initialEntry.isEditable,
        status: initialEntry.status
      });
    }
  }, [initialEntry, navigate]);

  const handleFieldChange = (field: string, value: any) => {
    if (!formData) return;
    
    const updatedData = {
      ...formData,
      [field]: value
    };
    
    // Recalculate dependent fields
    const recalculated = calculateEntryLocally(updatedData);
    setFormData(recalculated);
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!formData) return;
    
    console.log('🔵 SAVE BUTTON CLICKED - Starting save process');
    console.log('🔵 Entry ID:', formData.id);
    console.log('🔵 OFF DAYS VALUE:', formData.offDays); // Check this
    console.log('🔵 WORKED DAYS VALUE:', formData.workedDays); // Check this
    
    setIsSaving(true);
    
    try {
        // Prepare update data for ALL fields
        const updateData = {
        // Make sure these are included!
        offDays: formData.offDays,
        workedDays: formData.workedDays,
        
        // Attendance fields
        offDaysWorked: formData.offDaysWorked,
        holidayWorked: formData.holidayWorked,
        leaveSalary: formData.leaveSalary,
        cashAdvance: formData.cashAdvance,
        penaltyPoints: formData.penaltyPoints,
        
        // Deduction fields
        visaCost: formData.visaCost,
        fines: formData.fines,
        cleaningFees: formData.cleaningFees,
        absences: formData.absences,
        unauthorizedAbsences: formData.unauthorizedAbsences,
        lateHours: formData.lateHours,
        
        // Overtime fields
        overtimeHours: formData.overtimeHours,
        
        // Additional fields
        extraFromManager: formData.extraFromManager,
        backPayment: formData.backPayment,
        finalModification: formData.finalModification,
        hrNotes: formData.hrNotes,
        
        // Calculated fields
        dailyRate: formData.dailyRate,
        hourlyRate: formData.hourlyRate,
        offDayAmount: formData.offDayAmount,
        holidayAmount: formData.holidayAmount,
        total: formData.total,
        authAbsenceDeduction: formData.authAbsenceDeduction,
        unauthAbsenceDeduction: formData.unauthAbsenceDeduction,
        tardiness: formData.tardiness,
        allDeductions: formData.allDeductions,
        overtimeAmount: formData.overtimeAmount,
        netDeductions: formData.netDeductions,
        januaryNetSalary: formData.januaryNetSalary,
        totalJanuarySalary: formData.totalJanuarySalary,
        beforeOT: formData.beforeOT,
        ot: formData.ot,
        totalCalculated: formData.totalCalculated,
        dfrnce: formData.dfrnce,
        deductions: formData.deductions,
        inDays: formData.inDays,
        };
        
        console.log('📤 Sending to API - updateData:', JSON.stringify(updateData, null, 2));
        
        // Save to database
        const response = await api.updatePayrollEntry(formData.id, updateData);
        
        console.log('✅ API Response:', response);
        
        // Navigate back with the updated data
        navigate('/payroll', { 
        state: { 
            updatedEntry: formData,
            shouldRefresh: false 
        } 
        });
        
    } catch (error: any) {
        console.error('❌ Failed to save changes:', error);
        alert('Failed to save changes: ' + (error.message || 'Unknown error'));
    } finally {
        setIsSaving(false);
    }
    };

  const handleCancel = () => {
    if (isModified) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/payroll');
      }
    } else {
      navigate('/payroll');
    }
  };

  if (!formData) {
    return null;
  }

  const isReadOnly = formData.status === 'generated';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Payroll
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Details</h1>
          <p className="text-gray-600 mt-1">
            {formData.name} - {formData.month} {formData.year}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isModified && (
            <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              ● Unsaved Changes
            </span>
          )}
          {isReadOnly && (
            <span className="text-sm text-green-700 bg-green-100 px-3 py-2 rounded-lg font-medium">
              🔒 Read Only - Generated
            </span>
          )}
        </div>
      </div>

      {/* Alert: Changes are local */}
      {!isReadOnly && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Changes made here are saved locally. To save to the database, return to the payroll table and click "Generate Payroll".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="space-y-6">
        {/* Employee Information */}
        <Card>
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
              Employee Information
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SR No.</label>
              <input
                type="text"
                value={formData.sr}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </Card>

        {/* Month & Attendance */}
        <Card>
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
            <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
              Month & Attendance
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <input
                type="text"
                value={formData.month}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="text"
                value={formData.year}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Days</label>
              <input
                type="number"
                value={formData.totalDays}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Off Days</label>
              <input
                type="number"
                value={formData.offDays}
                onChange={(e) => handleFieldChange('offDays', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Taken</label>
              <input
                type="number"
                value={formData.leaveTaken}
                onChange={(e) => handleFieldChange('leaveTaken', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Worked Days</label>
              <input
                type="number"
                value={formData.workedDays}
                onChange={(e) => handleFieldChange('workedDays', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
          </div>
        </Card>

        {/* Salary & Rates */}
        <Card>
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
            <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wide">
              Salary & Rates (Calculated)
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTC</label>
              <input
                type="text"
                value={`AED ${formData.ctc.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
              <input
                type="text"
                value={`AED ${formData.dailyRate.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
              <input
                type="text"
                value={`AED ${formData.hourlyRate.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
          </div>
        </Card>

        {/* Special Days */}
        <Card>
          <div className="bg-orange-50 px-4 py-2 border-b border-orange-100">
            <h3 className="text-sm font-semibold text-orange-900 uppercase tracking-wide">
              Special Days
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Off Days Worked</label>
              <input
                type="number"
                value={formData.offDaysWorked}
                onChange={(e) => handleFieldChange('offDaysWorked', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Off Day Amount</label>
              <input
                type="text"
                value={`AED ${formData.offDayAmount.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Worked</label>
              <input
                type="number"
                value={formData.holidayWorked}
                onChange={(e) => handleFieldChange('holidayWorked', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Amount</label>
              <input
                type="text"
                value={`AED ${formData.holidayAmount.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Salary</label>
              <input
                type="number"
                value={formData.leaveSalary}
                onChange={(e) => handleFieldChange('leaveSalary', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Advance</label>
              <input
                type="number"
                value={formData.cashAdvance}
                onChange={(e) => handleFieldChange('cashAdvance', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Points</label>
              <input
                type="number"
                value={formData.penaltyPoints}
                onChange={(e) => handleFieldChange('penaltyPoints', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Earnings</label>
              <input
                type="text"
                value={`AED ${formData.total.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-sky-50 text-sky-700 font-mono font-semibold"
              />
            </div>
          </div>
        </Card>

        {/* Deductions */}
        <Card>
          <div className="bg-red-50 px-4 py-2 border-b border-red-100">
            <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wide">
              Deductions
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visa Cost</label>
              <input
                type="number"
                value={formData.visaCost}
                onChange={(e) => handleFieldChange('visaCost', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Absences</label>
              <input
                type="number"
                value={formData.absences}
                onChange={(e) => handleFieldChange('absences', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unauthorized Absences</label>
              <input
                type="number"
                value={formData.unauthorizedAbsences}
                onChange={(e) => handleFieldChange('unauthorizedAbsences', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Hours</label>
              <input
                type="number"
                value={formData.lateHours}
                onChange={(e) => handleFieldChange('lateHours', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Absence Deduction</label>
              <input
                type="text"
                value={`AED ${formData.authAbsenceDeduction.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unauth Absence Deduction</label>
              <input
                type="text"
                value={`AED ${formData.unauthAbsenceDeduction.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tardiness</label>
              <input
                type="text"
                value={`AED ${formData.tardiness.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fines</label>
              <input
                type="number"
                value={formData.fines}
                onChange={(e) => handleFieldChange('fines', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cleaning Fees</label>
              <input
                type="number"
                value={formData.cleaningFees}
                onChange={(e) => handleFieldChange('cleaningFees', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">All Deductions</label>
              <input
                type="text"
                value={`AED ${formData.allDeductions.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-rose-50 text-rose-700 font-mono font-semibold"
              />
            </div>
          </div>
        </Card>

        {/* Overtime */}
        <Card>
          <div className="bg-green-50 px-4 py-2 border-b border-green-100">
            <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide">
              Overtime
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours</label>
              <input
                type="number"
                value={formData.overtimeHours}
                onChange={(e) => handleFieldChange('overtimeHours', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Amount</label>
              <input
                type="text"
                value={`AED ${formData.overtimeAmount.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Net Deductions</label>
              <input
                type="text"
                value={`AED ${formData.netDeductions.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
          </div>
        </Card>

        {/* Additional Adjustments */}
        <Card>
          <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
            <h3 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
              Additional Adjustments
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra From Manager</label>
              <input
                type="number"
                value={formData.extraFromManager}
                onChange={(e) => handleFieldChange('extraFromManager', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Back Payment</label>
              <input
                type="number"
                value={formData.backPayment}
                onChange={(e) => handleFieldChange('backPayment', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Final Modification</label>
              <input
                type="number"
                value={formData.finalModification}
                onChange={(e) => handleFieldChange('finalModification', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Rate</label>
              <input
                type="number"
                value={formData.targetRate}
                onChange={(e) => handleFieldChange('targetRate', Number(e.target.value))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
                }`}
              />
            </div>
          </div>
        </Card>

        {/* Final Calculations */}
        <Card>
          <div className="bg-sky-50 px-4 py-2 border-b border-sky-100">
            <h3 className="text-sm font-semibold text-sky-900 uppercase tracking-wide">
              Final Calculations
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Before OT</label>
              <input
                type="text"
                value={`AED ${formData.beforeOT.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OT</label>
              <input
                type="text"
                value={`AED ${formData.ot.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Calculated</label>
              <input
                type="text"
                value={`AED ${formData.totalCalculated.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difference</label>
              <input
                type="text"
                value={`AED ${formData.dfrnce.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-amber-50 text-amber-700 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">January Net Salary</label>
              <input
                type="text"
                value={`AED ${formData.januaryNetSalary.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-sky-50 text-sky-700 font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total January Salary</label>
              <input
                type="text"
                value={`AED ${formData.totalJanuarySalary.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-sky-100 text-sky-900 font-mono font-bold text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
              <input
                type="text"
                value={`AED ${formData.deductions.toFixed(2)}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">In Days</label>
              <input
                type="text"
                value={formData.inDays.toFixed(2)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 font-mono"
              />
            </div>
          </div>
        </Card>

        {/* HR Notes */}
        <Card>
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              HR Notes
            </h3>
          </div>
          <div className="p-6">
            <textarea
              value={formData.hrNotes}
              onChange={(e) => handleFieldChange('hrNotes', e.target.value)}
              disabled={isReadOnly}
              rows={4}
              placeholder="Add any notes or comments here..."
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                isReadOnly ? 'bg-gray-50 text-gray-600' : 'bg-white'
              }`}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <Button
            onClick={handleCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          
          {!isReadOnly && (
            <Button
            onClick={handleSave}
            disabled={!isModified || isSaving}
            className="min-w-[120px]"
            >
            {isSaving ? (
                <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
                </div>
            ) : (
                'Save Changes'
            )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailPage;