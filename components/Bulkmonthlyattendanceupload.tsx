import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { api, BulkMonthlyAttendanceDto } from '../services/api'; // Add BulkMonthlyAttendanceDto import

interface UploadResult {
  success: boolean;
  imported: number;
  failed: number;
  message: string;
  errors: Array<{ row: number; staffId: string; error: string }>;
}
//
export const BulkMonthlyAttendanceUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [parsedData, setParsedData] = useState<BulkMonthlyAttendanceDto[]>([]);
  

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setParsedData([]);
    }
  };

  const parseExcelFile = (file: File): Promise<BulkMonthlyAttendanceDto[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

          // Map Excel columns to DTO format
          const records: BulkMonthlyAttendanceDto[] = jsonData.map((row) => ({
            staffId: String(row['Staff ID'] || row['staffId'] || '').trim(),
            name: String(row['Name'] || row['name'] || '').trim(),
            month: Number(row['Month'] || row['month'] || 0),
            absences: Number(row['Absence'] || row['absences'] || 0),
            lateHours: Number(row['Late Hours'] || row['lateHours'] || 0),
            overtimeHours: Number(row['OT Hours'] || row['overtimeHours'] || 0),
            year: row['Year'] || row['year'] ? Number(row['Year'] || row['year']) : undefined,
          }));

          // Filter out empty rows
          const validRecords = records.filter(
            (record) => record.staffId && record.name && record.month,
          );

          resolve(validRecords);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Parse Excel file
      const records = await parseExcelFile(file);
      setParsedData(records);

      if (records.length === 0) {
        alert('No valid records found in the file');
        setIsUploading(false);
        return;
      }

      // ⭐ FIX: Use api.importMonthlyAttendance instead of standalone function
      const result = await api.importMonthlyAttendance(records);
      setUploadResult(result);

      if (result.success && result.failed === 0) {
        alert(`Successfully imported ${result.imported} records!`);
        setFile(null);
        setParsedData([]);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create sample data
    const templateData = [
      {
        'Staff ID': 'EMP001',
        Name: 'John Doe',
        Month: 1,
        Absence: 2,
        'Late Hours': 5.5,
        'OT Hours': 10,
        Year: new Date().getFullYear(),
      },
      {
        'Staff ID': 'EMP002',
        Name: 'Jane Smith',
        Month: 1,
        Absence: 0,
        'Late Hours': 2.0,
        'OT Hours': 15,
        Year: new Date().getFullYear(),
      },
      {
        'Staff ID': 'EMP003',
        Name: 'Bob Johnson',
        Month: 1,
        Absence: 1,
        'Late Hours': 3.5,
        'OT Hours': 8,
        Year: new Date().getFullYear(),
      },
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Attendance');

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Staff ID
      { wch: 20 }, // Name
      { wch: 8 },  // Month
      { wch: 10 }, // Absence
      { wch: 12 }, // Late Hours
      { wch: 12 }, // OT Hours
      { wch: 8 },  // Year
    ];

    // Download file
    XLSX.writeFile(wb, 'monthly_attendance_template.xlsx');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Bulk Monthly Attendance Upload
      </h2>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">📋 Instructions:</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>Download the Excel template using the button below</li>
          <li>Fill in the attendance data for each employee:</li>
          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
            <li><strong>Staff ID</strong>: Employee staff ID (must match database)</li>
            <li><strong>Name</strong>: Employee name (for verification)</li>
            <li><strong>Month</strong>: 1-12 (January = 1, December = 12)</li>
            <li><strong>Absence</strong>: Number of absence days</li>
            <li><strong>Late Hours</strong>: Total late hours (decimal format, e.g., 5.5)</li>
            <li><strong>OT Hours</strong>: Total overtime hours (decimal format)</li>
            <li><strong>Year</strong>: Optional, defaults to current year</li>
          </ul>
          <li>Upload the completed Excel file</li>
          <li>Maximum 1000 records per upload</li>
        </ul>
      </div>

      <div className="mb-6">
        <button
          onClick={downloadTemplate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          📥 Download Excel Template
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📤 Upload Excel File
        </label>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            cursor-pointer"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: <span className="font-medium">{file.name}</span>
          </p>
        )}
      </div>

      {parsedData.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            ✅ Parsed {parsedData.length} records from file
          </p>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-sm ${
            !file || isUploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isUploading ? '⏳ Uploading...' : '🚀 Upload Attendance Data'}
        </button>
      </div>

      {uploadResult && (
        <div
          className={`p-6 rounded-lg border-2 ${
            uploadResult.failed === 0
              ? 'bg-green-50 border-green-300'
              : 'bg-yellow-50 border-yellow-300'
          }`}
        >
          <h3 className="font-semibold text-lg mb-3 text-gray-800">
            📊 Upload Results:
          </h3>
          <p className="mb-3 text-gray-700">{uploadResult.message}</p>
          <div className="text-sm space-y-1">
            <p className="text-green-700 font-medium">
              ✅ Successfully imported: {uploadResult.imported}
            </p>
            {uploadResult.failed > 0 && (
              <p className="text-red-700 font-medium">
                ❌ Failed: {uploadResult.failed}
              </p>
            )}
          </div>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-red-800">⚠️ Errors:</h4>
              <div className="max-h-60 overflow-y-auto bg-white rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Staff ID
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.errors.map((error, idx) => (
                      <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{error.row}</td>
                        <td className="px-4 py-3 font-medium">{error.staffId}</td>
                        <td className="px-4 py-3 text-red-600">{error.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkMonthlyAttendanceUpload;
