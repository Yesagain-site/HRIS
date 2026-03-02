// EmployeeImportModal.tsx - PERFECT VERSION
import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { useHRData } from '../hooks/useHRData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedEmployee {
  row: number;
  data: Record<string, any>;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; staffId: string; reason: string }[];
  created: any[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_COLUMNS = [
  'joiningDate', 'dob', 'passportExp',
  'visaStartDate', 'visaExpDate', 'eidIssueDate', 'eidExpDate',
];

const NUMBER_COLUMNS = [
  'baseSalary', 'presentGrossSalary', 'previousSalary', 'targetRate',
];

const BOOLEAN_COLUMNS = ['isTaxable', 'isOvertimeEligible'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a valid email from employee data */
function generateEmail(firstName: string, lastName: string, staffId: string): string {
  const cleanFirstName = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLastName = (lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (cleanFirstName && cleanLastName) {
    return `${cleanFirstName}.${cleanLastName}@company.com`;
  } else if (cleanFirstName) {
    return `${cleanFirstName}${staffId}@company.com`;
  } else {
    return `employee${staffId}@company.com`;
  }
}

/** Convert Excel date to YYYY-MM-DD */
function toISODate(value: any): string | undefined {
  if (!value && value !== 0) return undefined;
  
  const str = String(value).trim();
  if (!str) return undefined;
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  
  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  
  // DD/MMM/YYYY (e.g., 07/Nov/2025)
  const monthMap: { [key: string]: string } = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  
  const match = str.match(/^(\d{1,2})[\/-](\w{3})[\/-](\d{4})$/i);
  if (match) {
    const [_, day, monthStr, year] = match;
    const month = monthMap[monthStr.toLowerCase()];
    if (month) return `${year}-${month}-${day.padStart(2, '0')}`;
  }
  
  // Excel serial number
  if (!isNaN(Number(str))) {
    try {
      const excelDate = Number(str);
      // Excel serial date: days since 1900-01-01
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return undefined;
}

/** Convert value to proper boolean */
function toBoolean(value: any): boolean {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return false;
  
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === 'yes' || str === '1' || str === 'y';
}

/** Parse allowances string */
function parseAllowances(raw: any): { name: string; amount: number }[] {
  if (!raw) return [];
  try {
    return String(raw).split(',').map(part => {
      const [name, amt] = part.split(':');
      return { 
        name: (name || '').trim(), 
        amount: Number(amt) || 0 
      };
    }).filter(a => a.name);
  } catch {
    return [];
  }
}

/** Parse emergency contact */
function parseEmergencyContact(raw: any): Record<string, string> {
  if (!raw) return {};
  try {
    const [name, relationship, phone] = String(raw).split('|');
    return {
      name: (name || '').trim(),
      relationship: (relationship || '').trim(),
      phone: (phone || '').trim(),
    };
  } catch {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const EmployeeImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsed, setParsed] = useState<ParsedEmployee[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { refreshEmployees } = useHRData();

  // ── Parse Excel file ──
  const parseFile = async (file: File) => {
    setProcessing(true);
    setFileName(file.name);
    
    try {
      // Read file as array buffer
      const buffer = await file.arrayBuffer();
      
      // Parse with XLSX
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      if (!workbook.SheetNames.length) {
        throw new Error('No sheets found in file');
      }
      
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      
      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });
      
      if (rawData.length < 2) {
        alert('The file has no data rows. Please add employee data below the headers.');
        setProcessing(false);
        return;
      }

      // Get headers from first row
      const headers = rawData[0] as string[];
      const rows = rawData.slice(1) as any[][];
      
      // Filter out completely empty rows
      const nonEmptyRows = rows.filter(row => row.some(cell => cell && String(cell).trim() !== ''));
      
      if (nonEmptyRows.length === 0) {
        alert('No data found in the file.');
        setProcessing(false);
        return;
      }

      // Process rows
      const parsedRows: ParsedEmployee[] = [];
      
      for (let i = 0; i < nonEmptyRows.length; i++) {
        const row = nonEmptyRows[i];
        const rowData: Record<string, any> = {};
        
        // Map columns to headers
        headers.forEach((header, index) => {
          if (header && header.trim()) {
            rowData[header.trim()] = row[index] !== undefined ? row[index] : '';
          }
        });

        // Process dates
        DATE_COLUMNS.forEach(col => {
          if (rowData[col]) {
            const parsed = toISODate(rowData[col]);
            if (parsed) rowData[col] = parsed;
          }
        });
        
        // Process numbers
        NUMBER_COLUMNS.forEach(col => {
          if (rowData[col] !== undefined && rowData[col] !== '') {
            const num = Number(rowData[col]);
            if (!isNaN(num)) rowData[col] = num;
          }
        });
        
        // Process booleans - CRITICAL FIX!
        BOOLEAN_COLUMNS.forEach(col => {
          rowData[col] = toBoolean(rowData[col]);
        });

        // Handle email - generate if missing or invalid
        if (!rowData.email || !String(rowData.email).includes('@')) {
          rowData.email = generateEmail(
            rowData.firstName || '', 
            rowData.lastName || '', 
            rowData.staffId || String(i + 1)
          );
        }

        // Ensure required fields have defaults
        rowData.workStatus = rowData.workStatus || 'Active';
        rowData.gender = rowData.gender || 'Male';
        rowData.maritalStatus = rowData.maritalStatus || 'Single';
        rowData.payFrequency = rowData.payFrequency || 'Monthly';
        rowData.visaStatus = rowData.visaStatus || 'Active';
        rowData.phone = rowData.phone || '0000000000';
        rowData.baseSalary = rowData.baseSalary || 0;
        rowData.presentGrossSalary = rowData.presentGrossSalary || rowData.baseSalary || 0;

        parsedRows.push({ 
          row: i + 2, // +2 because row 1 is headers
          data: rowData 
        });

        // Yield to UI every 50 rows
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setParsed(parsedRows);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Could not read the file. Make sure it is a valid .xlsx or .xls file.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
    // Clear input so same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  // ── Download template ──
  const downloadTemplate = () => {
    const headers = [
      'staffId','firstName','middleName','lastName','email','phone',
      'gender','dob','nationality','maritalStatus','address',
      'workStatus','joiningDate','designation','department',
      'previousSalary','baseSalary','presentGrossSalary',
      'allowances','payrollCode','payFrequency','targetRate',
      'bankName','iban','isTaxable','isOvertimeEligible',
      'passportNo','passportExp','visaStatus','visaStartDate','visaExpDate',
      'eidNumber','eidIssueDate','eidExpDate',
      'emergencyContact','remarks',
    ];
    
    const example = [
      'YA2601','AHMED','','MAHMOUD','ahmed.mahmoud@company.com','0501234567',
      'Male','1990-01-15','EGYPT','Single','Sharjah',
      'Active','2025-04-24','QC Masking','QC',
      '1700','1700','1700',
      '','','Monthly','0',
      '','','false','false',
      'A39451303','2027-11-06','Active','','2027-11-06',
      '','','',
      '','',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    
    // Set column widths
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_import_template.xlsx');
  };

  // ── Send to backend ──
  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    
    try {
      // Prepare records with proper types
      const records = parsed.map(p => ({
        ...p.data,
        allowances: parseAllowances(p.data.allowances),
        emergencyContact: parseEmergencyContact(p.data.emergencyContact),
        leaveBalances: {
          Annual: { total: 24, taken: 0 },
          Sick: { total: 10, taken: 0 },
        },
        documents: [],
        customFieldValues: {},
        // Ensure booleans are actual booleans
        isTaxable: p.data.isTaxable === true,
        isOvertimeEligible: p.data.isOvertimeEligible === true,
      }));

      const result = await api.bulkImportEmployees(records);
      setImportResult(result);
      setStep('result');
      if (result.success > 0) onSuccess(result.success);
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  // After successful import, call this:
  const handleImportSuccess = async (importedCount: number) => {
    try {
      await refreshEmployees(); // This will update the UI immediately
      alert(`${importedCount} employees imported successfully!`);
      onClose();
      if (onSuccess) onSuccess(importedCount);
    } catch (error) {
      console.error('Error refreshing employees:', error);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParsed([]);
    setFileName('');
    setImportResult(null);
    setProcessing(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!isOpen) return null;

  const stepIndex = ['upload', 'preview', 'result'].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-violet-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Employees</h2>
              <p className="text-xs text-gray-500">Upload Excel file - All rows accepted</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1">
            {['Upload', 'Preview', 'Result'].map((label, i) => (
              <React.Fragment key={label}>
                {i > 0 && <div className={`w-8 h-px mx-1 ${i <= stepIndex ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${i < stepIndex  ? 'bg-indigo-100 text-indigo-600' :
                      i === stepIndex ? 'bg-indigo-600 text-white' :
                                        'bg-gray-100 text-gray-400'}`}>
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block
                    ${i === stepIndex ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="p-6 flex flex-col gap-5">
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                onClick={() => !processing && fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {processing ? (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing file... Please wait</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-700 mb-1">Drop your Excel file here</p>
                    <p className="text-sm text-gray-400 mb-5">Supports .xlsx and .xls files</p>
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Browse File
                    </span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={processing}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">ℹ️ Smart Import</span> - Missing data gets defaults. 
                  Boolean fields (isTaxable, isOvertimeEligible) automatically set to false.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 'preview' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <span className="text-gray-400 text-xs">File:</span>
                  <span className="font-medium text-gray-700 text-xs truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    {parsed.length} rows to import
                  </span>
                </div>
              </div>

              <div className="overflow-auto px-6 py-4" style={{ maxHeight: '380px' }}>
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      {['Row', 'Staff ID', 'Name', 'Email', 'Department', 'Designation', 'Salary'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p) => (
                      <tr key={p.row} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{p.row}</td>
                        <td className="px-3 py-2 font-mono text-gray-700">{p.data.staffId || '—'}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">
                          {p.data.firstName || ''} {p.data.lastName || ''}
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{p.data.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{p.data.department || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{p.data.designation || '—'}</td>
                        <td className="px-3 py-2 font-semibold text-gray-700">
                          {p.data.baseSalary ? `AED ${p.data.baseSalary}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT */}
          {step === 'result' && importResult && (
            <div className="p-8 flex flex-col items-center gap-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center
                ${importResult.success > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {importResult.success > 0 ? (
                  <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Import Complete</h3>
                <p className="text-sm text-gray-500">
                  {importResult.success} imported, {importResult.failed} failed
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <p className="text-4xl font-extrabold text-emerald-600">{importResult.success}</p>
                  <p className="text-xs font-semibold text-emerald-500 mt-1">Imported</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                  <p className="text-4xl font-extrabold text-red-500">{importResult.failed}</p>
                  <p className="text-xs font-semibold text-red-400 mt-1">Failed</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="w-full max-w-lg bg-red-50 border border-red-100 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <p className="text-sm font-semibold text-red-700 mb-2">Server errors:</p>
                  {importResult.errors.map((e, i) => (
                    <div key={i} className="text-xs text-red-600 mb-1 pb-1 border-b border-red-100 last:border-0">
                      <span className="font-bold">Row {e.row} ({e.staffId}):</span> {e.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          {step === 'upload' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Download Template
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={parsed.length === 0 || importing}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  `Import ${parsed.length} Employee${parsed.length !== 1 ? 's' : ''}`
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                Import Another File
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeImportModal;