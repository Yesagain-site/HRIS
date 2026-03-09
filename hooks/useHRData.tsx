// hooks/useHRData.tsx - Complete HR Data Hook with Service Requests Integration
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from 'react';
import { api } from '../services/api';
import { 
    CreateAttendanceDto, 
    SalaryRecord,
    AttendanceRecord,
    Employee,
    Role,
    User as UserAccount,
    ServiceRequest,
    RequestStatus
} from '../types';

// Enums
export enum WorkStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
    PROBATION = 'Probation',
    TERMINATED = 'Terminated',
}

export enum RoleType {
    SUPER_ADMIN = 'Super Admin',
    HR_ADMIN = 'HR Admin',
    MANAGER = 'Manager',
    EMPLOYEE = 'Employee',
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    LATE = 'Late',
    EXCUSED = 'Excused',
}

export enum LeaveStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
}

export enum CashAdvanceStatus {
    REQUESTED = 'Requested',
    APPROVED = 'Approved',
    REPAID = 'Repaid',
}

export enum ResignationStatus {
    SUBMITTED = 'Submitted',
    UNDER_REVIEW = 'Under Review',
    ACCEPTED = 'Accepted',
    REJECTED = 'Rejected',
}

export enum TrainingStatus {
    PLANNED = 'Planned',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
}

export enum EnrollmentStatus {
    ENROLLED = 'Enrolled',
    COMPLETED = 'Completed',
    DROPPED = 'Dropped',
}

export type Gender = 'Male' | 'Female' | 'Other';
export type AttendanceCheckInMethod = 'Manual' | 'GeoLocation' | 'Remote';

// Interfaces
export interface SystemSettings {
    companyName: string;
    logoUrl?: string;
    timezone: string;
    workWeekStart: number;
    defaultWorkHoursPerDay: number;
    overtimeRate: number;
    leaveApprovalWorkflow: string;
    payrollCycle: 'Monthly' | 'Bi-Weekly' | 'Weekly';
    uiSettings?: {
        themeColor: string;
        themeMode: string;
        navStyle: string;
    };
}

export interface SalaryAllowance {
    id: string;
    type: string;
    amount: number;
    isPercentage: boolean;
}

export interface SalaryDeduction {
    id: string;
    type: string;
    amount: number;
    isPercentage: boolean;
}

export interface EmploymentAuditTrailEntry {
    date: string;
    action: string;
    performedBy: string;
}

export interface TaskComment {
    id: string;
    authorId: string;
    authorName: string;
    comment: string;
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    createdById: string;
    createdByName: string;
    assignedToId: string;
    assignedToName?: string;
    status: 'Not Started' | 'In Progress' | 'On Hold' | 'Completed';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    dueDate?: string;
    relatedEmployeeId?: string;
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
    comments?: TaskComment[];
}

export interface LeaveRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
    status: LeaveStatus;
    approverId?: string;
    approverName?: string;
    approvalDate?: string;
    createdAt: string;
}

export interface PermissionRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    type: 'Late Arrival' | 'Early Leave' | 'Permission';
    date: string;
    fromTime?: string;
    toTime?: string;
    reason?: string;
    status: LeaveStatus;
    approverId?: string;
    approverName?: string;
    approvalDate?: string;
    createdAt: string;
}

export interface CashAdvanceRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    requestDate: string;
    amount: number;
    reason?: string;
    status: CashAdvanceStatus;
    approvalDate?: string;
    approverId?: string;
    approverName?: string;
    repaymentStartDate?: string;
    repaymentInstallments?: number;
}

export interface ResignationRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    submissionDate: string;
    lastWorkingDate: string;
    reason?: string;
    status: ResignationStatus;
    approverId?: string;
    approverName?: string;
    approvalDate?: string;
    exitInterviewCompleted?: boolean;
    notes?: string;
}

export interface PerformanceGoal {
    id: string;
    title: string;
    description: string;
    weight: number;
    employeeScore?: number;
    managerScore?: number;
    finalScore?: number;
}

export interface PerformanceAppraisal {
    id: string;
    employeeId: string;
    employeeName: string;
    period: string;
    goals: PerformanceGoal[];
    overallScore?: number;
    status: 'Draft' | 'Submitted' | 'Manager Review' | 'Finalized';
    employeeComments?: string;
    managerComments?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface TrainingProgram {
    id: string;
    name: string;
    description?: string;
    category?: string;
    durationHours?: number;
    provider?: string;
    status: TrainingStatus;
}

export interface TrainingSession {
    id: string;
    programId: string;
    title: string;
    trainerName?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    maxParticipants?: number;
    status: TrainingStatus;
}

export interface TrainingEnrollment {
    id: string;
    sessionId: string;
    programId: string;
    employeeId: string;
    employeeName: string;
    enrollmentDate: string;
    status: EnrollmentStatus;
    completionDate?: string;
    score?: number;
    feedback?: string;
}

export interface PolicyDocument {
    id: string;
    title: string;
    category?: string;
    description?: string;
    effectiveDate: string;
    version: string;
    lastUpdated?: string;
    fileUrl?: string;
    isActive: boolean;
}

export interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
    isDefault?: boolean;
}

export interface EmployeeShiftAssignment {
    id: string;
    employeeId: string;
    shiftId: string;
    date: string;
}

export interface PublicHoliday {
    id: string;
    name: string;
    date: string;
    country?: string;
    isRecurring?: boolean;
}

export interface ChatbotUsageContext {
    id: string;
    userId: string;
    userRole: string;
    intent: string;
    entities: string[];
    timestamp: string;
    usedInModule: string;
    success: boolean;
}

export interface Payslip {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    baseSalary: number;
    allowances: SalaryAllowance[];
    totalEarnings: number;
    deductions: SalaryDeduction[];
    totalDeductions: number;
    netSalary: number;
}

// Global cache to prevent multiple API calls
let globalEmployees: Employee[] = [];
let globalAttendanceRecords: AttendanceRecord[] = [];
let isDataLoaded = false;
let isLoading = false;
let loadingPromise: Promise<void> | null = null;

// Main Context Type
export interface HRDataContextType {
    users: UserAccount[];
    roles: Role[];
    employees: Employee[];
    systemSettings: SystemSettings;
    attendanceRecords: AttendanceRecord[];
    serviceRequests: ServiceRequest[];
    tasks: Task[];
    leaveRequests: LeaveRequest[];
    permissionRequests: PermissionRequest[];
    cashAdvanceRequests: CashAdvanceRequest[];
    resignationRequests: ResignationRequest[];
    trainingPrograms: TrainingProgram[];
    trainingSessions: TrainingSession[];
    enrollments: TrainingEnrollment[];
    policies: PolicyDocument[];
    shifts: Shift[];
    employeeShifts: EmployeeShiftAssignment[];
    publicHolidays: PublicHoliday[];
    payrollHistory: Payslip[];
    chatbotContext: ChatbotUsageContext[];
    refreshEmployees: () => Promise<void>;
    loadUsers: () => Promise<void>;
    loadRoles: () => Promise<void>;
    loadServiceRequests: () => Promise<void>;
    validateUser: (username: string) => UserAccount | null;
    updateSystemSettings: (settings: Partial<SystemSettings>) => void;
    addEmployee: (employee: Omit<Employee, 'id' | 'auditTrail'>) => void;
    updateEmployee: (id: string, employee: Partial<Employee>) => void;
    deleteEmployee: (id: string) => void;
    updateEmployeeSalary: (employeeId: string, salaryRecord: SalaryRecord) => void;
    getSalaryForPeriod: (employee: Employee, month: number, year: number) => SalaryRecord | null;
    addUser: (account: Omit<UserAccount, 'id' | 'createdAt'>) => void;
    updateUser: (id: string, account: Partial<UserAccount>) => void;
    deleteUser: (id: string) => void;
    addRole: (roleData: Omit<Role, 'id'>, createdByUserId?: string) => Promise<string>;
    updateRole: (id: string, roleData: Partial<Role>, updatedByUserId?: string) => Promise<void>;
    deleteRole: (id: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>) => void;
    updateTask: (id: string, task: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    addLeaveRequest: (request: any) => Promise<any>;
    addPermissionRequest: (request: any) => Promise<any>;
    addCashAdvanceRequest: (request: any) => Promise<any>;
    addResignationRequest: (request: any) => Promise<any>;
    updateRequestStatus: (
        type: 'leave' | 'permission' | 'cash' | 'resignation',
        id: string,
        status: 'Approved' | 'Rejected',
        notes?: string
    ) => Promise<any>;
    generatePayroll: (month: number, year: number) => Promise<Payslip[]>;
    saveAppraisal: (appraisal: PerformanceAppraisal) => void;
    addTrainingProgram: (program: Omit<TrainingProgram, 'id'>) => void;
    updateTrainingProgram: (id: string, program: Partial<TrainingProgram>) => void;
    deleteTrainingProgram: (id: string) => void;
    addTrainingSession: (session: Omit<TrainingSession, 'id'>) => void;
    updateTrainingSession: (id: string, session: Partial<TrainingSession>) => void;
    deleteTrainingSession: (id: string) => void;
    enrollEmployee: (enrollment: Omit<TrainingEnrollment, 'id' | 'enrollmentDate'>) => void;
    unenrollEmployee: (enrollmentId: string) => void;
    updateEnrollment: (id: string, enrollment: Partial<TrainingEnrollment>) => void;
    addPolicy: (policy: Omit<PolicyDocument, 'id' | 'lastUpdated'>) => void;
    updatePolicy: (id: string, policy: Partial<PolicyDocument>) => void;
    deletePolicy: (id: string) => void;
    addRemoteAttendanceRecord: (
        employeeId: string,
        location: { latitude: number; longitude: number }
    ) => { success: boolean; message: string };
    importAttendanceRecords: (records: AttendanceRecord[]) => Promise<void>;
    addShift: (shift: Omit<Shift, 'id'>) => void;
    updateShift: (id: string, shift: Shift) => void;
    deleteShift: (id: string) => void;
    assignShift: (employeeId: string, shiftId: string, date: string) => void;
    addPublicHoliday: (holiday: Omit<PublicHoliday, 'id'>) => void;
    deletePublicHoliday: (id: string) => void;
    getEmployeePayslips: (employeeId: string) => Payslip[];
    clockIn: (employeeId: string, location?: { latitude: number; longitude: number }) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
    clockOut: (employeeId: string) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;
    getTodayAttendanceStatus: (employeeId: string) => Promise<{ hasClockedIn: boolean; hasClockedOut: boolean; record: AttendanceRecord | null }>;
    getEmployeeAttendance: (employeeId: string, filters?: { month?: number; year?: number }) => Promise<AttendanceRecord[]>;
    getMyAttendance: () => AttendanceRecord[];
    getMyPayslips: (employeeId: string) => Payslip[];
    getMyLeaveRequests: (employeeId: string) => LeaveRequest[];
    getMyTasks: (employeeId: string) => Task[];
    getMyTeamMembers: (managerId: string) => Employee[];
    getTeamAttendance: (teamIds: string[]) => AttendanceRecord[];
}

const defaultSystemSettings: SystemSettings = {
    companyName: 'YesPeople HRIS',
    logoUrl: '',
    timezone: 'Asia/Dubai',
    workWeekStart: 0,
    defaultWorkHoursPerDay: 8,
    overtimeRate: 1.5,
    leaveApprovalWorkflow: 'Manager then HR',
    payrollCycle: 'Monthly',
    uiSettings: {
        themeColor: 'indigo',
        themeMode: 'light',
        navStyle: 'default'
    }
};

// Hook implementation
const useHRDataState = (): HRDataContextType => {
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
    const [cashAdvanceRequests, setCashAdvanceRequests] = useState<CashAdvanceRequest[]>([]);
    const [resignationRequests, setResignationRequests] = useState<ResignationRequest[]>([]);
    const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
    const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
    const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
    const [policies, setPolicies] = useState<PolicyDocument[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [employeeShifts, setEmployeeShifts] = useState<EmployeeShiftAssignment[]>([]);
    const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
    const [payrollHistory, setPayrollHistory] = useState<Payslip[]>([]);
    const [chatbotContext, setChatbotContext] = useState<ChatbotUsageContext[]>([]);
    const mountedRef = useRef(true);

    // Load data function with caching
    const loadData = useCallback(async (force = false) => {
        // If force is true, bypass cache completely
        if (force) {
            console.log('🔄 Force loading fresh data...');
            isDataLoaded = false;
        }

        // If already loaded and not forced, use cached data
        if (isDataLoaded && !force) {
            console.log('✅ Using cached data');
            setEmployees(globalEmployees);
            setAttendanceRecords(globalAttendanceRecords);
            return;
        }

        // If already loading, wait for that promise
        if (isLoading && loadingPromise) {
            console.log('⏳ Waiting for existing load...');
            await loadingPromise;
            setEmployees(globalEmployees);
            setAttendanceRecords(globalAttendanceRecords);
            return;
        }

        isLoading = true;
        
        loadingPromise = (async () => {
            try {
            console.log('🔄 Loading data from API...');
            const [employeesData, attendanceData] = await Promise.all([
                api.getEmployees(),
                api.getAllAttendance().catch(() => [])
            ]);
            
            console.log('✅ Employees loaded:', employeesData.length);
            
            // Clean the employee data
            const cleanValue = (value: any) => {
                if (typeof value === 'string' && value.match(/^(null|Null|NULL|Nulll)$/)) {
                return '';
                }
                return value;
            };

            const cleanedEmployees = (employeesData as any[]).map(emp => ({
                ...emp,
                firstName: cleanValue(emp.firstName),
                middleName: cleanValue(emp.middleName),
                lastName: cleanValue(emp.lastName),
                designation: cleanValue(emp.designation),
                department: cleanValue(emp.department),
                nationality: cleanValue(emp.nationality),
                email: cleanValue(emp.email),
                phone: cleanValue(emp.phone),
                address: cleanValue(emp.address),
                remarks: cleanValue(emp.remarks),
            }));
            
            // Cache globally
            globalEmployees = cleanedEmployees as any;
            globalAttendanceRecords = attendanceData || [];
            
            if (mountedRef.current) {
                setEmployees(globalEmployees);
                setAttendanceRecords(globalAttendanceRecords);
            }
            
            isDataLoaded = true;
            
            } catch (error) {
            console.error('❌ Error loading data:', error);
            if (mountedRef.current) {
                setEmployees([]);
                setAttendanceRecords([]);
            }
            isDataLoaded = false;
            } finally {
            isLoading = false;
            loadingPromise = null;
            }
        })();

        await loadingPromise;
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            console.log('🔄 Loading users from API...');
            const usersData = await api.getUsers();
            
            const mappedUsers = (usersData || []).map((u: any) => ({
                id: u.id || u._id,
                username: u.username,
                email: u.email,
                roleId: u.role?._id || u.roleId,
                employeeId: u.employeeId,
                isActive: u.isActive,
                createdAt: u.createdAt,
                lastLogin: u.lastLogin
            }));
            
            if (mountedRef.current) {
                setUsers(mappedUsers);
            }
        } catch (error) {
            console.error('❌ Error loading users:', error);
            if (mountedRef.current) {
                setUsers([]);
            }
        }
    }, []);

    const loadRoles = useCallback(async () => {
        try {
            console.log('🔄 Loading roles from API...');
            const rolesData = await api.getRoles();
            
            const mappedRoles = (rolesData || []).map((r: any) => ({
                id: r.id || r._id,
                name: r.name,
                permissions: r.permissions || [],
                isSystem: r.isSystem || false
            }));
            
            if (mountedRef.current) {
                setRoles(mappedRoles);
            }
        } catch (error) {
            console.error('❌ Error loading roles:', error);
            if (mountedRef.current) {
                setRoles([]);
            }
        }
    }, []);

    const loadServiceRequests = useCallback(async () => {
        try {
            console.log('🔄 Loading service requests from API...');
            
            const data = await api.getServiceRequests();
            
            if (!mountedRef.current) return;
            
            setServiceRequests(data || []);
            
            // Map leave requests with consistent field names
            setLeaveRequests((data || [])
            .filter((r: any) => r.requestType === 'leave')
            .map((r: any) => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeName: r.employeeName || 'Unknown',
                leaveType: r.leaveType || 'Annual',
                startDate: r.startDate || '',
                endDate: r.endDate || '',
                reason: r.reason || '',
                status: r.status || 'Pending',
                managerNotes: r.managerNotes,
                approverId: r.approverId,
                approverName: r.approverName,
                approvalDate: r.approvalDate,
                createdAt: r.createdAt
            })));
            
            // Map permission requests with consistent field names
            setPermissionRequests((data || [])
            .filter((r: any) => r.requestType === 'permission')
            .map((r: any) => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeName: r.employeeName || 'Unknown',
                type: 'Permission',
                date: r.permissionDate || r.date || '',
                permissionDate: r.permissionDate || r.date || '',
                fromTime: r.startTime || '',
                toTime: r.endTime || '',
                startTime: r.startTime || '',
                endTime: r.endTime || '',
                reason: r.reason || '',
                status: r.status || 'Pending',
                managerNotes: r.managerNotes,
                approverId: r.approverId,
                approverName: r.approverName,
                approvalDate: r.approvalDate,
                createdAt: r.createdAt
            })));
            
            // Map cash advance requests with consistent field names
            setCashAdvanceRequests((data || [])
            .filter((r: any) => r.requestType === 'cash')
            .map((r: any) => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeName: r.employeeName || 'Unknown',
                requestDate: r.createdAt || '',
                amount: r.amount || 0,
                reason: r.reason || '',
                status: r.status === 'Approved' ? 'Approved' : 
                        r.status === 'Rejected' ? 'Rejected' : 'Pending',
                managerNotes: r.managerNotes,
                approvalDate: r.approvalDate,
                approverId: r.approverId,
                approverName: r.approverName,
                repaymentDate: r.repaymentDate || r.repaymentStartDate || '',
                repaymentStartDate: r.repaymentDate || r.repaymentStartDate || ''
            })));
            
            // Map resignation requests with consistent field names
            setResignationRequests((data || [])
            .filter((r: any) => r.requestType === 'resignation')
            .map((r: any) => ({
                id: r.id,
                employeeId: r.employeeId,
                employeeName: r.employeeName || 'Unknown',
                submissionDate: r.createdAt || '',
                proposedLastDay: r.proposedLastDay || r.lastWorkingDate || '',
                lastWorkingDate: r.proposedLastDay || r.lastWorkingDate || '',
                reason: r.reason || '',
                status: r.status === 'Approved' ? 'Approved' : 
                        r.status === 'Rejected' ? 'Rejected' : 'Pending',
                managerNotes: r.managerNotes,
                approverId: r.approverId,
                approverName: r.approverName,
                approvalDate: r.approvalDate,
                notes: r.managerNotes
            })));
            
        } catch (error) {
            console.error('❌ Error loading service requests:', error);
            if (mountedRef.current) {
            setServiceRequests([]);
            setLeaveRequests([]);
            setPermissionRequests([]);
            setCashAdvanceRequests([]);
            setResignationRequests([]);
            }
        }
    }, []);
    // const loadServiceRequests = useCallback(async () => {
    //     try {
    //         console.log('🔄 Loading service requests from API...');
            
    //         const data = await api.getServiceRequests();
            
    //         if (!mountedRef.current) return;
            
    //         setServiceRequests(data || []);
            
    //         const leaveReqs = (data || []).filter((r: any) => r.requestType === 'leave');
    //         const permissionReqs = (data || []).filter((r: any) => r.requestType === 'permission');
    //         const cashReqs = (data || []).filter((r: any) => r.requestType === 'cash');
    //         const resignReqs = (data || []).filter((r: any) => r.requestType === 'resignation');
            
    //         setLeaveRequests(leaveReqs.map((r: any) => ({
    //             id: r.id,
    //             employeeId: r.employeeId,
    //             employeeName: r.employeeName,
    //             leaveType: r.leaveType || 'Annual',
    //             startDate: r.startDate || '',
    //             endDate: r.endDate || '',
    //             reason: r.reason,
    //             status: r.status,
    //             approverId: r.approverId,
    //             approverName: r.approverName,
    //             approvalDate: r.approvalDate,
    //             createdAt: r.createdAt
    //         })));
            
    //         setPermissionRequests(permissionReqs.map((r: any) => ({
    //             id: r.id,
    //             employeeId: r.employeeId,
    //             employeeName: r.employeeName,
    //             type: 'Permission',
    //             date: r.permissionDate || '',
    //             fromTime: r.startTime,
    //             toTime: r.endTime,
    //             reason: r.reason,
    //             status: r.status,
    //             approverId: r.approverId,
    //             approverName: r.approverName,
    //             approvalDate: r.approvalDate,
    //             createdAt: r.createdAt
    //         })));
            
    //         setCashAdvanceRequests(cashReqs.map((r: any) => ({
    //             id: r.id,
    //             employeeId: r.employeeId,
    //             employeeName: r.employeeName,
    //             requestDate: r.createdAt,
    //             amount: r.amount || 0,
    //             reason: r.reason,
    //             status: r.status === 'Approved' ? 'Approved' : 
    //                     r.status === 'Rejected' ? 'Rejected' : 'Requested',
    //             approvalDate: r.approvalDate,
    //             approverId: r.approverId,
    //             approverName: r.approverName,
    //             repaymentStartDate: r.repaymentDate
    //         })));
            
    //         setResignationRequests(resignReqs.map((r: any) => ({
    //             id: r.id,
    //             employeeId: r.employeeId,
    //             employeeName: r.employeeName,
    //             submissionDate: r.createdAt,
    //             lastWorkingDate: r.proposedLastDay || '',
    //             reason: r.reason,
    //             status: r.status === 'Approved' ? 'Accepted' :
    //                     r.status === 'Rejected' ? 'Rejected' : 'Submitted',
    //             approverId: r.approverId,
    //             approverName: r.approverName,
    //             approvalDate: r.approvalDate,
    //             notes: r.managerNotes
    //         })));
            
    //     } catch (error) {
    //         console.error('❌ Error loading service requests:', error);
    //         if (mountedRef.current) {
    //             setServiceRequests([]);
    //             setLeaveRequests([]);
    //             setPermissionRequests([]);
    //             setCashAdvanceRequests([]);
    //             setResignationRequests([]);
    //         }
    //     }
    // }, []);

    const refreshEmployees = useCallback(async () => {
        console.log('🔄 Refreshing employees from API...');
        isDataLoaded = false; // Reset cache
        await loadData(true); // Force reload
    }, [loadData]);

    // Employee functions
    const validateUser = (username: string): UserAccount | null => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        return user || null;
    };

    const updateSystemSettings = (settings: Partial<SystemSettings>) => {
        setSystemSettings(prev => ({ ...prev, ...settings }));
    };

    const addEmployee = async (employee: any) => {
        try {
            console.log('Creating employee via NestJS API...');
            
            const employeeData = {
                staffId: employee.staffId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                phone: employee.phone,
                designation: employee.designation || '',
                joiningDate: employee.joiningDate || '',
                department: employee.department || '',
                workStatus: employee.workStatus || 'Active',
                middleName: employee.middleName || '',
                gender: employee.gender || 'Male',
                dob: employee.dob || null,
                nationality: employee.nationality || '',
                maritalStatus: employee.maritalStatus || 'Single',
                address: employee.address || '',
                reportingManagerId: employee.reportingManagerId || '',
                remarks: employee.remarks || '',
                baseSalary: Number(employee.baseSalary) || 0,
                previousSalary: Number(employee.previousSalary) || 0,
                presentGrossSalary: Number(employee.presentGrossSalary) || 0,
                allowances: employee.allowances || [],
                payrollCode: employee.payrollCode || '',
                payFrequency: employee.payFrequency || 'Monthly',
                targetRate: Number(employee.targetRate) || 0,
                bankName: employee.bankName || '',
                iban: employee.iban || '',
                isTaxable: !!employee.isTaxable,
                isOvertimeEligible: !!employee.isOvertimeEligible,
                passportNo: employee.passportNo || '',
                passportExp: employee.passportExp || null,
                visaStatus: employee.visaStatus || 'Active',
                visaStartDate: employee.visaStartDate || null,
                visaExpDate: employee.visaExpDate || null,
                eidNumber: employee.eidNumber || '',
                eidIssueDate: employee.eidIssueDate || null,
                eidExpDate: employee.eidExpDate || null,
                documents: employee.documents || [],
                emergencyContact: employee.emergencyContact || { 
                    name: '', 
                    relationship: '', 
                    phone: '' 
                },
                leaveBalances: employee.leaveBalances || {},
                customFieldValues: employee.customFieldValues || {},
                status: employee.workStatus || 'Active'
            };

            const response = await api.createEmployee(employeeData);
            
            const newEmployee: Employee = {
                ...employee,
                id: response.id || response._id,
                auditTrail: [{
                    date: new Date().toISOString(),
                    action: 'Employee created via API',
                    performedBy: 'system',
                }]
            };

            // Update local state immediately
            setEmployees(prev => [...prev, newEmployee]);
            
            // Update global cache
            globalEmployees = [...globalEmployees, newEmployee];
            
            console.log('✅ Employee created via API with ID:', newEmployee.id);
            return newEmployee.id;
            
        } catch (error) {
            console.error('❌ Error creating employee:', error);
            throw error;
        }
    };

    const updateEmployee = async (id: string, employee: Partial<Employee>) => {
        try {
            console.log('Updating employee via NestJS API...', id);
            
            // Clean the data before sending
            const cleanValue = (value: any) => {
            if (value === 'null' || value === 'Null' || value === 'NULL' || value === 'Nulll') {
                return '';
            }
            return value;
            };

            const cleanedEmployee = {
            ...employee,
            firstName: cleanValue(employee.firstName),
            middleName: cleanValue(employee.middleName),
            lastName: cleanValue(employee.lastName),
            };
            
            console.log('📝 Cleaned update payload:', cleanedEmployee);
            
            const updateData: any = {
            ...cleanedEmployee,
            designation: cleanedEmployee.designation,
            joiningDate: cleanedEmployee.joiningDate,
            };
            
            if (cleanedEmployee.dob) {
            updateData.dob = cleanedEmployee.dob;
            }

            const response = await api.updateEmployee(id, updateData);
            console.log('✅ Update API response:', response);

            const auditEntry = {
            date: new Date().toISOString(),
            action: 'Employee updated via API',
            performedBy: 'system',
            };

            // Update local state immediately
            setEmployees(prev => {
            const updated = prev.map(e =>
                e.id === id ? { 
                ...e, 
                ...cleanedEmployee,
                photoUrl: response?.photoUrl || cleanedEmployee.photoUrl,
                auditTrail: [...(e.auditTrail || []), auditEntry]
                } : e
            );
            
            // IMPORTANT: Update global cache with the new data
            globalEmployees = updated;
            
            return updated;
            });

            console.log('✅ Employee updated via API:', id);
            return response;
        } catch (error) {
            console.error('❌ Error updating employee via API:', error);
            throw error;
        }
    };

    const deleteEmployee = async (id: string) => {
        try {
            console.log('Deleting employee via NestJS API...', id);
            await api.deleteEmployee(id);
            
            // Update local state immediately
            setEmployees(prev => {
                const updated = prev.filter(e => e.id !== id);
                // Update global cache
                globalEmployees = updated;
                return updated;
            });
            
            console.log('✅ Employee deleted via API:', id);
        } catch (error) {
            console.error('❌ Error deleting employee via API:', error);
            throw error;
        }
    };

    const updateEmployeeSalary = (employeeId: string, salaryRecord: SalaryRecord) => {
        setEmployees(prev => {
            const updated = prev.map(emp => {
                if (emp.id !== employeeId) return emp;
                const existingIndex = emp.salaryHistory.findIndex(s => s.id === salaryRecord.id);
                let updatedHistory: SalaryRecord[];
                if (existingIndex >= 0) {
                    updatedHistory = emp.salaryHistory.map(s =>
                        s.id === salaryRecord.id ? salaryRecord : s
                    );
                } else {
                    updatedHistory = [...emp.salaryHistory, salaryRecord];
                }
                return {
                    ...emp,
                    salaryHistory: updatedHistory,
                    currentSalaryId: salaryRecord.id,
                };
            });
            // Update global cache
            globalEmployees = updated;
            return updated;
        });
    };

    const getSalaryForPeriod = useCallback(
        (employee: Employee, month: number, year: number): SalaryRecord | null => {
            if (!employee.salaryHistory || employee.salaryHistory.length === 0) return null;
            const periodEnd = new Date(year, month, 0);
            const applicableSalaries = employee.salaryHistory.filter(s => {
                if (!s.effectiveDate) return false;
                return new Date(s.effectiveDate) <= periodEnd;
            });
            if (applicableSalaries.length === 0) return null;
            return applicableSalaries.reduce((latest, current) => 
                new Date(current.effectiveDate) > new Date(latest.effectiveDate) ? current : latest
            );
        },
        []
    );

    // User/Role functions
    const addUser = async (account: any) => {
        try {
            console.log('Creating user via API...');
            const response = await api.createUser({
                username: account.username,
                password: account.password,
                email: account.email,
                roleId: account.roleId,
                employeeId: account.employeeId,
                isActive: account.isActive
            });
            
            const newUser: UserAccount = {
                id: response.id || response._id,
                username: response.username,
                email: response.email,
                roleId: response.role?._id || response.roleId,
                employeeId: response.employeeId,
                isActive: response.isActive,
                createdAt: response.createdAt
            };
            
            setUsers(prev => [...prev, newUser]);
            return newUser;
        } catch (error) {
            console.error('❌ Error creating user:', error);
            throw error;
        }
    };

    const updateUser = async (id: string, account: any) => {    
        try {
            console.log('Updating user via API...', id);
            
            const updateData: any = {
                username: account.username,
                email: account.email,
                roleId: account.roleId,
                employeeId: account.employeeId,
                isActive: account.isActive
            };
            
            if (account.password) {
                updateData.password = account.password;
            }
            
            const response = await api.updateUser(id, updateData);
            
            setUsers(prev =>
                prev.map(u =>
                    u.id === id ? {
                        ...u,
                        username: response.username,
                        email: response.email,
                        roleId: response.role?._id || response.roleId,
                        employeeId: response.employeeId,
                        isActive: response.isActive
                    } : u
                )
            );
            
            console.log('✅ User updated successfully');
        } catch (error) {
            console.error('❌ Error updating user:', error);
            throw error;
        }
    };

    const deleteUser = async (id: string) => {
        try {
            console.log('Deleting user via API...', id);
            await api.deleteUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            throw error;
        }
    };

    const addRole = async (roleData: any, createdByUserId?: string): Promise<string> => {
        try {
            console.log('Creating role via API...');
            const response = await api.createRole({
                name: roleData.name,
                permissions: roleData.permissions,
                isSystem: false
            });
            
            const newRole: Role = {
                id: response.id || response._id,
                name: response.name,
                permissions: response.permissions || [],
                isSystem: response.isSystem || false
            };
            
            setRoles(prev => [...prev, newRole]);
            return newRole.id;
        } catch (error) {
            console.error('❌ Error creating role:', error);
            throw error;
        }
    };

    const updateRole = async (id: string, roleData: any, updatedByUserId?: string): Promise<void> => {
        try {
            console.log('Updating role via API...', id);
            const response = await api.updateRole(id, {
                name: roleData.name,
                permissions: roleData.permissions
            });
            
            setRoles(prev =>
                prev.map(r =>
                    r.id === id ? {
                        ...r,
                        name: response.name,
                        permissions: response.permissions || []
                    } : r
                )
            );
        } catch (error) {
            console.error('❌ Error updating role:', error);
            throw error;
        }
    };

    const deleteRole = async (id: string): Promise<void> => {
        try {
            console.log('Deleting role via API...', id);
            await api.deleteRole(id);
            setRoles(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('❌ Error deleting role:', error);
            throw error;
        }
    };

    // Service Request functions
    const addLeaveRequest = async (request: any) => {
        try {
            console.log('📤 Creating leave request via API...');
            
            // Ensure leaveType is one of the allowed values
            const leaveType = request.leaveType || 'Annual';
            
            const response = await api.createServiceRequest({
                employeeId: request.employeeId,
                employeeName: request.employeeName,
                requestType: 'leave',
                leaveType: leaveType,  // This should be 'Annual', 'Sick', or 'Emergency'
                startDate: request.startDate,
                endDate: request.endDate,
                reason: request.reason
            });
            
            setServiceRequests(prev => [response, ...prev]);
            await loadServiceRequests();
            
            return response;
        } catch (error) {
            console.error('❌ Error creating leave request:', error);
            throw error;
        }
    };

    const addPermissionRequest = async (request: any) => {
        try {
            console.log('📤 Creating permission request via API...');
            const response = await api.createServiceRequest({
                employeeId: request.employeeId,
                employeeName: request.employeeName,
                requestType: 'permission',
                permissionDate: request.permissionDate,
                startTime: request.startTime,
                endTime: request.endTime,
                reason: request.reason
            });
            
            setServiceRequests(prev => [response, ...prev]);
            await loadServiceRequests();
            
            return response;
        } catch (error) {
            console.error('❌ Error creating permission request:', error);
            throw error;
        }
    };

    const addCashAdvanceRequest = async (request: any) => {
        try {
            console.log('📤 Creating cash advance request via API...');
            const response = await api.createServiceRequest({
                employeeId: request.employeeId,
                employeeName: request.employeeName,
                requestType: 'cash',
                amount: request.amount,
                repaymentDate: request.repaymentDate,
                reason: request.reason
            });
            
            setServiceRequests(prev => [response, ...prev]);
            await loadServiceRequests();
            
            return response;
        } catch (error) {
            console.error('❌ Error creating cash advance request:', error);
            throw error;
        }
    };

    const addResignationRequest = async (request: any) => {
        try {
            console.log('📤 Creating resignation request via API...');
            const response = await api.createServiceRequest({
                employeeId: request.employeeId,
                employeeName: request.employeeName,
                requestType: 'resignation',
                proposedLastDay: request.proposedLastDay,
                reason: request.reason
            });
            
            setServiceRequests(prev => [response, ...prev]);
            await loadServiceRequests();
            
            return response;
        } catch (error) {
            console.error('❌ Error creating resignation request:', error);
            throw error;
        }
    };

    const updateRequestStatus = useCallback(async (
        type: 'leave' | 'permission' | 'cash' | 'resignation',
        id: string,
        status: 'Approved' | 'Rejected',
        notes?: string
    ) => {
        try {
            console.log(`📤 Updating ${type} request ${id} to ${status}`);
            const response = await api.updateServiceRequestStatus(id, status, notes);
            
            // Update local state
            setServiceRequests(prev =>
                prev.map(req => req.id === id ? { ...req, ...response } : req)
            );

             // ✅ NEW: If this is a resignation request that was APPROVED
            if (type === 'resignation' && status === 'Approved') {
                console.log('📝 Resignation approved - updating employee status to Resigned');
                
                // Find the request to get the employeeId
                const request = serviceRequests.find(r => r.id === id);
                
                if (request?.employeeId) {
                    try {
                    // Get the current employee data
                    const employee = employees.find(e => e.id === request.employeeId);
                    
                    if (employee) {
                        // Update employee status to RESIGNED
                        await updateEmployee(request.employeeId, {
                        ...employee,
                        workStatus: 'Resigned',
                        status: 'Resigned'
                        });
                        
                        console.log(`✅ Employee ${request.employeeName} status updated to Resigned`);
                    }
                    } catch (error) {
                    console.error('❌ Failed to update employee status:', error);
                    }
                }
            }
            
            // Refresh from server to be sure
            await loadServiceRequests();
            
            return response;
        } catch (error) {
            console.error(`❌ Error updating ${type} request:`, error);
            throw error;
        }
    }, [loadServiceRequests]);

    // Task functions (local state only)
    const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>) => {
        const id = `task_${Date.now()}`;
        const now = new Date().toISOString();
        const newTask: Task = {
            ...task,
            id,
            createdAt: now,
            updatedAt: now,
            comments: [],  
        };
        setTasks(prev => [...prev, newTask]);
    };

    const updateTask = (id: string, task: Partial<Task>) => {
        const now = new Date().toISOString();
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, ...task, updatedAt: now } : t
            )
        );
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    // Training functions (local state only)
    const addTrainingProgram = (program: Omit<TrainingProgram, 'id'>) => {
        const id = `program_${Date.now()}`;
        const newProgram: TrainingProgram = { ...program, id };
        setTrainingPrograms(prev => [...prev, newProgram]);
    };

    const updateTrainingProgram = (id: string, program: Partial<TrainingProgram>) => {
        setTrainingPrograms(prev =>
            prev.map(p => p.id === id ? { ...p, ...program } : p)
        );
    };

    const deleteTrainingProgram = (id: string) => {
        setTrainingPrograms(prev => prev.filter(p => p.id !== id));
    };

    const addTrainingSession = (session: Omit<TrainingSession, 'id'>) => {
        const id = `session_${Date.now()}`;
        const newSession: TrainingSession = { ...session, id };
        setTrainingSessions(prev => [...prev, newSession]);
    };

    const updateTrainingSession = (id: string, session: Partial<TrainingSession>) => {
        setTrainingSessions(prev =>
            prev.map(s => s.id === id ? { ...s, ...session } : s)
        );  
    };

    const deleteTrainingSession = (id: string) => {
        setTrainingSessions(prev => prev.filter(s => s.id !== id));
    };

    const enrollEmployee = (enrollment: Omit<TrainingEnrollment, 'id' | 'enrollmentDate'>) => {
        const id = `enroll_${Date.now()}`;
        const newEnrollment: TrainingEnrollment = {
            ...enrollment,
            id,
            enrollmentDate: new Date().toISOString(),
            status: EnrollmentStatus.ENROLLED,
        };
        setEnrollments(prev => [...prev, newEnrollment]);
    };

    const unenrollEmployee = (enrollmentId: string) => {
        setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
    };

    const updateEnrollment = (id: string, enrollment: Partial<TrainingEnrollment>) => {
        setEnrollments(prev =>
            prev.map(e => e.id === id ? { ...e, ...enrollment } : e)
        );
    };

    const addPolicy = (policy: Omit<PolicyDocument, 'id' | 'lastUpdated'>) => {
        const id = `policy_${Date.now()}`;
        const newPolicy: PolicyDocument = {
            ...policy,
            id,
            lastUpdated: new Date().toISOString(),
        };
        setPolicies(prev => [...prev, newPolicy]);
    };

    const updatePolicy = (id: string, policy: Partial<PolicyDocument>) => {
        setPolicies(prev =>
            prev.map(p =>
                p.id === id ? { ...p, ...policy, lastUpdated: new Date().toISOString() } : p
            )
        );
    };

    const deletePolicy = (id: string) => {
        setPolicies(prev => prev.filter(p => p.id !== id));
    };

    const addRemoteAttendanceRecord = (
        employeeId: string,
        location: { latitude: number; longitude: number }
    ): { success: boolean; message: string } => {
        console.log('⚠️ addRemoteAttendanceRecord not implemented - needs backend API');
        return { success: false, message: 'Not implemented' };
    };

    // Shift functions (local state only)
    const addShift = (shift: Omit<Shift, 'id'>) => {
        const id = `shift_${Date.now()}`;
        const newShift: Shift = { ...shift, id };
        setShifts(prev => [...prev, newShift]);
    };

    const updateShift = (id: string, shift: Shift) => {
        setShifts(prev =>
            prev.map(s => s.id === id ? { ...s, ...shift } : s)
        );
    };

    const deleteShift = (id: string) => {
        setShifts(prev => prev.filter(s => s.id !== id));
    };

    const assignShift = (employeeId: string, shiftId: string, date: string) => {
        const id = `empShift_${employeeId}_${date}`;
        const newAssignment: EmployeeShiftAssignment = {
            id,
            employeeId,
            shiftId,
            date,
        };
        setEmployeeShifts(prev => [
            ...prev.filter(a => a.id !== id),
            newAssignment,
        ]);
    };

    const addPublicHoliday = (holiday: Omit<PublicHoliday, 'id'>) => {
        const id = `holiday_${Date.now()}`;
        const newHoliday: PublicHoliday = { ...holiday, id };
        setPublicHolidays(prev => [...prev, newHoliday]);
    };

    const deletePublicHoliday = (id: string) => {
        setPublicHolidays(prev => prev.filter(h => h.id !== id));
    };

    const getEmployeePayslips = (employeeId: string): Payslip[] => {
        return payrollHistory.filter(p => p.employeeId === employeeId);
    };

    const importAttendanceRecords = useCallback(async (records: AttendanceRecord[]): Promise<void> => {
        try {
            console.log('📤 Importing attendance records...', records.length);
            const response = await api.importAttendance(records);
            
            setAttendanceRecords(prev => {
                const byId = new Map<string, AttendanceRecord>();
                prev.forEach(r => byId.set(r.id, r));
                (response || []).forEach((r: AttendanceRecord) => {
                    byId.set(r.id, r);
                });
                const updated = Array.from(byId.values());
                // Update global cache
                globalAttendanceRecords = updated;
                return updated;
            });
            
            console.log('✅ Imported', response?.length, 'records');
        } catch (error) {
            console.error('❌ Error importing attendance:', error);
            throw error;
        }
    }, []);

    // Attendance functions
    const clockIn = useCallback(async (
        employeeId: string, 
        location?: { latitude: number; longitude: number }
    ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

            console.log('🕐 Clocking in for employee:', employeeId);
            
            const response = await api.clockIn({
                employeeId,
                date: dateStr,
                inTime: timeStr,
                checkInMethod: location ? 'geofence' : 'mobile',
                checkInLocation: location
            });

            if (response) {
                setAttendanceRecords(prev => {
                    const existingIndex = prev.findIndex(r => r.employeeId === employeeId && r.date === dateStr);
                    let updated;
                    if (existingIndex >= 0) {
                        updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...response };
                    } else {
                        updated = [response, ...prev];
                    }
                    // Update global cache
                    globalAttendanceRecords = updated;
                    return updated;
                });
            }

            return {
                success: true,
                message: `Clocked in successfully at ${timeStr}`,
                record: response
            };
        } catch (error: any) {
            console.error('❌ Clock in error:', error);
            return {
                success: false,
                message: error.message || 'Failed to clock in'
            };
        }
    }, []);

    const clockOut = useCallback(async (
        employeeId: string
    ): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> => {
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
            
            console.log('🕐 Clocking out for employee:', employeeId);
            
            const todayStatus = await getTodayAttendanceStatus(employeeId);
            
            if (!todayStatus.hasClockedIn) {
                return {
                    success: false,
                    message: 'No clock-in record found for today'
                };
            }

            const inTime = todayStatus.record?.inTime;
            if (!inTime) {
                return {
                    success: false,
                    message: 'Invalid clock-in time'
                };
            }

            const [inHours, inMinutes] = inTime.split(':').map(Number);
            const [outHours, outMinutes] = timeStr.split(':').map(Number);
            
            const inDate = new Date();
            inDate.setHours(inHours, inMinutes, 0);
            
            const outDate = new Date();
            outDate.setHours(outHours, outMinutes, 0);
            
            const diffMs = outDate.getTime() - inDate.getTime();
            const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
            const overtimeHours = workHours > 8 ? workHours - 8 : 0;

            const response = await api.clockOut(employeeId, {
                outTime: timeStr,
                workHours,
                overtimeHours
            });

            if (response) {
                setAttendanceRecords(prev => {
                    const existingIndex = prev.findIndex(r => r.employeeId === employeeId && r.date === dateStr);
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...response };
                        // Update global cache
                        globalAttendanceRecords = updated;
                        return updated;
                    }
                    return prev;
                });
            }

            return {
                success: true,
                message: `Clocked out successfully at ${timeStr}. Total hours: ${workHours.toFixed(2)}`,
                record: response
            };
        } catch (error: any) {
            console.error('❌ Clock out error:', error);
            return {
                success: false,
                message: error.message || 'Failed to clock out'
            };
        }
    }, []);

    const getTodayAttendanceStatus = useCallback(async (employeeId: string): Promise<{
        hasClockedIn: boolean;
        hasClockedOut: boolean;
        record: AttendanceRecord | null;
    }> => {
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            
            const localRecord = attendanceRecords.find(
                r => r.employeeId === employeeId && r.date === dateStr
            );

            if (localRecord) {
                return {
                    hasClockedIn: !!localRecord.inTime,
                    hasClockedOut: !!localRecord.outTime,
                    record: localRecord
                };
            }

            const response = await api.getTodayAttendanceStatus(employeeId);
            return {
                hasClockedIn: response.hasClockedIn || false,
                hasClockedOut: response.hasClockedOut || false,
                record: response.record || null
            };
        } catch (error) {
            console.error('❌ Error getting today status:', error);
            return {
                hasClockedIn: false,
                hasClockedOut: false,
                record: null
            };
        }
    }, [attendanceRecords]);

    const getEmployeeAttendance = useCallback(async (
        employeeId: string,
        filters?: { month?: number; year?: number }
    ): Promise<AttendanceRecord[]> => {
        try {
            const records = await api.getEmployeeAttendance(employeeId, filters);
            
            if (records && records.length > 0) {
                setAttendanceRecords(prev => {
                    const newRecords = [...prev];
                    records.forEach((record: AttendanceRecord) => {
                        const index = newRecords.findIndex(r => r.id === record.id);
                        if (index >= 0) {
                            newRecords[index] = record;
                        } else {
                            newRecords.push(record);
                        }
                    });
                    // Update global cache
                    globalAttendanceRecords = newRecords;
                    return newRecords;
                });
            }
            
            return records || [];
        } catch (error) {
            console.error('❌ Error fetching attendance:', error);
            return [];
        }
    }, []);

    const getMyAttendance = useCallback((): AttendanceRecord[] => {
        return attendanceRecords;
    }, [attendanceRecords]);

    const getMyPayslips = useCallback((employeeId: string): Payslip[] => {
        if (!employeeId) return [];
        return payrollHistory.filter(payslip => payslip.employeeId === employeeId);
    }, [payrollHistory]);

    const getMyLeaveRequests = useCallback((employeeId: string): LeaveRequest[] => {
        if (!employeeId) return [];
        return leaveRequests.filter(request => request.employeeId === employeeId);
    }, [leaveRequests]);

    const getMyTasks = useCallback((employeeId: string): Task[] => {
        if (!employeeId) return [];
        return tasks.filter(task => task.assignedToId === employeeId);
    }, [tasks]);

    const getMyTeamMembers = useCallback((managerId: string): Employee[] => {
        if (!managerId) return [];
        return employees.filter(emp => emp.managerId === managerId);
    }, [employees]);

    const getTeamAttendance = useCallback((teamIds: string[]): AttendanceRecord[] => {
        if (!teamIds.length) return [];
        return attendanceRecords.filter(record => teamIds.includes(record.employeeId));
    }, [attendanceRecords]);

    const generatePayroll = async (month: number, year: number): Promise<Payslip[]> => {
        console.log('🔄 Generating payroll for:', month, year);
        alert('Payroll generation is now handled in the Payroll page with Excel upload');
        return [];
    };

    const saveAppraisal = (appraisal: PerformanceAppraisal) => {
        console.log('Saving appraisal', appraisal);
    };

    // Load data on mount
    useEffect(() => {
        mountedRef.current = true;
        console.log('🎯 useHRData initialized - loading data');
        loadData();
        
        return () => {
            mountedRef.current = false;
        };
    }, [loadData]);

    // Return all data and functions
    return {
        users,
        roles,
        employees,
        systemSettings,
        attendanceRecords,
        serviceRequests,
        tasks,
        leaveRequests,
        permissionRequests,
        cashAdvanceRequests,
        resignationRequests,
        trainingPrograms,
        trainingSessions,
        enrollments,
        policies,
        shifts,
        employeeShifts,
        publicHolidays,
        payrollHistory,
        chatbotContext,
        validateUser,
        updateSystemSettings,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        updateEmployeeSalary,
        getSalaryForPeriod,
        addUser,
        updateUser,
        deleteUser,
        addRole,
        updateRole,
        deleteRole,
        refreshEmployees,
        loadUsers,
        loadRoles,
        loadServiceRequests,
        addTask,
        updateTask,
        deleteTask,
        addLeaveRequest,
        addPermissionRequest,
        addCashAdvanceRequest,
        addResignationRequest,
        updateRequestStatus,
        generatePayroll,
        saveAppraisal,
        addTrainingProgram,
        updateTrainingProgram,
        deleteTrainingProgram,
        addTrainingSession,
        updateTrainingSession,
        deleteTrainingSession,
        enrollEmployee,
        unenrollEmployee,
        updateEnrollment,
        addPolicy,
        updatePolicy,
        deletePolicy,
        addRemoteAttendanceRecord,
        importAttendanceRecords,
        addShift,
        updateShift,
        deleteShift,
        assignShift,
        addPublicHoliday,
        deletePublicHoliday,
        getEmployeePayslips,
        clockIn,
        clockOut,
        getTodayAttendanceStatus,
        getEmployeeAttendance,
        getMyAttendance,
        getMyPayslips,
        getMyLeaveRequests,
        getMyTasks,
        getMyTeamMembers,
        getTeamAttendance,
    };
};

// Create context
export const HRDataContext = createContext<HRDataContextType | undefined>(undefined);

// Provider component
export const HRDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const hrData = useHRDataState();
    
    return (
        <HRDataContext.Provider value={hrData}>
            {children}
        </HRDataContext.Provider>
    );
};

// Custom hook to use the context
export const useHRData = () => {
    const context = useContext(HRDataContext);
    if (context === undefined) {
        throw new Error('useHRData must be used within a HRDataProvider');
    }
    return context;
};

export default useHRData;