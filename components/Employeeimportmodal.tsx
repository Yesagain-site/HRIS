// EmployeeImportModal.tsx
// NEW FILE — place this in the same folder as your PersonnelPage component.
//
// Before using, install SheetJS:
//   npm install xlsx

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../services/api'; // adjust path if needed

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedEmployee {
  row: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; staffId: string; reason: string }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void; // called after successful import so parent can refresh
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = [
  'staffId', 'firstName', 'lastName', 'email', 'phone',
  'joiningDate', 'designation', 'department', 'baseSalary', 'presentGrossSalary',
];

const DATE_COLUMNS = [
  'joiningDate', 'dob', 'passportExp',
  'visaStartDate', 'visaExpDate', 'eidIssueDate', 'eidExpDate',
];

const NUMBER_COLUMNS = [
  'baseSalary', 'presentGrossSalary', 'previousSalary', 'targetRate',
];

const BOOL_COLUMNS = ['isTaxable', 'isOvertimeEligible'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Excel date serial or string to YYYY-MM-DD */
function toISODate(value: any): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t; // already ISO
    const parts = t.split('/');
    if (parts.length === 3) {
      // Handle DD/MM/YYYY or MM/DD/YYYY — we assume DD/MM/YYYY for UAE
      const [d, m, y] = parts;
      return `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return t;
  }
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
  }
  return String(value);
}

/** Parse "Food:400,Housing:1000" → [{name,amount}] */
function parseAllowances(raw: any): { name: string; amount: number }[] {
  if (!raw || String(raw).trim() === '') return [];
  return String(raw).split(',').map(part => {
    const [name, amt] = part.split(':');
    return { name: (name || '').trim(), amount: parseFloat(amt) || 0 };
  }).filter(a => a.name);
}

/** Parse "Name|Relationship|Phone" → {name,relationship,phone} */
function parseEmergencyContact(raw: any): Record<string, string> {
  if (!raw || String(raw).trim() === '') return {};
  const [name, relationship, phone] = String(raw).split('|');
  return {
    name: (name || '').trim(),
    relationship: (relationship || '').trim(),
    phone: (phone || '').trim(),
  };
}

/** Validate a single parsed row */
function validateRow(row: Record<string, any>, rowNum: number): ParsedEmployee {
  const errors: string[] = [];

  for (const col of REQUIRED_COLUMNS) {
    if (row[col] === undefined || row[col] === null || String(row[col]).trim() === '') {
      errors.push(`"${col}" is required`);
    }
  }

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
    errors.push('Invalid email format');
  }

  for (const col of DATE_COLUMNS) {
    const val = row[col];
    if (val && !/^\d{4}-\d{2}-\d{2}$/.test(String(val))) {
      errors.push(`"${col}" must be YYYY-MM-DD (got: ${val})`);
    }
  }

  return { row: rowNum, data: row, errors, valid: errors.length === 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

const EmployeeImportModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [parsed, setParsed] = useState<ParsedEmployee[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = parsed.filter(p => p.valid);
  const invalidRows = parsed.filter(p => !p.valid);

  // ── Parse the uploaded Excel file ─────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (raw.length === 0) {
          alert('The Excel file is empty. Please add employee data below the header row.');
          return;
        }

        const parsedRows: ParsedEmployee[] = raw.map((row, i) => {
          const cleaned: Record<string, any> = { ...row };

          // Dates
          for (const col of DATE_COLUMNS) {
            cleaned[col] = cleaned[col] !== '' ? toISODate(cleaned[col]) : undefined;
          }
          // Numbers
          for (const col of NUMBER_COLUMNS) {
            cleaned[col] = cleaned[col] !== '' ? parseFloat(cleaned[col]) || 0 : 0;
          }
          // Booleans
          for (const col of BOOL_COLUMNS) {
            const v = String(cleaned[col] || '').toLowerCase().trim();
            cleaned[col] = v === 'true' || v === 'yes' || v === '1';
          }
          // Defaults for optional fields
          if (!cleaned.workStatus)    cleaned.workStatus    = 'Active';
          if (!cleaned.gender)        cleaned.gender        = 'Male';
          if (!cleaned.maritalStatus) cleaned.maritalStatus = 'Single';
          if (!cleaned.payFrequency)  cleaned.payFrequency  = 'Monthly';
          if (!cleaned.visaStatus)    cleaned.visaStatus    = 'Active';

          return validateRow(cleaned, i + 2);
        });

        setParsed(parsedRows);
        setStep('preview');
      } catch (err) {
        console.error(err);
        alert('Could not read the file. Make sure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  // ── Download blank template ────────────────────────────────────────────────

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
      '001','John','','Smith','john.smith@company.com','0501234567',
      'Male','1990-01-15','Indian','Single','Dubai',
      'Active','2026-03-01','Software Engineer','Technology',
      '5000','6000','6500',
      'Food:400,Housing:1000','','Monthly','0',
      'Emirates NBD','AE070331234567890123456','false','true',
      'A1234567','2030-01-01','Active','2026-01-01','2028-01-01',
      '784-1990-1234567-1','2026-01-01','2028-01-01',
      'Jane Smith|Spouse|0509876543','',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_import_template.xlsx');
  };

  // ── Send to backend ────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const records = validRows.map(p => ({
        ...p.data,
        allowances: parseAllowances(p.data.allowances),
        emergencyContact: parseEmergencyContact(p.data.emergencyContact),
        leaveBalances: {
          Annual: { total: 24, taken: 0 },
          Sick: { total: 10, taken: 0 },
        },
        documents: [],
        customFieldValues: {},
      }));

      const result = await api.bulkImportEmployees(records);
      setImportResult(result);
      setStep('result');
      if (result.success > 0) onSuccess(result.success);
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  // ── Reset back to upload step ──────────────────────────────────────────────

  const handleReset = () => {
    setStep('upload');
    setParsed([]);
    setFileName('');
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!isOpen) return null;

  const stepIndex = ['upload', 'preview', 'result'].indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
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
              <p className="text-xs text-gray-500">Upload an Excel file to bulk-add employees</p>
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

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════════════ STEP 1: UPLOAD ════════════════ */}
          {step === 'upload' && (
            <div className="p-6 flex flex-col gap-5">

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
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
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Template tip */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">First time? Download the template</p>
                  <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                    Includes all columns with an example row. Dates must be <strong>YYYY-MM-DD</strong>.
                    Allowances: <code className="bg-amber-100 px-1 rounded text-amber-700">Food:400,Housing:1000</code> &nbsp;
                    Emergency contact: <code className="bg-amber-100 px-1 rounded text-amber-700">Name|Relationship|Phone</code>
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>

              {/* Required columns reference */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Columns</p>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_COLUMNS.map(col => (
                    <span key={col} className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 2: PREVIEW ════════════════ */}
          {step === 'preview' && (
            <div className="flex flex-col">

              {/* Summary bar */}
              <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                  <span className="text-gray-400 text-xs">File:</span>
                  <span className="font-medium text-gray-700 text-xs truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {validRows.length} valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      {invalidRows.length} errors
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{parsed.length} total</span>
                </div>
              </div>

              {/* Validation errors panel */}
              {invalidRows.length > 0 && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} have errors and will be skipped
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {invalidRows.map(r => (
                      <div key={r.row} className="flex items-start gap-2 text-xs">
                        <span className="font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex-shrink-0">
                          Row {r.row}
                        </span>
                        <span className="text-red-600">{r.errors.join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data preview table */}
              <div className="overflow-auto px-6 py-4" style={{ maxHeight: '380px' }}>
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0">
                    <tr className="bg-gray-50">
                      {['Row','Status','Staff ID','Name','Email','Department','Designation','Gross Salary'].map(h => (
                        <th key={h} className={`px-3 py-2.5 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap ${h === 'Gross Salary' ? 'text-right' : ''}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p) => (
                      <tr key={p.row} className={`border-b border-gray-100 ${p.valid ? 'hover:bg-gray-50' : 'bg-red-50/50'}`}>
                        <td className="px-3 py-2 text-gray-400">{p.row}</td>
                        <td className="px-3 py-2">
                          {p.valid
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Valid
                              </span>
                            : <span className="inline-flex items-center gap-1 text-red-500 font-semibold" title={p.errors.join(', ')}>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Error
                              </span>
                          }
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-700">{p.data.staffId || '—'}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {p.data.firstName} {p.data.lastName}
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{p.data.email}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.data.department}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.data.designation}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-700">
                          {p.data.presentGrossSalary
                            ? `AED ${Number(p.data.presentGrossSalary).toLocaleString()}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════ STEP 3: RESULT ════════════════ */}
          {step === 'result' && importResult && (
            <div className="p-8 flex flex-col items-center gap-6">

              {/* Hero icon */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center
                ${importResult.success > 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {importResult.success > 0
                  ? <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  : <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                }
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Import Complete</h3>
                <p className="text-sm text-gray-500">
                  {importResult.success > 0
                    ? `${importResult.success} employee${importResult.success !== 1 ? 's' : ''} added to the system`
                    : 'No employees were imported'}
                  {importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                  <p className="text-4xl font-extrabold text-emerald-600">{importResult.success}</p>
                  <p className="text-xs font-semibold text-emerald-500 mt-1 uppercase tracking-wide">Imported</p>
                </div>
                <div className={`border rounded-2xl p-5 text-center
                  ${importResult.failed > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-4xl font-extrabold ${importResult.failed > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                    {importResult.failed}
                  </p>
                  <p className={`text-xs font-semibold mt-1 uppercase tracking-wide
                    ${importResult.failed > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    Failed
                  </p>
                </div>
              </div>

              {/* Server-side error list */}
              {importResult.errors.length > 0 && (
                <div className="w-full max-w-lg bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">Server rejected these rows:</p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded flex-shrink-0">
                          Row {e.row}
                        </span>
                        <span className="text-gray-500 font-mono">{e.staffId}</span>
                        <span className="text-red-600">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">

          {step === 'upload' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Cancel
              </button>
              <p className="text-xs text-gray-400">Max 500 rows per import</p>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-3">
                {validRows.length === 0 && (
                  <p className="text-xs text-red-500 font-medium">No valid rows to import</p>
                )}
                <button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || importing}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl
                    hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-200"
                >
                  {importing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing…
                    </>
                  ) : (
                    `Import ${validRows.length} Employee${validRows.length !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'result' && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Import Another File
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
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