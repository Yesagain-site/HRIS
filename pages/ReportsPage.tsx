import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Button, Select, Input } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { Employee, PerformanceAppraisal, WorkStatus } from '../types';
import { 
  ChevronUpIcon, 
  ChevronDownIcon, 
  PrinterIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  HomeIcon,
  ClockIcon,
  ArrowUpTrayIcon
} from '../components/Icons';
// Fix: Use import instead of require
import html2pdf from 'html2pdf.js';

type ReportType = 'all' | 'active' | 'department' | 'expiring' | 'appraisal';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
} | null;

// Helper function to get full name
const getFullName = (employee: any): string => {
  const firstName = employee.firstName || '';
  const middleName = employee.middleName || '';
  const lastName = employee.lastName || '';
  return `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'Unknown';
};

const ReportsPage: React.FC = () => {
  const { employees, attendanceRecords } = useHRData();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [reportType, setReportType] = useState<ReportType>('all');
  const [filters, setFilters] = useState({
    department: '',
    expiryDays: '90',
    startDate: '',
    endDate: '',
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const departments = useMemo(() => 
    [...new Set(employees.map(e => e.department).filter(Boolean))], 
    [employees]
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let data: any[] = [];
    const today = new Date();

    try {
      switch (reportType) {
        case 'all':
          data = employees.map(emp => ({
            ...emp,
            fullName: getFullName(emp)
          }));
          break;
          
        case 'active':
          data = employees
            .filter(e => e.workStatus === WorkStatus.ACTIVE)
            .map(emp => ({
              ...emp,
              fullName: getFullName(emp)
            }));
          break;
          
        case 'department':
          if (!filters.department) {
            alert('Please select a department');
            setIsGenerating(false);
            return;
          }
          data = employees
            .filter(e => e.department === filters.department)
            .map(emp => ({
              ...emp,
              fullName: getFullName(emp)
            }));
          break;
          
        case 'expiring':
          const expiryLimit = new Date();
          expiryLimit.setDate(today.getDate() + parseInt(filters.expiryDays, 10));
          
          data = employees
            .filter(e => {
              const visaExp = e.visaExpDate ? new Date(e.visaExpDate) : null;
              const passportExp = e.passportExp ? new Date(e.passportExp) : null;
              
              const visaExpiring = visaExp && visaExp > today && visaExp <= expiryLimit;
              const passportExpiring = passportExp && passportExp > today && passportExp <= expiryLimit;
              
              return visaExpiring || passportExpiring;
            })
            .map(emp => ({
              ...emp,
              fullName: getFullName(emp),
              daysToExpiry: Math.min(
                emp.visaExpDate ? Math.ceil((new Date(emp.visaExpDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999,
                emp.passportExp ? Math.ceil((new Date(emp.passportExp).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999
              )
            }));
          break;
          
        case 'appraisal':
          if (!filters.startDate || !filters.endDate) {
            alert("Please select a valid date range for appraisal reports.");
            setIsGenerating(false);
            return;
          }
          
          const filterStart = new Date(filters.startDate);
          const filterEnd = new Date(filters.endDate);
          
          employees.forEach(emp => {
            if (emp.appraisals) {
              Object.entries(emp.appraisals).forEach(([periodKey, appraisal]) => {
                const [appraisalStartStr, appraisalEndStr] = periodKey.split('_');
                const appraisalStart = new Date(appraisalStartStr);
                const appraisalEnd = new Date(appraisalEndStr);

                // Check if appraisal period overlaps with filter period
                if (appraisalStart <= filterEnd && appraisalEnd >= filterStart) {
                  // Calculate KPIs for the specific appraisal period
                  const absences = attendanceRecords.filter(r => 
                      r.employeeId === emp.id && 
                      r.status === 'Absent' &&
                      new Date(r.date) >= appraisalStart && 
                      new Date(r.date) <= appraisalEnd
                  ).length;
                  
                  const warnings = (emp.warningLetters || []).filter(w =>
                      new Date(w.date) >= appraisalStart && 
                      new Date(w.date) <= appraisalEnd
                  ).length;

                  data.push({
                    id: emp.id,
                    fullName: getFullName(emp),
                    department: emp.department,
                    designation: emp.designation,
                    appraisalPeriod: periodKey.replace('_', ' to '),
                    ...(appraisal as PerformanceAppraisal),
                    kpiAbsences: absences,
                    kpiWarnings: warnings,
                    score: (appraisal as any).managerEvaluation || 'N/A',
                    notes: (appraisal as any).attitudeNotes || (appraisal as any).managerComments || 'No notes'
                  });
                }
              });
            }
          });
          break;
      }
      
      setReportData(data);
      setSortConfig(null); // Reset sort on new report
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sortedReportData = useMemo(() => {
    let sortableData = [...reportData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle special cases
        if (sortConfig.key === 'fullName') {
          aValue = a.fullName || '';
          bValue = b.fullName || '';
        } else if (sortConfig.key === 'joiningDate' || sortConfig.key === 'visaExpDate' || sortConfig.key === 'passportExp') {
          aValue = a[sortConfig.key] ? new Date(a[sortConfig.key]).getTime() : 0;
          bValue = b[sortConfig.key] ? new Date(b[sortConfig.key]).getTime() : 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [reportData, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getReportColumns = (): { key: string; label: string; width?: string }[] => {
    switch(reportType) {
      case 'expiring':
        return [
          { key: 'fullName', label: 'Employee Name', width: '200px' },
          { key: 'department', label: 'Department', width: '150px' },
          { key: 'designation', label: 'Designation', width: '150px' },
          { key: 'passportNo', label: 'Passport No', width: '150px' },
          { key: 'passportExp', label: 'Passport Expiry', width: '120px' },
          { key: 'visaStatus', label: 'Visa Status', width: '100px' },
          { key: 'visaExpDate', label: 'Visa Expiry', width: '120px' },
          { key: 'daysToExpiry', label: 'Days Left', width: '100px' }
        ];
      case 'appraisal':
        return [
          { key: 'fullName', label: 'Employee', width: '180px' },
          { key: 'department', label: 'Department', width: '150px' },
          { key: 'designation', label: 'Designation', width: '150px' },
          { key: 'appraisalPeriod', label: 'Appraisal Period', width: '200px' },
          { key: 'kpiAbsences', label: 'Absences', width: '100px' },
          { key: 'kpiWarnings', label: 'Warnings', width: '100px' },
          { key: 'score', label: 'Score (%)', width: '100px' },
          { key: 'notes', label: 'Manager Notes', width: '250px' }
        ];
      default: // all, active, department
        return [
          { key: 'staffId', label: 'Staff ID', width: '120px' },
          { key: 'fullName', label: 'Employee Name', width: '200px' },
          { key: 'department', label: 'Department', width: '150px' },
          { key: 'designation', label: 'Designation', width: '150px' },
          { key: 'email', label: 'Email', width: '200px' },
          { key: 'phone', label: 'Phone', width: '120px' },
          { key: 'joiningDate', label: 'Join Date', width: '120px' },
          { key: 'workStatus', label: 'Status', width: '100px' }
        ];
    }
  };

  const formatCellValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return '—';
    
    // Format dates
    if (key.includes('Date') || key === 'joiningDate' || key === 'visaExpDate' || key === 'passportExp') {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return value;
      }
    }
    
    // Format currency
    if (key.includes('Amount') || key.includes('Salary')) {
      return `AED ${Number(value).toLocaleString()}`;
    }
    
    // Format days to expiry with color
    if (key === 'daysToExpiry') {
      const days = Number(value);
      if (days <= 30) return `${days} days (⚠️ Urgent)`;
      if (days <= 60) return `${days} days (⚠️ Soon)`;
      return `${days} days`;
    }
    
    return String(value);
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'probation': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;
    
    const columns = getReportColumns();
    const headers = columns.map(col => col.label).join(',');
    
    const rows = reportData.map(row => {
      return columns.map(col => {
        const value = row[col.key];
        const formatted = formatCellValue(col.key, value);
        return formatted.includes(',') ? `"${formatted}"` : formatted;
      }).join(',');
    }).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (reportData.length === 0) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }
    
    const columns = getReportColumns();
    const reportTitleText = {
      all: "All Employees Report",
      active: "Active Employees Report",
      department: `${filters.department || 'Department'} Employees Report`,
      expiring: `Documents Expiring in ${filters.expiryDays} Days`,
      appraisal: `Performance Appraisals (${filters.startDate} to ${filters.endDate})`
    }[reportType];
    
    // Generate table rows HTML
    const tableRows = sortedReportData.map(row => {
      return `<tr>
        ${columns.map(col => {
          let value = row[col.key];
          if (col.key === 'workStatus') {
            return `<td>${value || '—'}</td>`;
          } else if (col.key === 'daysToExpiry') {
            return `<td>${value} days</td>`;
          } else {
            return `<td>${formatCellValue(col.key, value)}</td>`;
          }
        }).join('')}
      </tr>`;
    }).join('');
    
    // Generate column headers HTML
    const columnHeaders = columns.map(col => `<th>${col.label}</th>`).join('');
    
    // Write to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitleText}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #4f46e5;
          }
          h1 {
            color: #4f46e5;
            margin: 0 0 5px 0;
            font-size: 24px;
          }
          .subtitle {
            color: #666;
            font-size: 14px;
            margin: 0;
          }
          .report-info {
            margin: 15px 0;
            padding: 10px;
            background: #f3f4f6;
            border-radius: 5px;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th {
            background: #4f46e5;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
          @media print {
            body { margin: 0.5in; }
            th { background: #4f46e5 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>YesPeople HRIS - ${reportTitleText}</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        <div class="report-info">
          <strong>Total Records:</strong> ${reportData.length} | 
          <strong>Report Type:</strong> ${reportType} |
          <strong>Generated By:</strong> ${localStorage.getItem('yespeople_current_user') ? JSON.parse(localStorage.getItem('yespeople_current_user') || '{}').username : 'User'}
        </div>
        
        <table>
          <thead>
            <tr>${columnHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">
          YesPeople HRIS - Confidential Report - ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    if (reportData.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const columns = getReportColumns();
      const reportTitleText = {
        all: "All Employees Report",
        active: "Active Employees Report",
        department: `${filters.department || 'Department'} Employees Report`,
        expiring: `Documents Expiring in ${filters.expiryDays} Days`,
        appraisal: `Performance Appraisals (${filters.startDate} to ${filters.endDate})`
      }[reportType];
      
      // Create a container for PDF content
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #4f46e5;">
            <h1 style="color: #4f46e5; margin: 0 0 5px 0;">YesPeople HRIS - ${reportTitleText}</h1>
            <p style="color: #666; font-size: 14px; margin: 0;">
              Generated on ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          
          <div style="margin: 15px 0; padding: 10px; background: #f3f4f6; border-radius: 5px; font-size: 13px;">
            <strong>Total Records:</strong> ${reportData.length} | 
            <strong>Report Type:</strong> ${reportType}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
            <thead>
              <tr>
                ${columns.map(col => `<th style="background: #4f46e5; color: white; padding: 10px; text-align: left; font-weight: 600;">${col.label}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sortedReportData.map(row => `
                <tr>
                  ${columns.map(col => {
                    let value = row[col.key];
                    return `<td style="padding: 8px 10px; border-bottom: 1px solid #e5e7eb;">${formatCellValue(col.key, value)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #666; text-align: center;">
            YesPeople HRIS - Confidential Report - ${new Date().toLocaleDateString()}
          </div>
        </div>
      `;
      
      // Fix: Use proper typing for all options
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 }, // Use 'as const' for literal type
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'landscape' as const } // Use 'as const' for literal types
      };
      
      // Generate PDF
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const reportTitle = {
    all: "All Employees Report",
    active: "Active Employees Report",
    department: `${filters.department || 'Department'} Employees Report`,
    expiring: `Documents Expiring in ${filters.expiryDays} Days`,
    appraisal: `Performance Appraisals (${filters.startDate} to ${filters.endDate})`
  }[reportType];

  const reportIcon = {
    all: <UserGroupIcon className="h-6 w-6 text-blue-500" />,
    active: <UserGroupIcon className="h-6 w-6 text-green-500" />,
    department: <BuildingOffice2Icon className="h-6 w-6 text-purple-500" />,
    expiring: <CalendarDaysIcon className="h-6 w-6 text-orange-500" />,
    appraisal: <DocumentTextIcon className="h-6 w-6 text-indigo-500" />
  }[reportType];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-600">Generate and export custom reports</p>
          </div>
        </div>
      </div>

      {/* Report Generator Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-1">
              <Select 
                label="Report Type" 
                id="reportType" 
                name="reportType" 
                value={reportType} 
                onChange={e => {
                  setReportType(e.target.value as ReportType);
                  if (e.target.value !== 'department') {
                    setFilters(prev => ({ ...prev, department: '' }));
                  }
                }}
              >
                <option value="all">All Employees</option>
                <option value="active">Active Employees</option>
                <option value="department">By Department</option>
                <option value="expiring">Expiring Documents</option>
                <option value="appraisal">Performance Appraisals</option>
              </Select>
            </div>
            
            {reportType === 'department' && (
              <div className="md:col-span-1">
                <Select 
                  label="Department" 
                  id="department" 
                  name="department" 
                  value={filters.department} 
                  onChange={handleFilterChange}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
            )}

            {reportType === 'expiring' && (
              <div className="md:col-span-1">
                <Select 
                  label="Expiring Within" 
                  id="expiryDays" 
                  name="expiryDays" 
                  value={filters.expiryDays} 
                  onChange={handleFilterChange}
                >
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </Select>
              </div>
            )}

            {reportType === 'appraisal' && (
              <>
                <div className="md:col-span-1">
                  <Input 
                    label="Start Date" 
                    id="startDate" 
                    name="startDate" 
                    type="date" 
                    value={filters.startDate} 
                    onChange={handleFilterChange} 
                  />
                </div>
                <div className="md:col-span-1">
                  <Input 
                    label="End Date" 
                    id="endDate" 
                    name="endDate" 
                    type="date" 
                    value={filters.endDate} 
                    onChange={handleFilterChange} 
                  />
                </div>
              </>
            )}

            <div className="md:col-span-1 flex gap-2">
              <Button 
                onClick={handleGenerateReport} 
                disabled={isGenerating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Results Card */}
      {reportData.length > 0 && (
        <Card>
          <div className="p-6">
            {/* Report Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  {reportIcon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{reportTitle}</h2>
                  <p className="text-sm text-gray-500">
                    Showing {reportData.length} record{reportData.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  CSV
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {isExporting ? 'Generating PDF...' : 'Download PDF'}
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl" ref={reportRef}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {getReportColumns().map(col => (
                      <th 
                        key={col.key} 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        style={{ width: col.width }}
                        onClick={() => requestSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {sortConfig?.key === col.key && (
                            sortConfig.direction === 'ascending' 
                              ? <ChevronUpIcon className="h-4 w-4" /> 
                              : <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedReportData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50 transition-colors">
                      {getReportColumns().map(col => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                          {col.key === 'workStatus' ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row[col.key])}`}>
                              {row[col.key] || '—'}
                            </span>
                          ) : col.key === 'daysToExpiry' ? (
                            <span className={`font-medium ${
                              row[col.key] <= 30 ? 'text-red-600' : 
                              row[col.key] <= 60 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {row[col.key]} days
                            </span>
                          ) : (
                            formatCellValue(col.key, row[col.key])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <div>
                Generated on {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div>
                Total Records: <span className="font-semibold text-gray-900">{reportData.length}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No Data State */}
      {reportData.length === 0 && !isGenerating && (
        <Card>
          <div className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <DocumentTextIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Generated</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Select your filters and click "Generate Report" to view data
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;