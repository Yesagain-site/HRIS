import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Select, Input, Modal, ConfirmationModal } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { AttendanceRecord, Shift, PublicHoliday, RequestStatus, LeaveRequest, EmployeeShift, Employee, ShiftLocationType } from '../types';
import { ArrowUpTrayIcon, ClipboardDocumentListIcon, MapPinIcon, PlusIcon, TrashIcon, PencilIcon, ClockIcon, SunIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { NewRequestModal } from './EmployeeServicesPage';
import * as XLSX from 'xlsx';
import { api } from '../services/api';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
    { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
    { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' },
];

// ─── Company Shift Configuration (must match backend constants) ───────────────
const SHIFT_START        = '08:00'; // 8:00 AM
const SHIFT_END          = '19:00'; // 7:00 PM
const STANDARD_HOURS     = 11;      // 8 AM → 7 PM
const LATE_GRACE_MINUTES = 5;       // 5-minute grace period before "Late"

/** Converts "HH:MM" to total minutes from midnight */
const timeToMinutes = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

/** Converts total minutes to a human-readable string like "1 hr 2 min" */
const formatMinutes = (totalMinutes: number): string => {
    if (!totalMinutes || totalMinutes <= 0) return '—';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} hr`;
    return `${hrs} hr ${mins} min`;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getEmployeeDisplayName = (emp: Employee): string => {
    if (!emp) return '';
    const fullName = [emp.firstName, (emp as any).middleName, emp.lastName].filter(Boolean).join(' ').trim();
    return (emp as any).name || fullName || emp.staffId || '';
};

const getStatusBadgeClass = (status: AttendanceRecord['status']) => {
    switch (status) {
        case 'Present':          return 'bg-green-100 text-green-800';
        case 'Late':             return 'bg-yellow-100 text-yellow-800';
        case 'Early Departure':  return 'bg-orange-100 text-orange-800';
        case 'Absent':           return 'bg-red-100 text-red-800';
        case 'On Leave':         return 'bg-blue-100 text-blue-800';
        default:                 return 'bg-gray-100 text-gray-800';
    }
};

const OFFICE_LOCATION = { latitude: 34.052235, longitude: -118.243683 };
const GEOFENCE_RADIUS_METERS = 500;

const getDistance = (
    coords1: { latitude: number; longitude: number },
    coords2: { latitude: number; longitude: number }
): number => {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const φ1 = toRad(coords1.latitude);
    const φ2 = toRad(coords2.latitude);
    const Δφ = toRad(coords2.latitude - coords1.latitude);
    const Δλ = toRad(coords2.longitude - coords1.longitude);
    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Shift Management Modal ───────────────────────────────────────────────────

const ShiftManagementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    shifts: Shift[];
    onSave: (shift: Omit<Shift, 'id'> | Shift) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, shifts, onSave, onDelete }) => {
    const initialFormState: Omit<Shift, 'id'> = {
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        color: '#3b82f6',
        locationType: ShiftLocationType.ON_SITE,
    };
    const [formData, setFormData] = useState(initialFormState);
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setEditingShiftId(null);
            setFormData(initialFormState);
        }
    }, [isOpen]);

    const handleEditClick = (shift: Shift) => {
        setEditingShiftId(shift.id);
        setFormData(shift);
    };

    const handleCancelEdit = () => {
        setEditingShiftId(null);
        setFormData(initialFormState);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingShiftId) {
            onSave({ ...formData, id: editingShiftId });
        } else {
            onSave(formData);
        }
        handleCancelEdit();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Shifts">
            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold mb-2">Existing Shifts</h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-md bg-gray-50">
                        {shifts.map((shift) => (
                            <li key={shift.id} className="flex justify-between items-center p-2 bg-white rounded-md shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span style={{ backgroundColor: shift.color }} className="w-4 h-4 rounded-full flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold">{shift.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {shift.startTime} – {shift.endTime} ({shift.locationType})
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleEditClick(shift)}>
                                        <PencilIcon className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => onDelete(shift.id)}>
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">{editingShiftId ? 'Edit Shift' : 'Add New Shift'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Shift Name" name="name" value={formData.name} onChange={handleChange} required />
                        <Select label="Work Hub Type" name="locationType" value={formData.locationType} onChange={handleChange}>
                            {Object.values(ShiftLocationType).map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </Select>
                        <Input label="Start Time" name="startTime" type="time" value={formData.startTime} onChange={handleChange} required />
                        <Input label="End Time"   name="endTime"   type="time" value={formData.endTime}   onChange={handleChange} required />
                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Color</label>
                            <Input label="" name="color" type="color" value={formData.color} onChange={handleChange} className="p-1 h-10 w-full" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        {editingShiftId && (
                            <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
                        )}
                        <Button type="submit">{editingShiftId ? 'Save Changes' : 'Add Shift'}</Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

// ─── Manager Dashboard Tab ────────────────────────────────────────────────────

const ManagerDashboardTab: React.FC = () => {
    const { attendanceRecords, serviceRequests, employees, refreshEmployees, updateRequestStatus } = useHRData();
    const todayStr = new Date().toISOString().split('T')[0];
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'leave' | 'permission' | 'cash' | 'resignation';
        id: string;
        action: 'approve' | 'reject';
        reason?: string;
    } | null>(null);

    useEffect(() => {
        if (attendanceRecords.length === 0) {
            console.log('🔄 No attendance records, reloading...');
            refreshEmployees();
        }
    }, [attendanceRecords.length]);

    const todaySummary = useMemo(() => {
        const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);
        const activeEmployees = employees.filter((e) => e.workStatus === 'Active');
        
        return {
            total: activeEmployees.length,
            present: todayRecords.filter((r) => 
                r.status === 'Present' || r.status === 'Late'
            ).length,
            absent: todayRecords.filter((r) => r.status === 'Absent').length,
            onLeave: todayRecords.filter((r) => r.status === 'On Leave').length,
            late: todayRecords.filter((r) => r.status === 'Late').length,
            earlyOut: todayRecords.filter((r) => r.status === 'Early Departure').length,
        };
    }, [attendanceRecords, todayStr, employees]);

    // Get ALL pending requests from serviceRequests
    const pendingRequests = useMemo(() => {
        if (!serviceRequests) return [];
        
        return serviceRequests
            .filter((r: any) => r.status === 'Pending')
            .sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [serviceRequests]);

    const getEmployeeName = (employeeId: string) => {
        const emp = employees.find(e => e.id === employeeId);
        return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
    };

    const getRequestTypeDisplay = (req: any) => {
        switch (req.requestType) {
            case 'leave':
                return `Leave (${req.leaveType || 'Annual'})`;
            case 'permission':
                return `Permission (${req.startTime || ''} - ${req.endTime || ''})`;
            case 'cash':
                return `Cash Advance (AED ${req.amount || 0})`;
            case 'resignation':
                return `Resignation`;
            default:
                return req.requestType;
        }
    };

    const getRequestDetails = (req: any) => {
        switch (req.requestType) {
            case 'leave':
                return `${req.startDate || ''} to ${req.endDate || ''}`;
            case 'permission':
                return `${req.permissionDate || ''}`;
            case 'cash':
                return `Repayment: ${req.repaymentDate || 'Not specified'}`;
            case 'resignation':
                return `Last Day: ${req.proposedLastDay || 'Not specified'}`;
            default:
                return '';
        }
    };

    const handleUpdateRequest = async (
        type: 'leave' | 'permission' | 'cash' | 'resignation',
        id: string,
        action: 'approve' | 'reject',
        reason?: string
    ) => {
        try {
            const status = action === 'approve' ? 'Approved' : 'Rejected';
            await updateRequestStatus(type, id, status, reason);
            alert(`Request ${action}d successfully!`);
        } catch (error) {
            console.error('Error updating request:', error);
            alert('Failed to update request. Please try again.');
        }
    };

    const renderConfirmationModal = () => {
        if (!pendingAction) return null;
        
        return (
            <Modal
                isOpen={showConfirmModal}
                onClose={() => {
                    setShowConfirmModal(false);
                    setPendingAction(null);
                }}
                title={pendingAction.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-center text-5xl mb-4">
                        {pendingAction.action === 'approve' ? '✅' : '⚠️'}
                    </div>
                    <p className="text-center text-gray-700">
                        {pendingAction.action === 'approve' 
                            ? 'Are you sure you want to approve this request?' 
                            : 'Are you sure you want to reject this request?'}
                    </p>
                    {pendingAction.reason && (
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-700">
                                <strong>Rejection reason:</strong> {pendingAction.reason}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => {
                            setShowConfirmModal(false);
                            setPendingAction(null);
                        }}>
                            Cancel
                        </Button>
                        <Button 
                            variant={pendingAction.action === 'approve' ? 'primary' : 'danger'}
                            onClick={async () => {
                                await handleUpdateRequest(
                                    pendingAction.type,
                                    pendingAction.id,
                                    pendingAction.action,
                                    pendingAction.reason
                                );
                                setShowConfirmModal(false);
                                setPendingAction(null);
                            }}
                        >
                            {pendingAction.action === 'approve' ? 'Approve' : 'Reject'}
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    };

    return (
        <div className="space-y-6">
            {renderConfirmationModal()}
            
            <Card title="Today's Attendance Snapshot">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-3xl font-bold text-gray-800">{todaySummary.total}</p>
                        <p className="text-sm text-gray-600">Active</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">{todaySummary.present}</p>
                        <p className="text-sm text-green-600">Present</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-3xl font-bold text-red-600">{todaySummary.absent}</p>
                        <p className="text-sm text-red-600">Absent</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">{todaySummary.onLeave}</p>
                        <p className="text-sm text-blue-600">On Leave</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                        <p className="text-3xl font-bold text-yellow-600">{todaySummary.late}</p>
                        <p className="text-sm text-yellow-600">Late In</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">{todaySummary.earlyOut}</p>
                        <p className="text-sm text-orange-600">Early Out</p>
                    </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-500 text-center">
                    * Present count includes employees who arrived late
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6">
                <Card title="Pending Service Requests">
                    {pendingRequests.length > 0 ? (
                        <div className="space-y-3">
                            {pendingRequests.slice(0, 10).map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{getEmployeeName(req.employeeId)}</p>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                req.requestType === 'leave' ? 'bg-blue-100 text-blue-800' :
                                                req.requestType === 'permission' ? 'bg-purple-100 text-purple-800' :
                                                req.requestType === 'cash' ? 'bg-green-100 text-green-800' :
                                                'bg-orange-100 text-orange-800'
                                            }`}>
                                                {req.requestType}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-semibold">{getRequestTypeDisplay(req)}</span>
                                            {getRequestDetails(req) && ` • ${getRequestDetails(req)}`}
                                        </p>
                                        {req.reason && (
                                            <p className="text-xs text-gray-500 mt-1">"{req.reason}"</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            onClick={() => {
                                                setPendingAction({
                                                    type: req.requestType,
                                                    id: req.id,
                                                    action: 'approve'
                                                });
                                                setShowConfirmModal(true);
                                            }}
                                        >
                                            Approve
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="danger"
                                            onClick={() => {
                                                const reason = prompt('Enter rejection reason:');
                                                if (reason) {
                                                    setPendingAction({
                                                        type: req.requestType,
                                                        id: req.id,
                                                        action: 'reject',
                                                        reason
                                                    });
                                                    setShowConfirmModal(true);
                                                }
                                            }}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {pendingRequests.length > 10 && (
                                <p className="text-center text-sm text-gray-500">
                                    +{pendingRequests.length - 10} more requests
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-gray-500">No pending service requests</p>
                            <p className="text-sm text-gray-400 mt-1">All requests have been processed</p>
                        </div>
                    )}
                </Card>

                <Card title="Quick Actions">
                    <div className="space-y-3">
                        <Button variant="secondary" className="w-full justify-start">
                            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                            Generate Attendance Report
                        </Button>
                        <Button variant="secondary" className="w-full justify-start">
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Add Manual Attendance
                        </Button>
                        <Button variant="secondary" className="w-full justify-start">
                            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                            Import Biometric Data
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

// ─── My Attendance Tab ────────────────────────────────────────────────────────

const MyAttendanceTab: React.FC = () => {
    const { employeeDetails, isAdmin, isManager } = useAuth();
    const {
        employees,
        clockIn,
        clockOut,
        getTodayAttendanceStatus,
        getEmployeeAttendance,
        getMyTeamMembers,
        getTeamAttendance,
    } = useHRData();

    // ── State ────────────────────────────────────────────────────────────────
    const [clockInStatus, setClockInStatus] = useState<{
        type: 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'confirm';
        message: string;
        lateMinutes?: number;
        earlyMinutes?: number;
    }>({ type: 'idle', message: '' });

    const [showEarlyConfirm, setShowEarlyConfirm] = useState(false);
    const [pendingClockOutTime, setPendingClockOutTime] = useState<string | null>(null);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [isClockingIn,  setIsClockingIn]  = useState(false);
    const [isClockingOut, setIsClockingOut] = useState(false);
    const [todayStatus, setTodayStatus] = useState<any>({
        hasClockedIn: false,
        hasClockedOut: false,
        record: null,
    });
    const [myRecords,   setMyRecords]   = useState<AttendanceRecord[]>([]);
    const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading,   setIsLoading]   = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // ── UAE timezone helpers ─────────────────────────────────────────────────

    const UAE_TIMEZONE = 'Asia/Dubai';

    const getCurrentUaeDate = (): string => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone : UAE_TIMEZONE,
            year     : 'numeric',
            month    : '2-digit',
            day      : '2-digit',
        }).format(new Date());
    };

    const getCurrentUaeTime = (): string => {
        return new Intl.DateTimeFormat('en-US', {
            timeZone : UAE_TIMEZONE,
            hour     : '2-digit',
            minute   : '2-digit',
            hour12   : false,
        }).format(new Date());
    };

    const formatDisplayTime = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '--:--';
        try {
            if (timeStr.includes(':')) {
                const [hours, minutes] = timeStr.split(':').map(Number);
                const d = new Date();
                d.setHours(hours, minutes, 0);
                return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            }
            return timeStr;
        } catch {
            return timeStr;
        }
    };

    const formatDisplayDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return 'Invalid Date';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Invalid Date';
            return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return 'Invalid Date';
        }
    };

    // ── Load data ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (employeeDetails?.id && !initialLoadDone) {
            loadMyAttendanceData();
            setInitialLoadDone(true);
        }
    }, [employeeDetails?.id]);

    const loadMyAttendanceData = async () => {
        if (!employeeDetails?.id) return;
        setIsLoading(true);
        try {
            const status  = await getTodayAttendanceStatus(employeeDetails.id);
            setTodayStatus(status);

            const records = await getEmployeeAttendance(employeeDetails.id);
            setMyRecords(records || []);

            if (isManager || isAdmin) {
                const teamMembers = getMyTeamMembers(employeeDetails.id);
                const teamIds     = teamMembers.map((m: any) => m.id);
                if (teamIds.length > 0) {
                    const teamAtt = await getTeamAttendance(teamIds);
                    setTeamRecords(teamAtt);
                }
            }
        } catch (error) {
            console.error('Failed to load attendance data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Late-check helper ────────────────────────────────────────────────────

    /**
     * Evaluates whether the given UAE time represents a late check-in.
     * Returns { isLate, lateMinutes } so the UI can warn the employee.
     */
    const evaluateLateClockIn = (currentTime: string) => {
        const inMins    = timeToMinutes(currentTime);
        const startMins = timeToMinutes(SHIFT_START);
        const lateMins  = Math.max(0, inMins - startMins);
        return {
            isLate     : lateMins > LATE_GRACE_MINUTES,
            lateMinutes: lateMins,
        };
    };

    /**
     * Evaluates whether the given UAE time represents an early clock-out.
     * Returns { isEarly, earlyMinutes } so the UI can ask for confirmation.
     */
    const evaluateEarlyClockOut = (currentTime: string) => {
        const outMins  = timeToMinutes(currentTime);
        const endMins  = timeToMinutes(SHIFT_END);
        const earlyMin = Math.max(0, endMins - outMins);
        return {
            isEarly     : earlyMin > 0,
            earlyMinutes: earlyMin,
        };
    };

    // ── Clock-In handler ─────────────────────────────────────────────────────

    const performClockIn = async (userLocation?: { latitude: number; longitude: number }) => {
        if (!employeeDetails?.id) return;

        const currentDate = getCurrentUaeDate();
        const currentTime = getCurrentUaeTime();

        // Evaluate lateness on the frontend too (so we can show the banner immediately)
        const { isLate, lateMinutes } = evaluateLateClockIn(currentTime);

        const result = await clockIn(employeeDetails.id, userLocation);

        if (result.success && result.record) {
            const newRecord = {
                ...result.record,
                date  : currentDate,
                inTime: currentTime,
            };

            setTodayStatus({ hasClockedIn: true, hasClockedOut: false, record: newRecord });

            setMyRecords((prev) => {
                const exists = prev.some((r) => r.date === currentDate);
                return exists
                    ? prev.map((r) => (r.date === currentDate ? newRecord : r))
                    : [newRecord, ...prev];
            });

            if (isLate) {
                setClockInStatus({
                    type       : 'warning',
                    message    : `⚠️ Clocked in at ${formatDisplayTime(currentTime)} — ${lateMinutes} min late. Status: Late.`,
                    lateMinutes,
                });
            } else {
                setClockInStatus({
                    type   : 'success',
                    message: `✅ Clocked in on time at ${formatDisplayTime(currentTime)}.`,
                });
            }
        } else {
            setClockInStatus({ type: 'error', message: result.message || 'Failed to clock in' });
        }

        setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 5000);
        setIsClockingIn(false);
    };

    const handleClockIn = async () => {
        if (!employeeDetails?.id || isClockingIn || isClockingOut) return;

        if (todayStatus.hasClockedIn) {
            setClockInStatus({ type: 'error', message: 'You have already clocked in today' });
            setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 3000);
            return;
        }

        setIsClockingIn(true);
        setClockInStatus({ type: 'loading', message: 'Getting location...' });

        try {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const userLocation = {
                        latitude : position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    await performClockIn(userLocation);
                },
                async () => {
                    console.warn('Location unavailable, clocking in without geofence');
                    await performClockIn();
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } catch (error) {
            console.error('Clock in error:', error);
            setClockInStatus({ type: 'error', message: 'Failed to clock in' });
            setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 3000);
            setIsClockingIn(false);
        }
    };

    // ── Clock-Out handler ────────────────────────────────────────────────────

    /**
     * Actually performs the clock-out API call.
     * The backend recalculates workHours, OT, earlyDeparture from the stored
     * inTime, so we just send the outTime.
     */
    const performClockOut = async (outTime: string) => {
        if (!employeeDetails?.id) return;

        const currentDate = getCurrentUaeDate();
        const { isEarly, earlyMinutes } = evaluateEarlyClockOut(outTime);

        const result = await clockOut(employeeDetails.id);

        if (result.success && result.record) {
            // Calculate work hours locally for immediate display
            const inTime = todayStatus.record?.inTime || SHIFT_START;
            const inMins = timeToMinutes(inTime);
            const outMins = timeToMinutes(outTime);
            const rawWorkMins   = Math.max(0, outMins - inMins);
            const workHours     = parseFloat((rawWorkMins / 60).toFixed(2));
            const overtimeHours = parseFloat((Math.max(0, rawWorkMins - STANDARD_HOURS * 60) / 60).toFixed(2));

            const updatedRecord = {
                ...result.record,
                outTime,
                workHours,
                overtimeHours,
                status: isEarly
                    ? (todayStatus.record?.status === 'Late' ? 'Late' : 'Early Departure')
                    : (todayStatus.record?.status || 'Present'),
            };

            setTodayStatus({ hasClockedIn: true, hasClockedOut: true, record: updatedRecord });
            setMyRecords((prev) =>
                prev.map((r) => (r.date === currentDate ? updatedRecord : r))
            );

            let msg = `✅ Clocked out at ${formatDisplayTime(outTime)}. Hours worked: ${workHours.toFixed(2)}h`;
            if (overtimeHours > 0)  msg += ` (OT: ${overtimeHours.toFixed(2)}h)`;
            if (isEarly)            msg  = `⚠️ Early departure — left ${earlyMinutes} min before 7:00 PM. ${msg}`;

            setClockInStatus({
                type        : isEarly ? 'warning' : 'success',
                message     : msg,
                earlyMinutes: isEarly ? earlyMinutes : undefined,
            });
        } else {
            setClockInStatus({ type: 'error', message: result.message || 'Failed to clock out' });
        }

        setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 6000);
        setIsClockingOut(false);
    };

    const handleClockOut = async () => {
        if (!employeeDetails?.id || isClockingIn || isClockingOut) return;

        if (!todayStatus.hasClockedIn) {
            setClockInStatus({ type: 'error', message: 'You need to clock in first' });
            setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 3000);
            return;
        }

        if (todayStatus.hasClockedOut) {
            setClockInStatus({ type: 'error', message: 'You have already clocked out today' });
            setTimeout(() => setClockInStatus({ type: 'idle', message: '' }), 3000);
            return;
        }

        const currentTime = getCurrentUaeTime();
        const { isEarly, earlyMinutes } = evaluateEarlyClockOut(currentTime);

        if (isEarly) {
            // Store the time and ask for confirmation before proceeding
            setPendingClockOutTime(currentTime);
            setShowEarlyConfirm(true);
            return;
        }

        // On-time or late clock-out — proceed immediately
        setIsClockingOut(true);
        setClockInStatus({ type: 'loading', message: 'Clocking out...' });
        await performClockOut(currentTime);
    };

    /** Called when the employee confirms they want to leave early */
    const confirmEarlyClockOut = async () => {
        setShowEarlyConfirm(false);
        if (!pendingClockOutTime) return;
        const time = pendingClockOutTime;
        setPendingClockOutTime(null);
        setIsClockingOut(true);
        setClockInStatus({ type: 'loading', message: 'Clocking out early...' });
        await performClockOut(time);
    };

    /** Called when the employee cancels and stays */
    const cancelEarlyClockOut = () => {
        setShowEarlyConfirm(false);
        setPendingClockOutTime(null);
    };

    // ── Early check-out confirmation modal ───────────────────────────────────

    const earlyMinutesDisplay = pendingClockOutTime
        ? evaluateEarlyClockOut(pendingClockOutTime).earlyMinutes
        : 0;

    // ── Render guard ─────────────────────────────────────────────────────────

    if (!employeeDetails) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4 text-gray-300">👤</div>
                <p className="text-lg text-gray-600">No employee record linked to your account</p>
                <p className="text-sm text-gray-500 mt-2">Please contact HR to link your account.</p>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* ── Early Departure Confirmation Modal ── */}
            {showEarlyConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
                        <div className="text-center">
                            <div className="text-5xl mb-3">⚠️</div>
                            <h2 className="text-lg font-bold text-gray-800">Early Departure</h2>
                            <p className="text-gray-600 mt-2">
                                Your shift ends at <strong>7:00 PM</strong>. You are trying to clock out{' '}
                                <strong>{earlyMinutesDisplay} minutes early</strong>.
                            </p>
                            <p className="text-sm text-orange-600 mt-2 font-medium">
                                This will be recorded as an <em>Early Departure</em> and may affect your payroll.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={cancelEarlyClockOut}
                            >
                                Stay — Cancel
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                onClick={confirmEarlyClockOut}
                            >
                                Confirm Early Out
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Clock-In / Clock-Out Card ── */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Mobile Clock-In / Out</h3>

                        {/* Shift info banner */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm flex items-center gap-3">
                            <ClockIcon className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">
                                Shift: <strong>8:00 AM – 7:00 PM</strong> ({STANDARD_HOURS} hours)
                                &nbsp;·&nbsp; Grace: {LATE_GRACE_MINUTES} min
                            </span>
                        </div>

                        {/* Who is logged in */}
                        <div className="bg-blue-50 p-2 rounded-lg text-sm">
                            <span className="font-medium">Logged in as: </span>
                            {employeeDetails.firstName} {employeeDetails.lastName} ({employeeDetails.designation})
                        </div>

                        {/* Today's status */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">Today's Status:</p>
                            <div className="flex gap-4 mt-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${todayStatus.hasClockedIn ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className="text-sm">
                                        In: {todayStatus.record?.inTime ? formatDisplayTime(todayStatus.record.inTime) : 'Not yet'}
                                    </span>
                                    {todayStatus.record?.isLate && (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                            Late +{formatMinutes(todayStatus.record.lateMinutes)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${todayStatus.hasClockedOut ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <span className="text-sm">
                                        Out: {todayStatus.record?.outTime ? formatDisplayTime(todayStatus.record.outTime) : 'Not yet'}
                                    </span>
                                    {todayStatus.record?.isEarlyDeparture && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                                            Early -{formatMinutes(todayStatus.record.earlyDepartureMinutes)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Work hours / OT */}
                            {todayStatus.record?.workHours ? (
                                <div className="flex gap-4 mt-2 text-sm flex-wrap">
                                    <span className="text-blue-600 font-medium">
                                        Worked: {todayStatus.record.workHours.toFixed(2)} hrs
                                    </span>
                                    {todayStatus.record.overtimeHours > 0 && (
                                        <span className="text-purple-600 font-medium">
                                            OT: {todayStatus.record.overtimeHours.toFixed(2)} hrs
                                        </span>
                                    )}
                                </div>
                            ) : todayStatus.hasClockedIn && !todayStatus.hasClockedOut ? (
                                <p className="text-sm text-green-600 mt-2 font-medium">Currently clocked in</p>
                            ) : null}

                            {/* Status badge */}
                            {todayStatus.record?.status && (
                                <div className="mt-2">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(todayStatus.record.status)}`}>
                                        {todayStatus.record.status}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Clock-In / Clock-Out Buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleClockIn}
                                className="flex-1"
                                disabled={isClockingIn || todayStatus.hasClockedIn || isLoading}
                                variant={todayStatus.hasClockedIn ? 'secondary' : 'primary'}
                            >
                                <ClockIcon className="h-5 w-5 mr-2 inline" />
                                {isClockingIn
                                    ? 'Processing...'
                                    : todayStatus.hasClockedIn
                                    ? 'Clocked In ✓'
                                    : 'Clock In'}
                            </Button>

                            <Button
                                onClick={handleClockOut}
                                className="flex-1"
                                disabled={isClockingOut || !todayStatus.hasClockedIn || todayStatus.hasClockedOut || isLoading}
                                variant={todayStatus.hasClockedOut ? 'secondary' : 'primary'}
                            >
                                <ClockIcon className="h-5 w-5 mr-2 inline" />
                                {isClockingOut
                                    ? 'Processing...'
                                    : todayStatus.hasClockedOut
                                    ? 'Clocked Out ✓'
                                    : 'Clock Out'}
                            </Button>
                        </div>

                        {/* Status / Alert Banner */}
                        {clockInStatus.message && (
                            <div className={`p-3 rounded-lg text-sm ${
                                clockInStatus.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : clockInStatus.type === 'warning'
                                    ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                    : clockInStatus.type === 'error'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                                {clockInStatus.message}
                            </div>
                        )}

                        <div className="text-xs text-gray-500">
                            <MapPinIcon className="h-4 w-4 inline mr-1" />
                            Uses GPS to verify you're within 500 m of the office
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Request Leave</h3>
                        <Button
                            onClick={() => setIsRequestModalOpen(true)}
                            className="w-full"
                            variant="secondary"
                            disabled={isLoading}
                        >
                            <SunIcon className="h-5 w-5 mr-2 inline" />
                            Submit New Leave Request
                        </Button>
                        <div className="text-xs text-gray-500">Request vacation, sick leave, or other time off</div>
                    </div>
                </div>
            </Card>

            {/* ── My Attendance History ── */}
            <Card title="My Attendance History">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto max-h-96">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Hrs</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OT Hrs</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Late / Early</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {myRecords.length > 0 ? (
                                        myRecords.map((rec) => (
                                            <tr key={`att-${rec.id}`} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{formatDisplayDate(rec.date)}</td>
                                                <td className="px-4 py-3">
                                                    {/* FIXED: Show "Present" for Present, Late, AND Early Departure */}
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Early Departure'
                                                            ? 'bg-green-100 text-green-800'
                                                            : rec.status === 'Absent'
                                                            ? 'bg-red-100 text-red-800'
                                                            : rec.status === 'On Leave'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : getStatusBadgeClass(rec.status)
                                                    }`}>
                                                        {rec.status === 'Present' || rec.status === 'Late' || rec.status === 'Early Departure'
                                                            ? 'Present'
                                                            : rec.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono">{formatDisplayTime(rec.inTime)}</td>
                                                <td className="px-4 py-3 font-mono">{formatDisplayTime(rec.outTime)}</td>
                                                <td className="px-4 py-3 font-bold">
                                                    {rec.workHours ? rec.workHours.toFixed(1) : '—'} hrs
                                                </td>
                                                <td className="px-4 py-3 text-purple-600">
                                                    {rec.overtimeHours && rec.overtimeHours > 0
                                                        ? `+${rec.overtimeHours.toFixed(1)} hrs`
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {/* Show late minutes if they were late */}
                                                        {(rec.status === 'Late' || rec.isLate) && rec.lateMinutes ? (
                                                            <span className="text-yellow-600">Late +{formatMinutes(rec.lateMinutes)}</span>
                                                        ) : null}
                                                        
                                                        {/* Show early departure if applicable */}
                                                        {(rec.status === 'Early Departure' || rec.isEarlyDeparture) && rec.earlyDepartureMinutes ? (
                                                            <span className="text-orange-600">Early -{formatMinutes(rec.earlyDepartureMinutes)}</span>
                                                        ) : null}
                                                        
                                                        {rec.status !== 'Late' && rec.status !== 'Early Departure' && !rec.isLate && !rec.isEarlyDeparture && '—'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                No attendance records found. Click "Clock In" to start recording.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {myRecords.length > 0 && (
                            <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                    <div>
                                        <div className="font-bold text-lg text-green-600">
                                            {/* 🔴 FIX THIS: Count both Present AND Late as Present */}
                                            {myRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length}
                                        </div>
                                        <div className="text-gray-600">Present</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-yellow-600">
                                            {/* This stays the same - only count strictly Late */}
                                            {myRecords.filter((r) => r.status === 'Late').length}
                                        </div>
                                        <div className="text-gray-600">Late</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-orange-600">
                                            {myRecords.filter((r) => r.status === 'Early Departure').length}
                                        </div>
                                        <div className="text-gray-600">Early Out</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-red-600">
                                            {myRecords.filter((r) => r.status === 'Absent').length}
                                        </div>
                                        <div className="text-gray-600">Absent</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">
                                            {myRecords.reduce((s, r) => s + (r.workHours || 0), 0).toFixed(1)}
                                        </div>
                                        <div className="text-gray-600">Total Hrs</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* ── Team Attendance (managers / admins only) ── */}
            {(isManager || isAdmin) && teamRecords.length > 0 && (
                <Card title="Team Attendance Overview">
                    <div className="overflow-x-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OT</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {teamRecords.map((rec) => {
                                    const emp = employees.find((e) => e.id === rec.employeeId);
                                    return (
                                        <tr key={`team-${rec.id}`} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{emp?.firstName} {emp?.lastName}</td>
                                            <td className="px-4 py-3">{formatDisplayDate(rec.date)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(rec.status)}`}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{formatDisplayTime(rec.inTime)}</td>
                                            <td className="px-4 py-3 font-mono">{formatDisplayTime(rec.outTime)}</td>
                                            <td className="px-4 py-3 font-bold">{rec.workHours?.toFixed(1)} hrs</td>
                                            <td className="px-4 py-3 text-purple-600">
                                                {rec.overtimeHours && rec.overtimeHours > 0
                                                    ? `+${rec.overtimeHours.toFixed(1)}`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <NewRequestModal
                key="new-request-modal"
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
            />
        </div>
    );
};

// ─── Shift Scheduler Tab ──────────────────────────────────────────────────────

const ShiftSchedulerTab: React.FC = () => {
    const { employees, shifts, employeeShifts, assignShift, addShift, updateShift, deleteShift } = useHRData();

    const [viewMode, setViewMode]     = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    const visibleDates = useMemo(() => {
        const base = new Date(currentDate);
        if (viewMode === 'daily') return [base];
        if (viewMode === 'weekly') {
            const start = new Date(base);
            const day   = start.getDay();
            const diff  = day === 0 ? -6 : 1 - day;
            start.setDate(start.getDate() + diff);
            return Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                return d;
            });
        }
        const year  = base.getFullYear();
        const month = base.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    }, [viewMode, currentDate]);

    const headerLabel = useMemo(() => {
        const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (viewMode === 'daily')   return fmt.format(currentDate);
        if (viewMode === 'weekly')  return `${fmt.format(visibleDates[0])} – ${fmt.format(visibleDates[visibleDates.length - 1])}`;
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }, [viewMode, currentDate, visibleDates]);

    const handlePrev = () => setCurrentDate((prev) => {
        const d = new Date(prev);
        if (viewMode === 'daily')  d.setDate(d.getDate() - 1);
        else if (viewMode === 'weekly') d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        return d;
    });

    const handleNext = () => setCurrentDate((prev) => {
        const d = new Date(prev);
        if (viewMode === 'daily')  d.setDate(d.getDate() + 1);
        else if (viewMode === 'weekly') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        return d;
    });

    const handleSaveShift = (shiftData: Omit<Shift, 'id'> | Shift) => {
        if ('id' in shiftData) updateShift(shiftData.id, shiftData);
        else addShift(shiftData);
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold">Shift Scheduler</h2>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="inline-flex rounded-md shadow-sm border bg-white overflow-hidden" role="group">
                        {(['daily', 'weekly', 'monthly'] as const).map((mode, i) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 text-sm ${i > 0 ? 'border-l' : ''} ${viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={handlePrev} variant="secondary">&lt; Prev</Button>
                        <span className="text-sm font-medium text-gray-700">{headerLabel}</span>
                        <Button onClick={handleNext} variant="secondary">Next &gt;</Button>
                    </div>
                    <Button onClick={() => setIsShiftModalOpen(true)}>Manage Shifts</Button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm text-center">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 text-left w-48">Employee</th>
                            {visibleDates.map((d) => (
                                <th key={d.toISOString()} className="p-2 whitespace-nowrap">
                                    {d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((emp) => (
                            <tr key={emp.id} className="border-t">
                                <td className="p-2 text-left font-semibold">{getEmployeeDisplayName(emp)}</td>
                                {visibleDates.map((d) => {
                                    const dateStr       = d.toISOString().split('T')[0];
                                    const assignedShift = (employeeShifts || []).find((es) => es.employeeId === emp.id && es.date === dateStr);
                                    const shiftDetails  = shifts.find((s) => s.id === assignedShift?.shiftId);
                                    return (
                                        <td key={dateStr} className="p-1 border-l">
                                            <Select
                                                label=""
                                                id={`${emp.id}_${dateStr}`}
                                                value={assignedShift?.shiftId || ''}
                                                onChange={(e) => assignShift(emp.id, e.target.value, dateStr)}
                                                className="w-full text-xs"
                                                style={shiftDetails ? { backgroundColor: shiftDetails.color, color: '#fff' } : undefined}
                                            >
                                                <option value="">--</option>
                                                {shifts.map((s) => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </Select>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ShiftManagementModal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                shifts={shifts}
                onSave={handleSaveShift}
                onDelete={deleteShift}
            />
        </Card>
    );
};

// ─── Holidays Tab ─────────────────────────────────────────────────────────────

const HolidaysTab: React.FC = () => {
    const { publicHolidays, addPublicHoliday, deletePublicHoliday } = useHRData();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addPublicHoliday({ name, date });
        setName('');
        setDate('');
    };

    return (
        <Card title="Public Holiday Calendar">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4 p-4 border rounded-md">
                <Input label="Holiday Name" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                <Button type="submit">Add Holiday</Button>
            </form>
            <ul className="space-y-2">
                {publicHolidays.map((h) => (
                    <li key={h.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                            <span className="font-semibold">{h.name}</span> – <span>{h.date}</span>
                        </div>
                        <Button variant="danger" size="sm" onClick={() => deletePublicHoliday(h.id)}>
                            <TrashIcon className="h-4 w-4" />
                        </Button>
                    </li>
                ))}
            </ul>
        </Card>
    );
};

// ─── Employee Attendance History Viewer (Manager/Admin Only) ─────────────────

const EmployeeAttendanceHistory: React.FC = () => {
    const { employees, getEmployeeAttendance } = useHRData();
    const { hasPermission, employeeDetails } = useAuth();
    const canManage = hasPermission('canManageAttendance');
    
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [employeeStats, setEmployeeStats] = useState<any>(null);
    
    // NEW: State for designation filter
    const [designationFilter, setDesignationFilter] = useState<string>('');

    // Security guard - prevent unauthorized access
    if (!canManage) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4 text-gray-300">🔒</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Access Restricted</h3>
                <p className="text-gray-600">
                    You don't have permission to view employee attendance history.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    This section is only available to administrators and managers.
                </p>
            </div>
        );
    }

    // Load saved filters from localStorage on component mount
    useEffect(() => {
        const savedEmployeeId = localStorage.getItem('attendance_history_employee');
        const savedMonth = localStorage.getItem('attendance_history_month');
        const savedYear = localStorage.getItem('attendance_history_year');
        const savedDesignation = localStorage.getItem('attendance_history_designation'); // NEW

        if (savedEmployeeId) setSelectedEmployeeId(savedEmployeeId);
        if (savedMonth) setSelectedMonth(parseInt(savedMonth));
        if (savedYear) setSelectedYear(parseInt(savedYear));
        if (savedDesignation) setDesignationFilter(savedDesignation); // NEW
    }, []);

    // Save filters to localStorage whenever they change
    useEffect(() => {
        if (selectedEmployeeId) {
            localStorage.setItem('attendance_history_employee', selectedEmployeeId);
        }
        localStorage.setItem('attendance_history_month', selectedMonth.toString());
        localStorage.setItem('attendance_history_year', selectedYear.toString());
        localStorage.setItem('attendance_history_designation', designationFilter); // NEW
    }, [selectedEmployeeId, selectedMonth, selectedYear, designationFilter]);

    // Fetch attendance records when filters change
    useEffect(() => {
        if (selectedEmployeeId) {
            fetchAttendanceRecords();
        }
    }, [selectedEmployeeId, selectedMonth, selectedYear]);

    const fetchAttendanceRecords = async () => {
        if (!selectedEmployeeId) return;

        setIsLoading(true);
        try {
            const records = await getEmployeeAttendance(selectedEmployeeId, {
                month: selectedMonth,
                year: selectedYear
            });
            setAttendanceRecords(records || []);

            // Calculate statistics
            if (records && records.length > 0) {
                const stats = {
                    totalDays: records.length,
                    // 🔴 FIX THIS: Count both Present AND Late as Present
                    presentDays: records.filter((r: any) => 
                        r.status === 'Present' || r.status === 'Late'
                    ).length,
                    lateDays: records.filter((r: any) => r.status === 'Late').length,
                    earlyDepartureDays: records.filter((r: any) => r.status === 'Early Departure').length,
                    absentDays: records.filter((r: any) => r.status === 'Absent').length,
                    leaveDays: records.filter((r: any) => r.status === 'On Leave').length,
                    totalWorkHours: records.reduce((sum: number, r: any) => sum + (r.workHours || 0), 0),
                    totalOvertimeHours: records.reduce((sum: number, r: any) => sum + (r.overtimeHours || 0), 0),
                    totalLateMinutes: records.reduce((sum: number, r: any) => sum + (r.lateMinutes || 0), 0),
                };
                setEmployeeStats(stats);
            } else {
                setEmployeeStats(null);
            }
        } catch (error) {
            console.error('Failed to fetch attendance records:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

    const formatTime = (timeStr: string | null | undefined): string => {
        if (!timeStr) return '—';
        try {
            const [hours, minutes] = timeStr.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes), 0);
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch {
            return timeStr;
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const handleClearFilters = () => {
        setSelectedEmployeeId('');
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedYear(new Date().getFullYear());
        setDesignationFilter(''); // NEW
        
        // Clear from localStorage
        localStorage.removeItem('attendance_history_employee');
        localStorage.removeItem('attendance_history_month');
        localStorage.removeItem('attendance_history_year');
        localStorage.removeItem('attendance_history_designation'); // NEW
        
        setAttendanceRecords([]);
        setEmployeeStats(null);
    };

    // NEW: Get unique designations from employees for the dropdown
    const uniqueDesignations = useMemo(() => {
        const designations = employees
            .filter(emp => emp.designation && emp.designation.trim() !== '')
            .map(emp => emp.designation)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
        return designations;
    }, [employees]);

    // NEW: Filter employees by designation
    const filteredEmployees = useMemo(() => {
        let filtered = [...employees].filter(emp => emp.workStatus === 'Active');
        
        if (designationFilter) {
            filtered = filtered.filter(emp => emp.designation === designationFilter);
        }
        
        return filtered.sort((a, b) => 
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );
    }, [employees, designationFilter]);

    return (
        <Card title="Employee Attendance History">
            {/* Filter Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    
                    {/* NEW: Designation Filter Dropdown */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Filter by Designation
                        </label>
                        <select
                            value={designationFilter}
                            onChange={(e) => {
                                setDesignationFilter(e.target.value);
                                setSelectedEmployeeId(''); // Clear employee selection when filter changes
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">All Designations</option>
                            {uniqueDesignations.map(designation => (
                                <option key={designation} value={designation}>
                                    {designation}
                                </option>
                            ))}
                        </select>
                        {designationFilter && (
                            <p className="text-xs text-indigo-600 mt-1">
                                Showing {filteredEmployees.length} employees with this designation
                            </p>
                        )}
                    </div>

                    {/* Employee Selector - Now uses filteredEmployees */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Employee <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">-- Choose an employee --</option>
                            {filteredEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} 
                                    {emp.designation ? ` (${emp.designation})` : ''} - {emp.staffId}
                                </option>
                            ))}
                            {filteredEmployees.length === 0 && designationFilter && (
                                <option value="" disabled>No employees with this designation</option>
                            )}
                        </select>
                    </div>

                    {/* Month Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Year Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={fetchAttendanceRecords}
                            disabled={!selectedEmployeeId || isLoading}
                            variant="primary"
                            className="flex-1"
                        >
                            {isLoading ? 'Loading...' : 'View Records'}
                        </Button>
                        <Button
                            onClick={handleClearFilters}
                            variant="secondary"
                            className="px-3"
                            title="Clear filters"
                        >
                            ✕
                        </Button>
                    </div>
                </div>

                {/* Designation Summary */}
                {designationFilter && (
                    <div className="mt-3 text-sm bg-indigo-50 p-2 rounded border border-indigo-100">
                        <span className="font-medium text-indigo-800">Designation Filter: </span>
                        <span className="text-indigo-700">{designationFilter}</span>
                        <span className="text-indigo-400 mx-2">|</span>
                        <span className="text-indigo-700">{filteredEmployees.length} employees match this designation</span>
                    </div>
                )}

                {/* Selected Employee Info */}
                {selectedEmployee && (
                    <div className="mt-3 flex items-center gap-3 text-sm bg-white p-2 rounded border">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                            {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                        </div>
                        <div>
                            <span className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                            <span className="text-gray-500 mx-2">•</span>
                            <span className="text-gray-600">{selectedEmployee.designation || 'No designation'}</span>
                            <span className="text-gray-500 mx-2">•</span>
                            <span className="text-gray-600">ID: {selectedEmployee.staffId}</span>
                            <span className="text-gray-500 mx-2">•</span>
                            <span className="text-gray-600">{selectedEmployee.department || 'No department'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Statistics Cards */}
            {employeeStats && attendanceRecords.length > 0 && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-blue-600">{employeeStats.totalDays}</div>
                        <div className="text-xs text-gray-600">Total Days</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-green-600">{employeeStats.presentDays}</div>
                        <div className="text-xs text-gray-600">Present</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-yellow-600">{employeeStats.lateDays}</div>
                        <div className="text-xs text-gray-600">Late</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-orange-600">{employeeStats.earlyDepartureDays}</div>
                        <div className="text-xs text-gray-600">Early Out</div>
                    </div>
                    <div className="bg-red-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-red-600">{employeeStats.absentDays}</div>
                        <div className="text-xs text-gray-600">Absent</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-purple-600">{employeeStats.totalWorkHours.toFixed(1)}</div>
                        <div className="text-xs text-gray-600">Work Hrs</div>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-indigo-600">{employeeStats.totalOvertimeHours.toFixed(1)}</div>
                        <div className="text-xs text-gray-600">OT Hrs</div>
                    </div>
                    <div className="bg-pink-50 p-2 rounded text-center">
                        <div className="text-lg font-bold text-pink-600">
                            {Math.floor(employeeStats.totalLateMinutes / 60)}h {employeeStats.totalLateMinutes % 60}m
                        </div>
                        <div className="text-xs text-gray-600">Total Late</div>
                    </div>
                </div>
            )}

            {/* Records Table */}
            {selectedEmployeeId && (
                <div className="overflow-x-auto border rounded-lg">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : attendanceRecords.length > 0 ? (
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Day</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Clock In</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Clock Out</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Work Hours</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">OT Hours</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Late/Early</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {attendanceRecords.map((record: any) => {
                                    const recordDate = new Date(record.date);
                                    const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'short' });
                                    
                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDate(record.date)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                                {dayName}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono">
                                                {formatTime(record.inTime)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-mono">
                                                {formatTime(record.outTime)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap font-medium">
                                                {record.workHours ? record.workHours.toFixed(2) : '—'} hrs
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-purple-600">
                                                {record.overtimeHours && record.overtimeHours > 0 
                                                    ? `+${record.overtimeHours.toFixed(2)} hrs` 
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {record.lateMinutes > 0 && (
                                                    <span className="text-yellow-600 block text-xs">
                                                        Late: {Math.floor(record.lateMinutes / 60)}h {record.lateMinutes % 60}m
                                                    </span>
                                                )}
                                                {record.earlyDepartureMinutes > 0 && (
                                                    <span className="text-orange-600 block text-xs">
                                                        Early: {Math.floor(record.earlyDepartureMinutes / 60)}h {record.earlyDepartureMinutes % 60}m
                                                    </span>
                                                )}
                                                {!record.lateMinutes && !record.earlyDepartureMinutes && '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                                                {record.checkInMethod || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <div className="text-4xl mb-3">📊</div>
                            <p className="text-lg font-medium">No attendance records found</p>
                            <p className="text-sm mt-1">
                                {selectedEmployee 
                                    ? `No records for ${selectedEmployee.firstName} ${selectedEmployee.lastName} in ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear}`
                                    : 'Select an employee to view their attendance history'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};


const BiometricUploadTab: React.FC = () => {
    const { employees } = useHRData();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        success: number;
        failed: number;
        total: number;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to get employee details
    const getEmployeeDetails = (staffId: string) => {
        const employee = employees.find(emp => emp.staffId === staffId);
        if (!employee) return null;
        
        return {
            name: `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`.replace(/\s+/g, ' ').trim(),
            designation: employee.designation || '—',
            department: employee.department || '—',
            id: employee.id
        };
    };

    // Use API service
    const importAttendance = async (records: any[]) => {
        try {
            console.log('📤 Importing records via API:', records);
            const result = await api.importAttendance(records);
            console.log('📥 Import result:', result);
            return result;
        } catch (error) {
            console.error('❌ API import failed:', error);
            throw error;
        }
    };

    const normalizeEmployeeId = (id: string): string => {
        if (!id) return '';
        return id.replace(/^EMP/i, '').trim();
    };

    // Helper function to parse various date formats
    const parseExcelDate = (dateValue: any): string => {
        if (!dateValue) return '';
        
        const dateStr = dateValue.toString().trim();
        
        // Case 1: Already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        
        // Case 2: YYYY-MM-DD HH:MM:SS format (with time)
        if (/^\d{4}-\d{2}-\d{2}\s/.test(dateStr)) {
            return dateStr.split(' ')[0];
        }
        
        // Case 3: Excel serial date number (e.g., 46078 for 2026-02-24)
        if (/^\d+$/.test(dateStr) && !isNaN(Number(dateStr))) {
            try {
                const excelDate = Number(dateStr);
                // Excel serial date: days since 1900-01-01
                const date = new Date((excelDate - 25569) * 86400 * 1000);
                
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            } catch (e) {
                console.error('Error parsing Excel date:', e);
            }
        }
        
        // Case 4: DD-MM-YYYY format (what Excel might show)
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        }
        
        // Case 5: DD/MM/YYYY format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        }
        
        // Case 6: Try JavaScript Date parsing as last resort
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (e) {
            // Ignore
        }
        
        console.warn('Could not parse date, returning original:', dateStr);
        return dateStr;
    };

    const validateAttendanceData = (data: any[]): string[] => {
        const errors: string[] = [];
        
        const staffIdMap = new Map();
        employees.forEach(emp => {
            if (emp.staffId) {
                staffIdMap.set(emp.staffId, emp.id);
            }
        });

        data.forEach((row, index) => {
            const rowNum = index + 2;
            const rawEmpId = row['Employee ID']?.toString().trim() || '';
            const normalizedId = normalizeEmployeeId(rawEmpId);

            if (!rawEmpId) {
                errors.push(`Row ${rowNum}: Employee ID is required`);
            } else if (!staffIdMap.has(normalizedId)) {
                const validIds = Array.from(staffIdMap.keys());
                errors.push(`Row ${rowNum}: Employee ID "${rawEmpId}" not found. Valid IDs: ${validIds.join(', ')}`);
            }

            // Date validation
            if (!row['Date (YYYY-MM-DD)']) {
                errors.push(`Row ${rowNum}: Date is required`);
            } else {
                const dateStr = row['Date (YYYY-MM-DD)'].toString();
                
                // Check if it's a valid date format after parsing
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(dateStr)) {
                    errors.push(`Row ${rowNum}: Date must be in YYYY-MM-DD format. Found: "${dateStr}"`);
                }
            }

            // Time validation
            if (!row['Clock In Time (HH:MM)']) {
                errors.push(`Row ${rowNum}: Clock In Time is required`);
            } else {
                const timeStr = row['Clock In Time (HH:MM)'].toString();
                
                // Extract time part if it includes date
                let timeToCheck = timeStr;
                if (timeStr.includes(' ')) {
                    const parts = timeStr.split(' ');
                    timeToCheck = parts[parts.length - 1];
                }
                
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(timeToCheck)) {
                    errors.push(`Row ${rowNum}: Clock In Time must be in HH:MM format. Found: "${timeStr}"`);
                }
            }
        });

        return errors;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setValidationErrors([]);
        setUploadStatus(null);
        setIsProcessing(true);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            
            if (!firstSheetName) {
                throw new Error('Excel file has no sheets');
            }
            
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                raw: false
            });

            if (jsonData.length < 2) {
                setValidationErrors(['The Excel file is empty. Please add attendance records.']);
                setIsProcessing(false);
                return;
            }

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];
            
            const formattedData = rows.map(row => {
                const obj: any = {};
                headers.forEach((header, index) => {
                    let value = row[index];
                    
                    if (value === undefined || value === null) {
                        value = '';
                    } else {
                        value = value.toString().trim();
                    }
                    
                    // Special handling for date field
                    if (header === 'Date (YYYY-MM-DD)' && value) {
                        value = parseExcelDate(value);
                    }
                    
                    obj[header] = value;
                });
                return obj;
            }).filter(row => Object.values(row).some(val => val));

            if (formattedData.length === 0) {
                setValidationErrors(['No data rows found in the Excel file.']);
                setIsProcessing(false);
                return;
            }

            // Enrich with employee details
            const enrichedData = formattedData.map(row => {
                const rawEmpId = row['Employee ID']?.toString().trim() || '';
                const normalizedId = normalizeEmployeeId(rawEmpId);
                const employeeDetails = getEmployeeDetails(normalizedId);
                
                return {
                    ...row,
                    _employeeDetails: employeeDetails,
                    _normalizedId: normalizedId
                };
            });

            const errors = validateAttendanceData(formattedData);
            setValidationErrors(errors);
            setPreviewData(enrichedData.slice(0, 5));
            
        } catch (error) {
            console.error('Error reading file:', error);
            setValidationErrors(['Error reading the Excel file. Please ensure it\'s a valid .xlsx file.']);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpload = async () => {
        if (!file || validationErrors.length > 0) return;

        setIsProcessing(true);
        setUploadStatus(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // IMPORTANT: Use the same parsing logic as handleFileChange
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                raw: false
            });

            if (jsonData.length < 2) {
                throw new Error('No data to upload');
            }

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];

            const staffIdMap = new Map();
            employees.forEach(emp => {
                if (emp.staffId) {
                    staffIdMap.set(emp.staffId, emp.id);
                }
            });

            // Parse each row properly with date handling
            const attendanceRecords = rows
                .map(row => {
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        let value = row[index];
                        
                        if (value === undefined || value === null) {
                            value = '';
                        } else {
                            value = value.toString().trim();
                        }
                        
                        // CRITICAL: Parse dates the same way as in handleFileChange
                        if (header === 'Date (YYYY-MM-DD)' && value) {
                            value = parseExcelDate(value);
                        }
                        
                        obj[header] = value;
                    });
                    return obj;
                })
                .filter(row => row['Employee ID'] && row['Date (YYYY-MM-DD)'] && row['Clock In Time (HH:MM)'])
                .map((row: any) => {
                    const rawEmpId = row['Employee ID']?.toString().trim() || '';
                    const normalizedId = normalizeEmployeeId(rawEmpId);
                    const mongoId = staffIdMap.get(normalizedId);
                    
                    return {
                        employeeId: mongoId,
                        date: row['Date (YYYY-MM-DD)'], // Now properly parsed
                        inTime: row['Clock In Time (HH:MM)'],
                        outTime: row['Clock Out Time (HH:MM)'] || undefined,
                        checkInMethod: row['Check In Method'] || 'Biometric',
                        status: row['Status'] || undefined,
                    };
                })
                .filter(record => record.employeeId);

            if (attendanceRecords.length === 0) {
                throw new Error('No valid employee IDs found in the uploaded file');
            }

            console.log('📤 Uploading parsed records:', attendanceRecords);
            
            const result = await importAttendance(attendanceRecords);
            console.log('✅ Upload successful:', result);

            setUploadStatus({
                success: attendanceRecords.length,
                failed: 0,
                total: attendanceRecords.length
            });

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error('❌ Error uploading attendance:', error);
            
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            setUploadStatus({
                success: 0,
                failed: previewData.length,
                total: previewData.length
            });
            
            alert(`❌ Error uploading attendance records: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearFile = () => {
        setFile(null);
        setPreviewData([]);
        setValidationErrors([]);
        setUploadStatus(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        const sampleStaffIds = employees
            .map(emp => emp.staffId)
            .filter(Boolean)
            .slice(0, 2);
        
        const id1 = sampleStaffIds[0] || "YA001";
        const id2 = sampleStaffIds[1] || "YA002";

        const emp1 = employees.find(e => e.staffId === id1);
        const emp2 = employees.find(e => e.staffId === id2);

        const templateData = [
            {
                'Employee ID': id1,
                'Employee Name': emp1 ? `${emp1.firstName} ${emp1.lastName}` : 'John Doe',
                'Designation': emp1?.designation || 'Employee',
                'Date (YYYY-MM-DD)': '2026-02-25',
                'Clock In Time (HH:MM)': '08:00',
                'Clock Out Time (HH:MM)': '19:00',
                'Check In Method': 'Biometric',
                'Status': 'Present'
            },
            {
                'Employee ID': id2,
                'Employee Name': emp2 ? `${emp2.firstName} ${emp2.lastName}` : 'Jane Smith',
                'Designation': emp2?.designation || 'Employee',
                'Date (YYYY-MM-DD)': '2026-02-25',
                'Clock In Time (HH:MM)': '08:15',
                'Clock Out Time (HH:MM)': '18:45',
                'Check In Method': 'Biometric',
                'Status': 'Late'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        
        ws['!cols'] = [
            { wch: 15 },
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        
        XLSX.writeFile(wb, 'Attendance_Template.xlsx');
    };

    const timeToMinutes = (t: string): number => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-1">
                            Bulk Attendance Upload
                        </h3>
                        <p className="text-sm text-blue-700">
                            Upload attendance records from your biometric system or other sources using an Excel file.
                        </p>
                    </div>
                </div>
            </div>

            {/* Template Download Section */}
            <Card title="Step 1: Download Template">
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                        Download the Excel template with the required format.
                    </p>
                    <Button 
                        onClick={handleDownloadTemplate}
                        variant="secondary"
                        className="flex items-center"
                    >
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                        Download Template
                    </Button>
                </div>
            </Card>

            {/* File Upload Section */}
            <Card title="Step 2: Upload Your File">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Excel File (.xlsx)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {file && (
                                <Button 
                                    variant="secondary" 
                                    size="sm"
                                    onClick={handleClearFile}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {isProcessing && (
                        <div className="flex items-center text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                            Processing file...
                        </div>
                    )}

                    {validationErrors.length > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded">
                            <h4 className="font-semibold text-red-800 mb-2">Validation Errors Found</h4>
                            <ul className="text-sm text-red-700 space-y-1 max-h-60 overflow-y-auto">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Enhanced Preview Table */}
                    {previewData.length > 0 && validationErrors.length === 0 && (
                        <div>
                            <h4 className="font-semibold text-sm mb-2 text-gray-700">
                                Preview (First 5 Records)
                            </h4>
                            <div className="overflow-x-auto border rounded">
                                <table className="min-w-full text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Employee ID</th>
                                            <th className="px-3 py-2 text-left">Employee Name</th>
                                            <th className="px-3 py-2 text-left">Designation</th>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Clock In</th>
                                            <th className="px-3 py-2 text-left">Clock Out</th>
                                            <th className="px-3 py-2 text-left">Method</th>
                                            <th className="px-3 py-2 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, idx) => {
                                            const empDetails = row._employeeDetails;
                                            const isMissingEmployee = !empDetails;
                                            
                                            return (
                                                <tr key={idx} className={`border-t hover:bg-gray-50 ${isMissingEmployee ? 'bg-red-50' : ''}`}>
                                                    <td className="px-3 py-2 font-mono">
                                                        {row['Employee ID']}
                                                        {isMissingEmployee && (
                                                            <span className="ml-2 text-red-500" title="Employee not found in system">⚠️</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {empDetails ? (
                                                            <div>
                                                                <span className="font-medium">{empDetails.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-red-500 italic">Not found</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {empDetails?.designation || '—'}
                                                    </td>
                                                    <td className="px-3 py-2">{row['Date (YYYY-MM-DD)']}</td>
                                                    <td className="px-3 py-2 font-mono">{row['Clock In Time (HH:MM)']}</td>
                                                    <td className="px-3 py-2 font-mono">{row['Clock Out Time (HH:MM)'] || '—'}</td>
                                                    <td className="px-3 py-2">{row['Check In Method'] || 'Biometric'}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                            row['Status'] === 'Present' ? 'bg-green-100 text-green-800' :
                                                            row['Status'] === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                                                            row['Status'] === 'Absent' ? 'bg-red-100 text-red-800' :
                                                            row['Status'] === 'On Leave' ? 'bg-blue-100 text-blue-800' :
                                                            row['Status'] === 'Early Departure' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {row['Status'] || 'Auto'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Summary statistics */}
                            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-blue-50 p-2 rounded">
                                    <span className="font-semibold">Total Records:</span> {previewData.length}
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                    <span className="font-semibold">Valid Employees:</span> {
                                        previewData.filter(r => r._employeeDetails).length
                                    }
                                </div>
                                <div className="bg-yellow-50 p-2 rounded">
                                    <span className="font-semibold">Missing Employees:</span> {
                                        previewData.filter(r => !r._employeeDetails).length
                                    }
                                </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-2">
                                Showing {previewData.length} records • All records will be uploaded
                            </p>
                        </div>
                    )}

                    {file && validationErrors.length === 0 && (
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleUpload}
                                disabled={isProcessing}
                                className="flex items-center"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                                        Upload Attendance Records
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Enhanced Upload Status with Details */}
                    {uploadStatus && (
                        <div className="space-y-3">
                            <div className={`p-4 rounded border ${
                                uploadStatus.failed === 0 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-yellow-50 border-yellow-200'
                            }`}>
                                <h4 className={`font-semibold mb-2 flex items-center ${
                                    uploadStatus.failed === 0 ? 'text-green-800' : 'text-yellow-800'
                                }`}>
                                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Upload Complete
                                </h4>
                                <div className="text-sm space-y-1">
                                    <p className="text-gray-700">
                                        ✓ Successfully uploaded: <strong>{uploadStatus.success}</strong> records
                                    </p>
                                    {uploadStatus.failed > 0 && (
                                        <p className="text-red-700">
                                            ✗ Failed: <strong>{uploadStatus.failed}</strong> records
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Uploaded Records Summary */}
                            {uploadStatus.success > 0 && (
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b">
                                        <h5 className="font-semibold text-sm">Recently Uploaded Records</h5>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="min-w-full text-xs">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Employee</th>
                                                    <th className="px-3 py-2 text-left">Designation</th>
                                                    <th className="px-3 py-2 text-left">Date</th>
                                                    <th className="px-3 py-2 text-left">In</th>
                                                    <th className="px-3 py-2 text-left">Out</th>
                                                    <th className="px-3 py-2 text-left">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.map((row, idx) => {
                                                    const empDetails = row._employeeDetails;
                                                    if (!empDetails) return null;
                                                    
                                                    return (
                                                        <tr key={idx} className="border-t hover:bg-gray-50">
                                                            <td className="px-3 py-2">
                                                                <div>
                                                                    <div className="font-medium">{empDetails.name}</div>
                                                                    <div className="text-gray-500 text-2xs">ID: {row['Employee ID']}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2">{empDetails.designation}</td>
                                                            <td className="px-3 py-2">{row['Date (YYYY-MM-DD)']}</td>
                                                            <td className="px-3 py-2 font-mono">{row['Clock In Time (HH:MM)']}</td>
                                                            <td className="px-3 py-2 font-mono">{row['Clock Out Time (HH:MM)'] || '—'}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                                    row['Status'] === 'Present' ? 'bg-green-100 text-green-800' :
                                                                    row['Status'] === 'Late' ? 'bg-yellow-100 text-yellow-800' :
                                                                    row['Status'] === 'Absent' ? 'bg-red-100 text-red-800' :
                                                                    row['Status'] === 'On Leave' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {row['Status'] || 'Present'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};


// ─── Main Page ────────────────────────────────────────────────────────────────

const AttendancePage: React.FC = () => {
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageAttendance');
    const [activeTab, setActiveTab] = useState(canManage ? 'dashboard' : 'myAttendance');

    // Save active tab to localStorage for persistence
    useEffect(() => {
        localStorage.setItem('attendance_active_tab', activeTab);
    }, [activeTab]);

    // Load saved tab on mount
    useEffect(() => {
        const savedTab = localStorage.getItem('attendance_active_tab');
        if (savedTab) {
            // Check if the saved tab is valid for the current user
            const isValidTab = (canManage && ['dashboard', 'scheduler', 'holidays', 'history', 'upload', 'myAttendance', 'log'].includes(savedTab)) ||
                              (!canManage && ['myAttendance', 'log'].includes(savedTab));
            
            if (isValidTab) {
                setActiveTab(savedTab);
            }
        }
    }, [canManage]);

    const tabs = [
        // Manager-only tabs
        ...(canManage ? [
            { id: 'dashboard', label: 'Manager Dashboard' },
            { id: 'history', label: 'Employee History' },
            { id: 'scheduler', label: 'Shift Scheduler' },
            { id: 'holidays', label: 'Holiday Calendar' },
            { id: 'upload', label: 'Biometric Upload' },
        ] : []),
        
        // Tabs for all users
        { id: 'myAttendance', label: 'My Attendance' },
    ];

    return (
        <div className="space-y-6">
            <Card>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}   
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="pt-6">
                    {activeTab === 'dashboard' && canManage && <ManagerDashboardTab />}
                    {activeTab === 'myAttendance' && <MyAttendanceTab />}
                    {activeTab === 'history' && canManage && <EmployeeAttendanceHistory />}
                    {activeTab === 'scheduler' && canManage && <ShiftSchedulerTab />}
                    {activeTab === 'holidays' && canManage && <HolidaysTab />}
                    {activeTab === 'upload' && canManage && <BiometricUploadTab />}
                </div>
            </Card>
        </div>
    );
};

export default AttendancePage;