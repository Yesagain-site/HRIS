// types.ts - Complete Type Definitions

// --- Enums ---

export enum WorkStatus {
    ACTIVE = 'Active',
    PROBATION = 'Probation',
    ON_LEAVE = 'On Leave',
    UNDER_RESIGNATION = 'Under Resignation',
    RESIGNED = 'Resigned',
    TERMINATED = 'Terminated',
    SUSPENDED = 'Suspended',
}

export enum WorkLocation {
    OFFICE = 'Office',
    REMOTE = 'Remote',
    HYBRID = 'Hybrid',
}

export enum TaskStatus {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    DONE = 'Done',
}

export enum RequestStatus {
    PENDING = 'Pending',
    APPROVED = 'Approved',
    REJECTED = 'Rejected',
}

export enum TrainingProgramStatus {
    UPCOMING = 'Upcoming',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
}

export enum EnrollmentStatus {
    ENROLLED = 'Enrolled',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    DROPPED_OUT = 'Dropped Out',
}

export enum PenaltyType {
    VERBAL = 'Verbal Warning',
    WRITTEN = 'Written Warning',
    DEDUCTION = 'Salary Deduction',
    SUSPENSION = 'Suspension',
    TERMINATION = 'Termination',
}

export enum ShiftLocationType {
    ON_SITE = 'On-Site',
    REMOTE = 'Remote',
    FIELD_WORK = 'Field Work',
}

export enum CheckInMethod {
    BIOMETRIC = 'Biometric',
    MOBILE = 'Mobile',
    MANUAL = 'Manual',
}

export enum MaritalStatus {
    SINGLE = 'Single',
    MARRIED = 'Married',
    DIVORCED = 'Divorced',
    WIDOWED = 'Widowed',
}

export enum VisaStatus {
    ACTIVE = 'Active',
    EXPIRED = 'Expired',
    CANCELLED = 'Cancelled',
    UNDER_PROCESS = 'Under Process',
}

export enum PayFrequency {
    MONTHLY = 'Monthly',
    BIWEEKLY = 'Bi-Weekly',
    WEEKLY = 'Weekly',
}

export enum PayComponentType {
    EARNING = 'Earning',
    DEDUCTION = 'Deduction',
}

export enum PayCycle {
    END_OF_MONTH = 'End of Month',
    START_OF_MONTH = 'Start of Month',
    CUSTOM_DATE = 'Custom Date',
}

export enum RoundingRule {
    NO_ROUNDING = 'No Rounding',
    NEAREST_WHOLE = 'To Nearest Whole Number',
    ROUND_UP = 'Always Round Up',
    ROUND_DOWN = 'Always Round Down',
}

// --- Core Data Structures ---

export type Permission = 
  | 'canViewDashboard'
  | 'canViewPersonnel'
  | 'canManagePersonnel'
  | 'canViewPayroll'
  | 'canManagePayroll'
  | 'canViewAttendance'
  | 'canManageAttendance'
  | 'canViewTasks'
  | 'canManageTasks'
  | 'canViewHRPolicies'
  | 'canManageHRPolicies'
  | 'canViewReports'
  | 'canViewAppraisals'
  | 'canManageAppraisals'
  | 'canViewTraining'
  | 'canManageTraining'
  | 'canManageSettings'
  | 'canViewServiceRequests'
  | 'canManageServiceRequests'
  | 'canViewAnalytics';

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
    isSystem?: boolean; 
}

export interface User {
    id: string;
    username: string;
    email: string;
    password?: string;
    employeeId: string;
    roleId: string;
    isActive: boolean;
    createdAt?: Date;
}

export interface Allowance {
    name: string;
    amount: number;
    type?: string;
}

export interface WarningLetter {
    date: string;
    reason: string;
}

export interface PerformanceAppraisal {
    managerEvaluation: number;
    attitudeNotes: string;
}

export interface LeaveBalance {
    total: number;
    taken: number;
}

export interface Document {
    id: string;
    name: string;
    url: string; 
    issueDate?: string;
    expiryDate?: string;
}

export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
}

export interface AuditTrail {
    createdBy: string;
    createdAt: string;
    lastEditedBy?: string;
    lastEditedOn?: string;
}

export interface SalaryRecord {
    id: string;
    effectiveDate: string;
    baseSalary: number;
    allowances: Allowance[];
    deductions: Allowance[];
    currency: string;  
}

export interface Employee {
    id: string;
    staffId: string;
    
    // Personal Info
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: 'Male' | 'Female' | 'Other';
    dob: string | null;
    nationality: string;
    maritalStatus: MaritalStatus;
    phone: string;
    email: string;
    address: string;
    photoUrl?: string;

    // Employment
    workStatus: WorkStatus;
    joiningDate: string;
    designation: string;
    department: string;
    reportingManagerId?: string;

    // Compensation & Payroll
    baseSalary: number;
    previousSalary?: number;
    presentGrossSalary: number;
    allowances: Allowance[];
    
    // Payroll Settings
    payrollCode?: string;
    payFrequency?: PayFrequency;
    targetRate?: number;
    bankName?: string;
    iban?: string;
    isTaxable?: boolean;
    isOvertimeEligible?: boolean;
    
    // Identity & Documents
    passportNo: string | null;
    passportExp: string | null;
    visaStatus?: VisaStatus;
    visaStartDate?: string | null;
    visaExpDate: string | null; 
    eidNumber?: string | null;
    eidIssueDate?: string | null;
    eidExpDate?: string | null;
    documents?: Document[];
    
    // Emergency & Notes
    emergencyContact?: EmergencyContact;
    remarks?: string;

    // Audit Trail
    auditTrail: AuditTrail;

    // Custom Fields
    customFieldValues?: Record<string, any>;

    // Existing fields for compatibility
    workLocation: WorkLocation;
    appraisals?: Record<string, PerformanceAppraisal>;
    warningLetters?: WarningLetter[];
    productivityScore?: number;
    leaveBalances: Record<string, LeaveBalance>;
    name?: string; 
    salaryHistory: SalaryRecord[]; 
    currentSalaryId?: string;
}

export interface CustomFieldDef {
    id: string;
    name: string;
    type: 'text' | 'date' | 'select';
    options?: string[];
    isRequired: boolean;
}

// --- Settings specific types ---
export interface PayComponent {
    id: string;
    name: string;
    type: PayComponentType;
}

export interface GLCodeMapping {
    id: string;
    payComponentId: string;
    glCode: string;
}

export interface PayrollSettings {
    payComponents: PayComponent[];
    payCycle: PayCycle;
    payCycleCustomDate?: number;
    roundingRule: RoundingRule;
    glCodeMappings: GLCodeMapping[];
    payrollPeriodStartDate: string;
    payrollPeriodEndDate: string;
}

export interface AttendanceRule {
    workdays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
    graceTimeMinutes: number;
    overtimeMultipliers: {
        weekday: number;
        weekend: number;
        holiday: number;
    };
}

export interface APIKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
}

export interface Webhook {
    id: string;
    url: string;
    events: string[];
}

export interface SSOSettings {
    enabled: boolean;
    provider: 'SAML' | 'OIDC';
    entryPointUrl?: string;
    issuer?: string;
    certificate?: string;
}

export interface IntegrationSettings {
    apiKeys: APIKey[];
    webhooks: Webhook[];
    sso: SSOSettings;
}

export type NotificationRecipient = {
    type: 'role' | 'user';
    id: string;
};

export interface NotificationSetting {
    id: 'visaExpiry' | 'eidExpiry' | 'payrollApproval';
    label: string;
    recipients: NotificationRecipient[];
}

export interface UIThemeSettings {
    themeColor: 'indigo' | 'teal' | 'rose' | 'slate';
    navStyle: 'default' | 'compact';
    themeMode: 'light' | 'dark';
}

export interface SystemSettings {
    companyName: string;
    currency?: string;
    timezone?: string;
    fiscalYearStartMonth?: number;
    workWeekStart: number;
    defaultWorkHoursPerDay: number;
    overtimeRate: number;
    leaveApprovalWorkflow: string;
    payrollCycle: 'Monthly' | 'Bi-Weekly' | 'Weekly';
    uiSettings: UIThemeSettings;
    enabledModules: {
        payroll: boolean;
        attendance: boolean;
        training: boolean;
        appraisals: boolean;
    };
    documentExpiryRules: {
        passport: number[];
        visa: number[];
        eid: number[];
    };
    customFields: CustomFieldDef[];
    payrollSettings: PayrollSettings;
    attendanceRules: AttendanceRule;
    integrationSettings: IntegrationSettings;
    notificationSettings: NotificationSetting[];
}

// --- Attendance Related Types ⭐ ---

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    employeeName?: string;
    date: string; // YYYY-MM-DD
    inTime: string | null; // HH:MM
    outTime: string | null; // HH:MM
    
    // Status tracking
    isLate?: boolean;
    lateMinutes?: number;
    lateHours?: number;
    isEarlyDeparture?: boolean;
    earlyDepartureMinutes?: number;
    
    status: 'Present' | 'Late' | 'Early Departure' | 'Absent' | 'On Leave';
    
    // Work hours
    workHours?: number;
    overtimeHours?: number;
    
    // Check-in metadata
    checkInMethod?: string;
    checkInLocation?: {
        latitude: number;
        longitude: number;
    };
    
    // Audit fields
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    
    // Populated fields
    employee?: Employee;
}

export interface CreateAttendanceDto {
    employeeId: string;
    date: string; // YYYY-MM-DD
    inTime?: string; // HH:MM
    outTime?: string; // HH:MM
    checkInMethod?: string;
    checkInLocation?: {
        latitude: number;
        longitude: number;
    };
    status?: string;
    lateMinutes?: number;
    isLate?: boolean;
    workHours?: number;
    overtimeHours?: number;
}

export interface UpdateAttendanceDto {
    outTime?: string;
    workHours?: number;
    overtimeHours?: number;
    lateHours?: number;
    isEarlyDeparture?: boolean;
    earlyDepartureMinutes?: number;
    status?: string;
    checkInMethod?: string;
}

export interface AttendanceStats {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
    averageWorkHours: number;
}

export interface TodayAttendanceStatus {
    hasClockedIn: boolean;
    hasClockedOut: boolean;
    record: AttendanceRecord | null;
}

export interface AttendanceFilters {
    employeeId?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
}

export interface BulkImportResult {
    success: boolean;
    imported: number;
    message: string;
    records: AttendanceRecord[];
}

export interface ExcelRow {
    'Employee ID': string;
    'Date (YYYY-MM-DD)': string;
    'Clock In Time (HH:MM)': string;
    'Clock Out Time (HH:MM)'?: string;
    'Check In Method'?: string;
    'Status'?: string;
}

export interface ValidationError {
    row: number;
    message: string;
}

export interface UploadStatus {
    success: number;
    failed: number;
    total: number;
    errors?: ValidationError[];
}

// --- Shift Related Types ---

export interface Shift {
    id: string;
    name: string;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    color: string;
    locationType: ShiftLocationType;
}

export interface EmployeeShift {
    id: string;
    employeeId: string;
    shiftId: string;
    date: string; // YYYY-MM-DD
    shift?: Shift;
}

export interface PublicHoliday {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    description?: string;
}

// --- Tasks ---

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    dueDate: string; // YYYY-MM-DD
    assignedTo: string;
    createdBy: string;
    createdAt: string;
}

// --- Employee Services ---

interface BaseRequest {
    id: string;
    employeeId: string;
    requestDate: string;
    status: RequestStatus;
    reason: string;
    managerNotes?: string;
    approvedBy?: string;
}

export interface LeaveRequest extends BaseRequest {
    leaveType: string;
    startDate: string;
    endDate: string;
    employeeName?: string;
    approverId?: string;
    approverName?: string;
    approvalDate?: string;
    createdAt?: string;
}

export interface PermissionRequest extends BaseRequest {
    permissionDate: string;
    startTime: string;
    endTime: string;
}

export interface CashAdvanceRequest extends BaseRequest {
    amount: number;
    repaymentDate: string;
}

export interface ResignationRequest extends BaseRequest {
    proposedLastDay: string;
}

// --- Training ---

export interface TrainingProgram {
    id: string;
    title: string;
    description: string;
    category: 'Technical' | 'Soft Skills' | 'Compliance' | 'Leadership';
    durationHours: number;
    provider: string;
}

export interface TrainingSession {
    id: string;
    programId: string;
    startDate: string;
    endDate: string;
    instructor: string;
    location: string;
    status: TrainingProgramStatus;
}

export interface EmployeeEnrollment {
    sessionId: string;
    employeeId: string;
    status: EnrollmentStatus;
    score?: number;
    completionDate?: string;
}

// --- HR Policies ---

export interface Penalty {
    offenseNumber: number;
    penaltyType: PenaltyType;
    deductionAmount?: number;
}

export interface ViolationType {
    id: string;
    name: string;
    penalties: Penalty[];
}

export interface Policy {
    id: string;
    title: string;
    description: string;
    violationTypes: ViolationType[];
}

// --- Payroll ---

export interface Payslip {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    baseSalary: number;
    allowances: Allowance[];
    totalEarnings: number;
    deductions: { name: string; amount: number }[];
    totalDeductions: number;
    netSalary: number;
}

// Service Request Types
export interface ServiceRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    requestType: 'leave' | 'permission' | 'cash' | 'resignation';
    status: 'Pending' | 'Approved' | 'Rejected';
    
    // Leave specific
    leaveType?: 'Annual' | 'Sick' | 'Emergency';
    startDate?: string;
    endDate?: string;
    
    // Permission specific
    permissionDate?: string;
    startTime?: string;
    endTime?: string;
    
    // Cash advance specific
    amount?: number;
    repaymentDate?: string;
    
    // Resignation specific
    proposedLastDay?: string;
    
    // Common
    reason?: string;
    
    // Approval info
    approverId?: string;
    approverName?: string;
    approvalDate?: string;
    managerNotes?: string;
    
    // Metadata
    createdAt: string;
    updatedAt?: string;
}
