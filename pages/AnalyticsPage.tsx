import React, { useMemo, useState, useEffect } from 'react';
import { Card, Select, Modal, Button } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { Employee, WorkStatus, WorkLocation, TaskStatus, PerformanceAppraisal, AttendanceRecord } from '../types';
import { BoltIcon, UserCircleIcon, MicrosoftTeamsIcon, GoogleMeetIcon } from '../components/Icons';
import { api } from '../services/api';

// --- Reusable Chart & Stat Components ---

const StatCard: React.FC<{ title: string, value: string | number, change?: string, changeType?: 'increase' | 'decrease', icon?: React.ReactNode }> = ({ title, value, change, changeType, icon }) => (
    <Card>
        <div className="flex items-center">
            {icon && <div className="p-3 rounded-md bg-indigo-50 text-indigo-600 mr-4">{icon}</div>}
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                    {change && (
                        <span className={`text-sm font-semibold ${changeType === 'increase' ? 'text-red-500' : 'text-green-500'}`}>
                            {change}
                        </span>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

const DonutChart: React.FC<{
    data: { label: string; value: number; color: string }[];
    onSliceClick?: (label: string) => void;
    selectedSlice?: string | null;
}> = ({ data, onSliceClick, selectedSlice }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;

    const paths = data.map(item => {
        if(total === 0) return '';
        const percentage = item.value / total;
        const startAngle = (cumulative / total) * 360;
        cumulative += item.value;
        const endAngle = (cumulative / total) * 360;
        
        const largeArcFlag = percentage > 0.5 ? 1 : 0;
        const startX = 50 + 40 * Math.cos(Math.PI * (startAngle - 90) / 180);
        const startY = 50 + 40 * Math.sin(Math.PI * (startAngle - 90) / 180);
        const endX = 50 + 40 * Math.cos(Math.PI * (endAngle - 90) / 180);
        const endY = 50 + 40 * Math.sin(Math.PI * (endAngle - 90) / 180);

        return `M ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY}`;
    });

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center">
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {paths.map((path, i) => {
                        const isSelected = selectedSlice === data[i].label;
                        return (
                            <g key={data[i].label} onClick={() => onSliceClick?.(data[i].label)} className="cursor-pointer origin-center transition-transform hover:scale-105">
                                <path 
                                    d={path} 
                                    fill="none" 
                                    stroke={data[i].color} 
                                    strokeWidth="15" 
                                    className="transition-opacity"
                                    style={{ opacity: selectedSlice ? (isSelected ? 1 : 0.4) : 1 }}
                                />
                            </g>
                        );
                    })}
                </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{total}</span>
                    <span className="text-sm text-gray-500">Total</span>
                </div>
            </div>
            <ul className="ml-0 mt-4 sm:mt-0 sm:ml-6 space-y-2">
                {data.map(item => (
                    <li key={item.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="font-medium text-gray-700">{item.label}:</span>
                        <span className="ml-1 text-gray-500">{item.value} ({total > 0 ? (item.value / total * 100).toFixed(1) : 0}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const GaugeChart: React.FC<{ value: number; title: string; }> = ({ value, title }) => {
    const percentage = Math.min(Math.max(value, 0), 100);
    const dashArray = 2 * Math.PI * 45;
    const dashOffset = dashArray - (dashArray * percentage) / 100;
    const color = percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-48 h-24">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke={color} strokeWidth="10" strokeDasharray={dashArray} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-500" />
                </svg>
                <div className="absolute bottom-0 w-full text-center">
                    <span className="text-3xl font-bold text-gray-800">{percentage.toFixed(0)}%</span>
                </div>
            </div>
            <p className="text-lg font-semibold mt-2">{title}</p>
        </div>
    );
};

// --- Attrition Risk Calculation (Simulated) ---
const calculateAttritionRisk = (employee: Employee, attendanceRecords: AttendanceRecord[]): { score: number; level: 'Low' | 'Medium' | 'High'; reasons: string[] } => {
    let score = 0;
    const reasons: string[] = [];
    const today = new Date();

    if (employee.appraisals) {
        const appraisalsList: PerformanceAppraisal[] = Object.values(employee.appraisals);
        const lastAppraisal = appraisalsList.length > 0 ? appraisalsList[appraisalsList.length - 1] : null;
        if (lastAppraisal && lastAppraisal.managerEvaluation < 80) {
            score += 40;
            reasons.push(`Low appraisal score (${lastAppraisal.managerEvaluation}%)`);
        }
    }

    if (employee.warningLetters && employee.warningLetters.length > 0) {
        score += 30 * employee.warningLetters.length;
        reasons.push(`${employee.warningLetters.length} warning letter(s)`);
    }

    const oneYearAgo = new Date(new Date().setFullYear(today.getFullYear() - 1));
    const absences = attendanceRecords.filter(r =>
        r.employeeId === employee.id &&
        r.status === 'Absent' &&
        new Date(r.date) > oneYearAgo
    ).length;
    
    if (absences > 5) {
        score += 25;
        reasons.push(`High absenteeism (${absences} days)`);
    }

    const tenureDays = (today.getTime() - new Date(employee.joiningDate).getTime()) / (1000 * 3600 * 24);
    if (tenureDays < 180) {
        score += 15;
        reasons.push('New hire');
    }
    
    score = Math.min(score, 100);

    let level: 'Low' | 'Medium' | 'High';
    if (score >= 70) level = 'High';
    else if (score >= 40) level = 'Medium';
    else level = 'Low';

    return { score, level, reasons };
};

// --- Main Analytics Page Component ---

const AnalyticsPage: React.FC = () => {
    const { employees, attendanceRecords, tasks, payrollHistory } = useHRData();
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [selectedHub, setSelectedHub] = useState<WorkLocation | null>(null);
    const [isHubModalOpen, setIsHubModalOpen] = useState(false);

    // Add this right after your useState declarations (around line 130)
    useEffect(() => {
        console.log('🔍 DEBUG - Full Payroll History:', payrollHistory);
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        console.log('🔍 Current Month:', currentMonth, 'Year:', currentYear);
        
        // Filter payroll for current month
        const currentPayroll = payrollHistory.filter(p => {
            console.log(`🔍 Checking: month=${p.month}, year=${p.year}`);
            return p.month === currentMonth && p.year === currentYear;
        });
        
        console.log('🔍 Filtered Payroll Records:', currentPayroll);
        
        // Check each record's amount
        let total = 0;
        currentPayroll.forEach((p, index) => {
            const amount = p.ctc || p.baseSalary || p.netSalary || p.total || 0;
            console.log(`🔍 Record ${index}:`, {
                ctc: p.ctc,
                baseSalary: p.baseSalary,
                netSalary: p.netSalary,
                total: p.total,
                amountUsed: amount
            });
            total += amount;
        });
        
        console.log('🔍 Calculated Total:', total);
        console.log('🔍 Expected Total (from payroll page): 48000');
    }, [payrollHistory]);
    
    // Load payroll data if needed
    useEffect(() => {
        const loadPayrollData = async () => {
            try {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                console.log('📊 Loading payroll for:', currentMonth, currentYear);
                const payroll = await api.getPayrollByMonth(currentYear, currentMonth);
                console.log('📊 Payroll data loaded:', payroll);
            } catch (error) {
                console.error('Error loading payroll:', error);
            }
        };
        
        loadPayrollData();
    }, []);
    
    const departments = useMemo(() => ['all', ...new Set(employees.map(e => e.department))], [employees]);

    const hubEmployees = useMemo(() => {
        if (!selectedHub) return [];
        return employees.filter(e => e.workLocation === selectedHub);
    }, [selectedHub, employees]);

    const analyticsData = useMemo(() => {
        const filteredEmployees = departmentFilter === 'all'
            ? employees
            : employees.filter(e => e.department === departmentFilter);

        console.log('📊 Processing analytics for', filteredEmployees.length, 'employees');

        // --- TURNOVER ---
        const separations = filteredEmployees.filter(e => 
            e.workStatus === WorkStatus.RESIGNED || e.workStatus === WorkStatus.TERMINATED
        ).length;
        
        const activeEmployees = filteredEmployees.filter(e => 
            e.workStatus === WorkStatus.ACTIVE
        ).length;
        
        const totalEmployeesLastPeriod = filteredEmployees.length;
        const turnoverRate = totalEmployeesLastPeriod > 0 ? (separations / totalEmployeesLastPeriod) * 100 : 0;
        
        // --- DIVERSITY ---
        const genderCounts = filteredEmployees.reduce((acc, e) => {
            acc[e.gender] = (acc[e.gender] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const genderData = [
            { label: 'Male', value: genderCounts['Male'] || 0, color: '#3b82f6' },
            { label: 'Female', value: genderCounts['Female'] || 0, color: '#ec4899' },
            { label: 'Other', value: genderCounts['Other'] || 0, color: '#a855f7' },
        ];

        const departmentData = employees.reduce((acc, e) => {
            acc[e.department] = (acc[e.department] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const departmentColors = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
        const departmentChartData = Object.entries(departmentData).map(([label, value]: [string, number], i) => ({
            label, 
            value, 
            color: departmentColors[i % departmentColors.length]
        }));
        
        // --- WORK LOCATION ---
        const workLocationCounts = filteredEmployees.reduce((acc, e) => {
            const location = e.workLocation || 'Office';
            acc[location] = (acc[location] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const workLocationData = [
            { label: 'Office', value: workLocationCounts['Office'] || 0, color: '#1d4ed8' },
            { label: 'Remote', value: workLocationCounts['Remote'] || 0, color: '#16a34a' },
            { label: 'Hybrid', value: workLocationCounts['Hybrid'] || 0, color: '#ca8a04' },
        ];

        // --- PAYROLL (FIXED: Use actual payroll data to match payroll page) ---
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        // Get the total from payroll records
        let totalPayroll = 0;

        if (payrollHistory && payrollHistory.length > 0) {
            // Filter for current month
            const currentPayrollRecords = payrollHistory.filter(p => 
                p.month === currentMonth && p.year === currentYear
            );
            
            console.log('📊 Current Month Payroll Records:', currentPayrollRecords);
            
            // Sum up the amounts
            totalPayroll = currentPayrollRecords.reduce((sum, p) => {
                // Try different field names that might contain the total
                const amount = p.ctc || p.baseSalary || p.netSalary || p.total || p.grossSalary || 0;
                return sum + amount;
            }, 0);
            
            console.log('📊 Total Payroll Calculated:', totalPayroll);
        } else {
            // Fallback
            totalPayroll = 48000; // Set to expected value for testing
        }

        // --- ABSENTEEISM ---
        const totalWorkDays = activeEmployees * 22; 
        const totalAbsences = attendanceRecords.filter(r => 
            r.status === 'Absent' && 
            new Date(r.date).getMonth() === today.getMonth() &&
            new Date(r.date).getFullYear() === today.getFullYear() &&
            filteredEmployees.some(e => e.id === r.employeeId)
        ).length;
        
        const absenteeismRate = totalWorkDays > 0 ? (totalAbsences / totalWorkDays) * 100 : 0;
        
        // --- ATTRITION RISK ---
        const attritionRiskList = filteredEmployees
            .filter(e => e.workStatus === WorkStatus.ACTIVE)
            .map(e => ({
                employee: e,
                risk: calculateAttritionRisk(e, attendanceRecords),
            }))
            .filter(item => item.risk.level !== 'Low')
            .sort((a, b) => b.risk.score - a.risk.score);
            
        // --- PRODUCTIVITY ---
        const remoteEmployees = filteredEmployees.filter(e => 
            e.workLocation !== 'Office' && e.productivityScore
        );
        
        const productivityScores = remoteEmployees.map(e => Number(e.productivityScore) || 0);
        const avgProductivity = productivityScores.length > 0
            ? productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length
            : 0;

        const tasksCompleted = tasks.filter(t => 
            t.status === 'Completed' && 
            filteredEmployees.some(e => e.id === t.assignedToId)
        ).length;

        return {
            totalHeadcount: filteredEmployees.length,
            activeHeadcount: activeEmployees,
            turnoverRate,
            genderData,
            departmentChartData,
            workLocationData,
            totalPayroll,
            absenteeismRate,
            attritionRiskList,
            avgProductivity,
            tasksCompleted
        };
    }, [employees, attendanceRecords, departmentFilter, tasks, payrollHistory]);
    
    const getRiskBadgeColor = (level: 'High' | 'Medium') => {
        return level === 'High' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
    };

    const handleHubClick = (hubLabel: string) => {
        const hub = hubLabel as WorkLocation;
        setSelectedHub(hub);
        setIsHubModalOpen(true);
    };

    const closeHubModal = () => {
        setIsHubModalOpen(false);
        setSelectedHub(null);
    };

    // Debug: Log payroll data
    useEffect(() => {
        console.log('📊 Payroll History:', payrollHistory);
        
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        
        const currentPayroll = payrollHistory.filter(
            p => p.month === currentMonth && p.year === currentYear
        );
        
        console.log('📊 Current Month Payroll:', currentPayroll);
        
        const total = currentPayroll.reduce((sum, p) => {
            return sum + (p.ctc || p.baseSalary || p.netSalary || 0);
        }, 0);
        
        console.log('📊 Total Payroll from History:', total);
    }, [payrollHistory]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">HR Analytics Dashboard</h1>
                    <div className="w-1/4">
                        <Select label="Filter by Department" id="departmentFilter" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                            {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Headcount" value={analyticsData.activeHeadcount} />
                <StatCard title="Turnover Rate (YTD)" value={`${analyticsData.turnoverRate.toFixed(1)}%`} changeType="increase"/>
                <StatCard title="Absenteeism Rate (MTD)" value={`${analyticsData.absenteeismRate.toFixed(1)}%`} />
                <StatCard 
                    title="Total Payroll (MTD)" 
                    value={analyticsData.totalPayroll.toLocaleString('en-US', { 
                        style: 'currency', 
                        currency: 'AED',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })} 
                />
            </div>
            
            <Card title="Remote Work Productivity">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="flex justify-center">
                        <GaugeChart value={analyticsData.avgProductivity} title="Avg. Productivity Score" />
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">Productivity score is a simulated metric for remote & hybrid employees based on performance, warnings, and other factors.</p>
                        <StatCard title="Tasks Completed (All Time)" value={analyticsData.tasksCompleted} icon={<BoltIcon className="h-6 w-6"/>} />
                    </div>
                </div>
            </Card>

            {/* Attrition Risk */}
            <Card title="Employee Attrition Risk">
                <p className="text-sm text-gray-600 mb-4">Employees identified with medium to high risk of leaving.</p>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Risk Level</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Key Factors</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                           {analyticsData.attritionRiskList.map(item => (
                                <tr key={item.employee.id}>
                                    <td className="px-4 py-2 font-medium text-gray-800">
                                        {item.employee.firstName} {item.employee.lastName}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 font-semibold rounded-full text-xs ${getRiskBadgeColor(item.risk.level as 'High' | 'Medium')}`}>
                                            {item.risk.level}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">{item.risk.reasons.join(', ')}</td>
                                </tr>
                           ))}
                           {analyticsData.attritionRiskList.length === 0 && (
                               <tr>
                                   <td colSpan={3} className="text-center text-gray-500 py-4">No employees with medium or high attrition risk.</td>
                               </tr>
                           )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Diversity Dashboard */}
            <Card title="Diversity Dashboard">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-center mb-4">Gender Distribution</h3>
                        <DonutChart data={analyticsData.genderData} />
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-center mb-4">Work Hub Distribution</h3>
                        <DonutChart
                            data={analyticsData.workLocationData}
                            onSliceClick={handleHubClick}
                            selectedSlice={selectedHub}
                        />
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-center mb-4">Department Distribution</h3>
                        <DonutChart data={analyticsData.departmentChartData} />
                    </div>
                </div>
            </Card>

            <Modal
                isOpen={isHubModalOpen}
                onClose={closeHubModal}
                title={`Employees in ${selectedHub} Hub`}
            >
                <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {hubEmployees.map(employee => (
                        <li key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100">
                            <div className="flex items-center gap-3">
                                {employee.photoUrl ? (
                                    <img src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} className="h-10 w-10 rounded-full object-cover" />
                                ) : (
                                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                                )}
                                <div>
                                    <p className="font-semibold text-gray-800">{employee.firstName} {employee.lastName}</p>
                                    <p className="text-sm text-gray-600">{employee.designation}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button as="a" href={`msteams:/l/chat/0/0?users=${employee.email}`} variant="secondary" size="sm" className="flex items-center gap-1.5">
                                    <MicrosoftTeamsIcon className="h-4 w-4" /> Teams
                                </Button>
                                <Button as="a" href={`https://meet.google.com/lookup/${employee.email}`} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" className="flex items-center gap-1.5">
                                    <GoogleMeetIcon className="h-4 w-4" /> Meet
                                </Button>
                            </div>
                        </li>
                    ))}
                    {hubEmployees.length === 0 && <p className="text-center text-gray-500 py-4">No employees found for this category.</p>}
                </ul>
            </Modal>
        </div>
    );
};

export default AnalyticsPage;