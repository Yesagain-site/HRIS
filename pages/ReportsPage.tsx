

import React, { useState, useMemo } from 'react';
import { Card, Button, Select, Input } from '../components/UI';
// FIX: Changed import to be a named import as useHRData is not a default export.
import { useHRData } from '../hooks/useHRData';
import { Employee, PerformanceAppraisal, WorkStatus } from '../types';
import { ChevronUpIcon, ChevronDownIcon, PrinterIcon } from '../components/Icons';

type ReportType = 'all' | 'active' | 'department' | 'expiring' | 'appraisal';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
} | null;

const ReportsPage: React.FC = () => {
  const { employees, attendanceRecords } = useHRData();
  
  const [reportType, setReportType] = useState<ReportType>('all');
  const [filters, setFilters] = useState({
    department: '',
    expiryDays: '90',
    startDate: '',
    endDate: '',
  });
  const [reportData, setReportData] = useState<any[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department))], [employees]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerateReport = () => {
    let data: any[] = [];
    const today = new Date();

    switch (reportType) {
      case 'all':
        data = employees;
        break;
      case 'active':
        data = employees.filter(e => e.workStatus === WorkStatus.ACTIVE);
        break;
      case 'department':
        data = employees.filter(e => e.department === filters.department);
        break;
      case 'expiring':
        const expiryLimit = new Date();
        expiryLimit.setDate(today.getDate() + parseInt(filters.expiryDays, 10));
        data = employees.filter(e => {
          const visaExp = e.visaExpDate ? new Date(e.visaExpDate) : null;
          const passportExp = e.passportExp ? new Date(e.passportExp) : null;
          return (visaExp && visaExp > today && visaExp <= expiryLimit) || 
                 (passportExp && passportExp > today && passportExp <= expiryLimit);
        });
        break;
      case 'appraisal':
        if (!filters.startDate || !filters.endDate) {
          alert("Please select a valid date range for appraisal reports.");
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
                    new Date(r.date) >= appraisalStart && new Date(r.date) <= appraisalEnd
                ).length;
                const warnings = (emp.warningLetters || []).filter(w =>
                    new Date(w.date) >= appraisalStart && new Date(w.date) <= appraisalEnd
                ).length;

                data.push({
                  ...emp,
                  appraisalPeriod: periodKey.replace('_', ' to '),
                  ...(appraisal as PerformanceAppraisal),
                  kpiAbsences: absences,
                  kpiWarnings: warnings,
                });
              }
            });
          }
        });
        break;
    }
    setReportData(data);
    setSortConfig(null); // Reset sort on new report
  };

  const sortedReportData = useMemo(() => {
    let sortableData = [...reportData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
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
  
  const getReportColumns = (): { key: string; label: string }[] => {
    switch(reportType) {
        case 'expiring':
            return [
                { key: 'name', label: 'Name' }, { key: 'department', label: 'Department' },
                { key: 'passportNo', label: 'Passport No' }, { key: 'passportExp', label: 'Passport Expiry' },
                { key: 'visaNo', label: 'Visa No' }, { key: 'visaExpDate', label: 'Visa Expiry' }
            ];
        case 'appraisal':
            return [
                { key: 'name', label: 'Employee' }, { key: 'appraisalPeriod', label: 'Appraisal Period' },
                { key: 'kpiAbsences', label: 'Absences' }, { key: 'kpiWarnings', label: 'Warnings' },
                { key: 'managerEvaluation', label: 'Score (%)' }, { key: 'attitudeNotes', label: 'Manager Notes' }
            ];
        default: // all, active, department
            return [
                { key: 'staffId', label: 'Staff ID' }, { key: 'name', label: 'Name' },
                { key: 'department', label: 'Department' }, { key: 'designation', label: 'Designation' },
                { key: 'joiningDate', label: 'Joining Date' }, { key: 'workStatus', label: 'Status' }
            ];
    }
  };

  const reportTitle = {
      all: "All Employees",
      active: "Active Employees",
      department: `Employees in ${filters.department || '...'}`,
      expiring: `Documents Expiring in ${filters.expiryDays} Days`,
      appraisal: `Performance Appraisals (${filters.startDate} to ${filters.endDate})`
  }[reportType];

  return (
    <div className="space-y-6">
      <Card title="Report Generator">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Select label="Report Type" id="reportType" name="reportType" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
                <option value="all">All Employees</option>
                <option value="active">Active Employees</option>
                <option value="department">Employees by Department</option>
                <option value="expiring">Expiring Documents</option>
                <option value="appraisal">Performance Appraisals</option>
            </Select>
            
            {reportType === 'department' && (
                <Select label="Department" id="department" name="department" value={filters.department} onChange={handleFilterChange}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
            )}

            {reportType === 'expiring' && (
                <Select label="Expiring Within" id="expiryDays" name="expiryDays" value={filters.expiryDays} onChange={handleFilterChange}>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                </Select>
            )}

            {reportType === 'appraisal' && (
                <>
                    <Input label="Start Date" id="startDate" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
                    <Input label="End Date" id="endDate" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
                </>
            )}

            <div className="md:col-start-4">
                <Button onClick={handleGenerateReport} className="w-full">Generate Report</Button>
            </div>
        </div>
      </Card>

      {reportData.length > 0 && (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{reportTitle}</h2>
                <Button variant="secondary" onClick={() => window.print()}><PrinterIcon className="h-5 w-5 mr-2"/> Print / Export</Button>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {getReportColumns().map(col => (
                                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(col.key)}>
                                    <div className="flex items-center">
                                        <span>{col.label}</span>
                                        {sortConfig?.key === col.key && (
                                            sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedReportData.map((row, index) => (
                            <tr key={row.id || index}>
                                {getReportColumns().map(col => (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String((row as any)[col.key] ?? 'N/A')}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {sortedReportData.length === 0 && <p className="text-center text-gray-500 py-4">No data found for the selected criteria.</p>}
        </Card>
      )}

    </div>
  );
};

export default ReportsPage;