import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, Button, Input, Select, Textarea } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { Employee, PerformanceAppraisal } from '../types';
import { UserCircleIcon, CheckIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

// --- Helper Functions ---
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const isDateInRange = (dateStr: string, start: string, end: string) => {
    const date = new Date(dateStr);
    return date >= new Date(start) && date <= new Date(end);
};

// --- Employee View Component (NEW) ---
const EmployeeAppraisalView: React.FC = () => {
    const { employeeDetails } = useAuth();
    const { employees, attendanceRecords } = useHRData();
    const [searchParams] = useSearchParams();
    
    const period = useMemo(() => ({
        start: searchParams.get('start') || formatDate(new Date(new Date().setMonth(new Date().getMonth() - 3))),
        end: searchParams.get('end') || formatDate(new Date()),
    }), [searchParams]);

    const employee = useMemo(() => 
        employees.find(e => e.id === employeeDetails?.id), 
        [employees, employeeDetails]
    );

    const kpis = useMemo(() => {
        if (!employee) return { absences: 0, warnings: 0 };
        
        const absences = attendanceRecords.filter(r => 
            r.employeeId === employee.id && 
            r.status === 'Absent' &&
            isDateInRange(r.date, period.start, period.end)
        ).length;

        const warnings = (employee.warningLetters || []).filter((w: any) => 
            isDateInRange(w.date, period.start, period.end)
        ).length;

        return { absences, warnings };
    }, [employee, attendanceRecords, period]);

    const appraisal = useMemo(() => {
        const periodKey = `${period.start}_${period.end}`;
        return employee?.appraisals?.[periodKey] || { managerEvaluation: 0, attitudeNotes: '' };
    }, [employee, period]);

    if (!employee) {
        return <Card><p className="text-center p-4">Employee not found.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="p-4">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">My Performance Appraisal</h1>
                    <p className="text-md text-gray-500">
                        Period: <span className="font-semibold">{period.start}</span> to <span className="font-semibold">{period.end}</span>
                    </p>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Key Performance Indicators" className="lg:col-span-1">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">Number of Absences</span>
                            <span className="text-2xl font-bold text-red-600">{kpis.absences}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">Warning Letters</span>
                            <span className="text-2xl font-bold text-orange-500">{kpis.warnings}</span>
                        </div>
                    </div>
                </Card>

                <Card title="Manager's Evaluation" className="lg:col-span-2">
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium text-gray-700 mb-2">Evaluation Score</p>
                            <p className="text-3xl font-bold text-indigo-600">{appraisal.managerEvaluation}%</p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-md">
                            <p className="text-sm font-medium text-gray-700 mb-2">Attitude & Conduct Notes</p>
                            <p className="text-gray-800 whitespace-pre-wrap">
                                {appraisal.attitudeNotes || 'No notes available.'}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Admin/Manager View Component (Existing but modified) ---
const AdminAppraisalList: React.FC = () => {
    const { employees } = useHRData();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageAppraisals');

    const [filters, setFilters] = useState({
        department: '',
        startDate: formatDate(new Date(new Date().setMonth(new Date().getMonth() - 3))),
        endDate: formatDate(new Date()),
    });

    const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);
    
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => filters.department ? emp.department === filters.department : true);
    }, [employees, filters.department]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRowClick = (employeeId: string) => {
        navigate(`/admin/appraisals/${employeeId}?start=${filters.startDate}&end=${filters.endDate}`);
    };

    if (!canManage) {
        return (
            <Card>
                <div className="p-6 text-center">
                    <p className="text-gray-500">You don't have permission to manage appraisals.</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Select label="Filter by Department" name="department" value={filters.department} onChange={handleFilterChange}>
                        <option value="">All Departments</option>
                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </Select>
                    <Input label="Period Start" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} />
                    <Input label="Period End" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} />
                </div>
            </Card>

            <Card title="Select an Employee to Appraise">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleRowClick(emp.id)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.staffId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{emp.firstName} {emp.lastName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.department}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.designation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// --- Admin Detail View (Existing but with path fix) ---
const AdminAppraisalDetailView: React.FC = () => {
    const { employeeId } = useParams<{ employeeId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { employees, attendanceRecords, saveAppraisal } = useHRData();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageAppraisals');

    const period = useMemo(() => ({
        start: searchParams.get('start') || formatDate(new Date()),
        end: searchParams.get('end') || formatDate(new Date()),
    }), [searchParams]);

    const employee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
    
    const [evaluation, setEvaluation] = useState<PerformanceAppraisal>({ managerEvaluation: 0, attitudeNotes: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const periodKey = `${period.start}_${period.end}`;

    useEffect(() => {
        if (employee?.appraisals?.[periodKey]) {
            setEvaluation(employee.appraisals[periodKey]);
        } else {
            setEvaluation({ managerEvaluation: 0, attitudeNotes: '' });
        }
    }, [employee, periodKey]);

    const kpis = useMemo(() => {
        if (!employee) return { absences: 0, warnings: 0 };
        
        const absences = attendanceRecords.filter(r => 
            r.employeeId === employee.id && 
            r.status === 'Absent' &&
            isDateInRange(r.date, period.start, period.end)
        ).length;

        const warnings = (employee.warningLetters || []).filter((w: any) => 
            isDateInRange(w.date, period.start, period.end)
        ).length;

        return { absences, warnings };
    }, [employee, attendanceRecords, period]);

    const handleSave = () => {
        if (employeeId && canManage) {
            setIsSaving(true);
            setSaveSuccess(false);
            setTimeout(() => {
                saveAppraisal(employeeId, periodKey, evaluation);
                setIsSaving(false);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }, 500);
        }
    };

    if (!employee) {
        return <Card><p className="text-red-500 text-center p-4">Employee not found.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <div>
                <Button variant="secondary" onClick={() => navigate('/admin/appraisals')}>
                    &larr; Back to Appraisal List
                </Button>
            </div>

            <Card>
                <div className="p-4 flex flex-col md:flex-row items-center gap-6">
                     <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 ring-4 ring-white shadow-md">
                        {employee.photoUrl ? (
                            <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" />
                        ) : (
                            <UserCircleIcon className="h-full w-full text-gray-400"/>
                        )}
                    </div>
                    <div className="flex-grow text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-800">{employee.firstName} {employee.lastName}</h1>
                        <p className="text-md text-gray-500">{employee.designation} - {employee.department}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            Period: <span className="font-semibold">{period.start}</span> to <span className="font-semibold">{period.end}</span>
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="KPIs" className="lg:col-span-1">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">Absences</span>
                            <span className="text-2xl font-bold text-red-600">{kpis.absences}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">Warnings</span>
                            <span className="text-2xl font-bold text-orange-500">{kpis.warnings}</span>
                        </div>
                    </div>
                </Card>

                <Card title="Manager's Evaluation" className="lg:col-span-2">
                    <div className="space-y-4">
                        <Input 
                            label="Evaluation (%)"
                            type="number"
                            min="0"
                            max="100"
                            value={evaluation.managerEvaluation}
                            onChange={e => setEvaluation(prev => ({...prev, managerEvaluation: parseInt(e.target.value, 10) || 0}))}
                            disabled={!canManage}
                        />
                        <Textarea
                            label="Notes"
                            rows={5}
                            value={evaluation.attitudeNotes}
                            onChange={e => setEvaluation(prev => ({...prev, attitudeNotes: e.target.value}))}
                            disabled={!canManage}
                        />
                         {canManage && (
                             <div className="flex justify-end items-center gap-4">
                                {saveSuccess && (
                                    <span className="flex items-center text-green-600 text-sm">
                                        <CheckIcon className="h-5 w-5 mr-1" />
                                        Saved!
                                    </span>
                                )}
                                <Button onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Appraisal'}
                                </Button>
                            </div>
                         )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- Main Page Component with Role-Based Routing ---
const PerformanceAppraisalPage: React.FC = () => {
    const { isAdmin, isManager, isEmployee, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const canView = hasPermission('canViewAppraisals');

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!loading && !canView && !isAdmin && !isManager) {
            navigate('/employee/dashboard');
        }
    }, [canView, loading, isAdmin, isManager, navigate]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // For employees - show only their own appraisal
    if (isEmployee) {
        return (
            <Routes>
                <Route path="/" element={<EmployeeAppraisalView />} />
                <Route path="/:employeeId" element={<EmployeeAppraisalView />} />
            </Routes>
        );
    }

    // For admins/managers - show full management interface
    if (isAdmin || isManager) {
        return (
            <Routes>
                <Route path="/" element={<AdminAppraisalList />} />
                <Route path="/:employeeId" element={<AdminAppraisalDetailView />} />
            </Routes>
        );
    }

    return null;
};

export default PerformanceAppraisalPage;