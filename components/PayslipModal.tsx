import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PayrollEntry {
  id: string;
  employeeId?: string;
  staffId?: string;
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

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PayrollEntry | null;
  month: number;
  year: number;
  isAdmin?: boolean;
  employees?: Array<{ id: string; name: string; designation: string; department: string }>;
  onEmployeeChange?: (employeeId: string) => void;
  selectedEmployeeId?: string;
}

const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  entry,
  month,
  year,
  isAdmin = false,
  employees = [],
  onEmployeeChange,
  selectedEmployeeId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localEntry, setLocalEntry] = useState<PayrollEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const payslipRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entry) {
      console.log('📄 PayslipModal received entry:', {
        name: entry.name,
        employeeId: entry.employeeId,
        id: entry.id
      });
      setLocalEntry(entry);
      setIsLoading(false);
      setModalKey(prev => prev + 1);
    }
  }, [entry]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    
    const searchLower = searchTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(searchLower) ||
      emp.department.toLowerCase().includes(searchLower) ||
      emp.designation.toLowerCase().includes(searchLower)
    );
  }, [employees, searchTerm]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const handleEmployeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newEmployeeId = e.target.value;
    
    console.log('🎯 DROPDOWN CHANGED!');
    console.log('  Selected value:', newEmployeeId);
    console.log('  Previous value:', selectedEmployeeId);
    console.log('  displayEntry.employeeId:', localEntry?.employeeId);
    
    if (!newEmployeeId || newEmployeeId === '') {
      console.log('⚠️ Empty selection, ignoring');
      return;
    }
    
    setIsLoading(true);
    setSearchTerm('');
    
    if (onEmployeeChange) {
      console.log('📞 Calling parent onEmployeeChange with:', newEmployeeId);
      onEmployeeChange(newEmployeeId);
    } else {
      console.error('❌ onEmployeeChange is not defined!');
    }
  };

  // 🔴 PRINT function - opens print dialog
  const handlePrint = () => {
    const printEntry = displayEntry;
    const monthName = months[month-1];
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print the payslip');
      return;
    }

    const styles = getPayslipStyles();
    const content = getPayslipHTML(printEntry, monthName, year, isAdmin);

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // 🔴 DOWNLOAD function - directly downloads PDF without print dialog
  const handleDownload = async () => {
    if (!displayEntry) return;
    
    const monthName = months[month-1];
    const fileName = `Payslip_${displayEntry.name.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`;
    
    try {
      setIsLoading(true);
      
      // Create a temporary div to render the payslip
      const element = document.createElement('div');
      element.innerHTML = getPayslipHTML(displayEntry, monthName, year, isAdmin);
      element.style.width = '800px';
      element.style.padding = '20px';
      element.style.background = 'white';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);
      
      // Use html2canvas to convert to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      // Remove the temporary element
      document.body.removeChild(element);
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(fileName);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again or use Print instead.');
      setIsLoading(false);
    }
  };

  // Helper function to generate payslip styles
  const getPayslipStyles = () => `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: Arial, sans-serif; 
        font-size: 12px; 
        line-height: 1.4;
        padding: 20px;
        background: white;
      }
      .payslip { 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
        padding: 20px; 
        border: 1px solid #ddd;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .header { 
        text-align: center; 
        margin-bottom: 20px; 
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }
      .header h1 { font-size: 24px; margin-bottom: 5px; }
      .header p { color: #666; }
      .section { margin-bottom: 15px; }
      .section-title { 
        font-weight: bold; 
        margin-bottom: 8px; 
        padding: 5px; 
        background: #f5f5f5;
        border-left: 3px solid #333;
      }
      .info-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 10px; 
        margin-bottom: 15px;
      }
      .info-item { padding: 5px; }
      .info-label { 
        font-weight: bold; 
        font-size: 11px; 
        color: #666;
        margin-bottom: 2px;
      }
      .info-value { font-size: 13px; }
      .attendance-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        text-align: center;
        margin-bottom: 15px;
      }
      .attendance-item {
        background: #f8f9fa;
        padding: 8px;
        border-radius: 4px;
      }
      .attendance-label { 
        font-size: 10px; 
        color: #666;
        margin-bottom: 3px;
      }
      .attendance-value { 
        font-size: 16px; 
        font-weight: bold;
      }
      .earnings-deductions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse;
      }
      td { 
        padding: 5px; 
        border-bottom: 1px solid #eee;
      }
      td:first-child { text-align: left; }
      td:last-child { 
        text-align: right; 
        font-family: monospace;
      }
      .total-row td { 
        font-weight: bold; 
        border-top: 2px solid #333;
        padding-top: 8px;
      }
      .net-salary {
        background: #e3f2fd;
        padding: 15px;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .net-salary-label { 
        font-size: 16px; 
        font-weight: bold;
      }
      .net-salary-amount { 
        font-size: 22px; 
        font-weight: bold;
        color: #1976d2;
      }
      .notes {
        background: #fffde7;
        padding: 10px;
        border-left: 3px solid #fbc02d;
        font-size: 11px;
      }
      @media print {
        body { padding: 0; }
        .payslip { box-shadow: none; }
      }
    </style>
  `;

  // Helper function to generate payslip HTML
  const getPayslipHTML = (entry: any, monthName: string, year: number, isAdmin: boolean) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payslip - ${entry?.name} - ${monthName} ${year}</title>
      ${getPayslipStyles()}
    </head>
    <body>
      <div class="payslip">
        <div class="header">
          <h1>YesAgain Payslip</h1>
          <p>${monthName} ${year}</p>
          ${isAdmin ? `<p style="color: #f57c00; margin-top: 5px;">Admin View - ${entry?.name}</p>` : ''}
        </div>

        <div class="section">
          <div class="section-title">Employee Information</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Employee Name</div>
              <div class="info-value">${entry?.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Designation</div>
              <div class="info-value">${entry?.designation}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Department</div>
              <div class="info-value">${entry?.department}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Staff ID</div>
              <div class="info-value">${entry?.staffId || entry?.employeeId || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Attendance Summary</div>
          <div class="attendance-grid">
            <div class="attendance-item">
              <div class="attendance-label">Total Days</div>
              <div class="attendance-value">${entry?.totalDays}</div>
            </div>
            <div class="attendance-item">
              <div class="attendance-label">Off Days</div>
              <div class="attendance-value">${entry?.offDays}</div>
            </div>
            <div class="attendance-item">
              <div class="attendance-label">Leave Taken</div>
              <div class="attendance-value">${entry?.leaveTaken}</div>
            </div>
            <div class="attendance-item">
              <div class="attendance-label">Worked Days</div>
              <div class="attendance-value">${entry?.workedDays}</div>
            </div>
            <div class="attendance-item">
              <div class="attendance-label">OT Hours</div>
              <div class="attendance-value">${entry?.overtimeHours}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Salary Breakdown</div>
          <div class="earnings-deductions">
            <div>
              <h3 style="color: #2e7d32; margin-bottom: 10px; font-size: 14px;">Earnings</h3>
              <table>
                <tr><td>Basic Salary</td><td>${formatCurrency((entry?.ctc / entry?.totalDays) * entry?.workedDays)}</td></tr>
                <tr><td>Leave Salary</td><td>${formatCurrency(entry?.leaveSalary)}</td></tr>
                <tr><td>Off Day Worked</td><td>${formatCurrency(entry?.offDayAmount)}</td></tr>
                <tr><td>Holiday Worked</td><td>${formatCurrency(entry?.holidayAmount)}</td></tr>
                <tr><td>Overtime</td><td>${formatCurrency(entry?.overtimeAmount)}</td></tr>
                <tr><td>Manager Extra</td><td>${formatCurrency(entry?.extraFromManager)}</td></tr>
                <tr><td>Back Payment</td><td>${formatCurrency(entry?.backPayment)}</td></tr>
                <tr class="total-row"><td>TOTAL EARNINGS</td><td style="color: #2e7d32;">${formatCurrency(entry?.totalJanuarySalary)}</td></tr>
              </table>
            </div>
            <div>
              <h3 style="color: #c62828; margin-bottom: 10px; font-size: 14px;">Deductions</h3>
              <table>
                <tr><td>Cash Advance</td><td>${formatCurrency(entry?.cashAdvance)}</td></tr>
                <tr><td>Visa Cost</td><td>${formatCurrency(entry?.visaCost)}</td></tr>
                <tr><td>Auth Absences</td><td>${formatCurrency(entry?.authAbsenceDeduction)}</td></tr>
                <tr><td>Unauth Absences</td><td>${formatCurrency(entry?.unauthAbsenceDeduction)}</td></tr>
                <tr><td>Tardiness</td><td>${formatCurrency(entry?.tardiness)}</td></tr>
                <tr><td>Fines</td><td>${formatCurrency(entry?.fines)}</td></tr>
                <tr><td>Cleaning Fees</td><td>${formatCurrency(entry?.cleaningFees)}</td></tr>
                <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td style="color: #c62828;">${formatCurrency(entry?.deductions)}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <div class="net-salary">
          <div class="net-salary-label">NET SALARY</div>
          <div class="net-salary-amount">${formatCurrency(entry?.totalJanuarySalary)}</div>
        </div>

        ${entry?.hrNotes ? `
          <div class="notes">
            <strong>Notes:</strong> ${entry.hrNotes}
          </div>
        ` : ''}
        
        <!-- Footer notice -->
        <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #999; border-top: 1px dashed #ccc; padding-top: 10px;">
          This is a computer-generated document. No signature is required.
        </div>
      </div>
    </body>
    </html>
  `;

  const displayEntry = localEntry || entry;

  if (!isOpen) return null;

  if (!displayEntry) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Payslip</h3>
            <p className="text-sm text-gray-500 mb-4">No payslip data available for this employee.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentEmployee = displayEntry;

  return (
    <div key={modalKey} className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <h2 className="text-xl font-semibold text-gray-900">
              Payslip - {months[month-1]} {year}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isAdmin && employees.length > 0 && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200 flex-shrink-0">
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Search Employee:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, department, or designation..."
                    className="w-full px-4 py-2 pl-10 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchTerm && (
                  <p className="text-xs text-blue-600 mt-1">
                    Found {filteredEmployees.length} matching employees
                  </p>
                )}
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Select Employee:
                </label>
                <select
                  key={`select-${filteredEmployees.length}-${searchTerm}`}
                  value={selectedEmployeeId || displayEntry?.employeeId || ''}
                  onChange={handleEmployeeSelect}
                  className="block w-full px-4 py-2 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  disabled={isLoading}
                >
                  <option value="" disabled>Select an employee...</option>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.designation} ({emp.department})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No employees found</option>
                  )}
                </select>
                {isLoading && (
                  <p className="text-xs text-blue-600 mt-2 flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading payslip...
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <p className="text-blue-600">
                  Showing {filteredEmployees.length} of {employees.length} employees
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}

          <div ref={payslipRef} className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-gray-600">Loading payslip for selected employee...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center border-b pb-3">
                  <h2 className="text-2xl font-bold text-gray-800">YesAgain Payslip</h2>
                  <p className="text-sm text-gray-500 mt-1">{months[month-1]} {year}</p>
                  {isAdmin && (
                    <p className="text-sm text-orange-600 font-medium mt-1">
                      Admin View - {currentEmployee.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Employee Name</p>
                    <p className="font-medium">{currentEmployee.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Designation</p>
                    <p className="font-medium">{currentEmployee.designation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Department</p>
                    <p className="font-medium">{currentEmployee.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Staff ID</p>
                    <p className="font-medium">{currentEmployee.staffId || currentEmployee.employeeId || 'N/A'}</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Attendance Summary</h3>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="font-bold text-lg">{currentEmployee.totalDays}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Off</p>
                      <p className="font-bold text-lg">{currentEmployee.offDays}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Leave</p>
                      <p className="font-bold text-lg">{currentEmployee.leaveTaken}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-500">Worked</p>
                      <p className="font-bold text-lg">{currentEmployee.workedDays}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-gray-500">OT Hrs</p>
                      <p className="font-bold text-lg">{currentEmployee.overtimeHours}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-green-700">Earnings</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="py-1">Basic Salary</td><td className="text-right font-mono">{formatCurrency((currentEmployee.ctc / currentEmployee.totalDays) * currentEmployee.workedDays)}</td></tr>
                        <tr><td className="py-1">Leave Salary</td><td className="text-right font-mono">{formatCurrency(currentEmployee.leaveSalary)}</td></tr>
                        <tr><td className="py-1">Off Day</td><td className="text-right font-mono">{formatCurrency(currentEmployee.offDayAmount)}</td></tr>
                        <tr><td className="py-1">Holiday</td><td className="text-right font-mono">{formatCurrency(currentEmployee.holidayAmount)}</td></tr>
                        <tr><td className="py-1">Overtime</td><td className="text-right font-mono">{formatCurrency(currentEmployee.overtimeAmount)}</td></tr>
                        <tr><td className="py-1">Manager Extra</td><td className="text-right font-mono">{formatCurrency(currentEmployee.extraFromManager)}</td></tr>
                        <tr><td className="py-1">Back Payment</td><td className="text-right font-mono">{formatCurrency(currentEmployee.backPayment)}</td></tr>
                        <tr className="font-bold border-t"><td className="pt-2">TOTAL</td><td className="text-right pt-2 text-green-700">{formatCurrency(currentEmployee.totalJanuarySalary)}</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-red-700">Deductions</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="py-1">Cash Advance</td><td className="text-right font-mono">{formatCurrency(currentEmployee.cashAdvance)}</td></tr>
                        <tr><td className="py-1">Visa Cost</td><td className="text-right font-mono">{formatCurrency(currentEmployee.visaCost)}</td></tr>
                        <tr><td className="py-1">Auth Absences</td><td className="text-right font-mono">{formatCurrency(currentEmployee.authAbsenceDeduction)}</td></tr>
                        <tr><td className="py-1">Unauth Absences</td><td className="text-right font-mono">{formatCurrency(currentEmployee.unauthAbsenceDeduction)}</td></tr>
                        <tr><td className="py-1">Tardiness</td><td className="text-right font-mono">{formatCurrency(currentEmployee.tardiness)}</td></tr>
                        <tr><td className="py-1">Fines</td><td className="text-right font-mono">{formatCurrency(currentEmployee.fines)}</td></tr>
                        <tr><td className="py-1">Cleaning</td><td className="text-right font-mono">{formatCurrency(currentEmployee.cleaningFees)}</td></tr>
                        <tr className="font-bold border-t"><td className="pt-2">TOTAL</td><td className="text-right pt-2 text-red-700">{formatCurrency(currentEmployee.deductions)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-blue-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">NET SALARY</span>
                    <span className="text-2xl font-bold text-blue-700">{formatCurrency(currentEmployee.totalJanuarySalary)}</span>
                  </div>
                </div>

                {currentEmployee.hrNotes && (
                  <div className="border rounded-lg p-3 bg-yellow-50">
                    <p className="text-sm text-gray-600"><span className="font-semibold">Notes:</span> {currentEmployee.hrNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end items-center px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0 gap-3">
            {/* 🔴 PRINT Button */}
            <button
              onClick={handlePrint}
              disabled={isLoading}
              className={`px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2 shadow-lg ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>

            {/* 🔴 DOWNLOAD Button - Now downloads directly */}
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className={`px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center gap-2 shadow-lg ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;