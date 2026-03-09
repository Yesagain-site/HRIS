import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Button, Modal, Input, Select, Textarea } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon, 
  BellIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  CalendarDaysIcon,  
  CurrencyDollarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '../components/Icons';

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'Approved':
      case 'Resigned': // Add this
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: CheckCircleIcon,
          label: status // This will show "Resigned" for resignation requests
        };
      case 'Under Resignation': // Add this
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          icon: ClockIcon,
          label: 'Under Resignation'
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          icon: XCircleIcon,
          label: 'Rejected'
        };
      default:
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: ClockIcon,
          label: 'Pending'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </span>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  total: number;
  pending: number;
  icon: React.FC<any>;
  color: string;
}> = ({ title, total, pending, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl bg-${color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      {pending > 0 && (
        <span className={`px-2.5 py-1 bg-${color}-100 text-${color}-700 rounded-full text-xs font-semibold`}>
          {pending} pending
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-1">{total}</h3>
    <p className="text-sm text-gray-500">{title}</p>
  </div>
);

// Request Card Component
const RequestCard: React.FC<{
  request: any;
  type: string;
  canManage: boolean;
  onApprove: (id: string, reason?: string) => void;
  onReject: (id: string, reason?: string) => void;
}> = ({ request, type, canManage, onApprove, onReject }) => {
  const getRequestIcon = () => {
    switch (type) {
      case 'leave': return CalendarDaysIcon;
      case 'permission': return ClockIcon;
      case 'cash': return CurrencyDollarIcon;
      case 'resignation': return DocumentTextIcon;
      default: return BriefcaseIcon;
    }
  };

  // ✅ ADD THIS HELPER FUNCTION
  const getDisplayStatus = () => {
    if (type === 'resignation') {
      if (request.status === 'Pending') return 'Under Resignation';
      if (request.status === 'Approved') return 'Resigned';
    }
    return request.status;
  };

  const getRequestDetails = () => {
    switch (type) {
      case 'leave':
        return {
          title: `${request.leaveType || 'Leave'} Request`,
          subtitle: request.startDate && request.endDate 
            ? `${request.startDate} → ${request.endDate}`
            : 'Dates not specified',
          details: [
            { label: 'Employee', value: request.employeeName || 'Unknown', icon: UserGroupIcon },
            { label: 'Reason', value: request.reason || 'No reason provided', icon: DocumentTextIcon },
            { label: 'Status', value: request.status || 'Pending', icon: ClockIcon }
          ]
        };
      case 'permission':
        return {
          title: 'Permission Request',
          subtitle: request.permissionDate || request.date 
            ? `${request.permissionDate || request.date} • ${request.startTime || '?'} - ${request.endTime || '?'}`
            : 'Date not specified',
          details: [
            { label: 'Employee', value: request.employeeName || 'Unknown', icon: UserGroupIcon },
            { label: 'Reason', value: request.reason || 'No reason provided', icon: DocumentTextIcon },
            { label: 'Time', value: request.startTime && request.endTime 
              ? `${request.startTime} - ${request.endTime}` 
              : 'Not specified', 
              icon: ClockIcon 
            }
          ]
        };
      case 'cash':
        return {
          title: 'Cash Advance',
          subtitle: request.amount 
            ? `AED ${typeof request.amount === 'number' ? request.amount.toLocaleString() : request.amount}`
            : 'Amount not specified',
          details: [
            { label: 'Employee', value: request.employeeName || 'Unknown', icon: UserGroupIcon },
            { label: 'Repayment', value: request.repaymentDate || request.repaymentStartDate || 'Not specified', icon: CalendarDaysIcon },
            { label: 'Reason', value: request.reason || 'No reason provided', icon: DocumentTextIcon }
          ]
        };
      case 'resignation':
        return {
          title: 'Resignation',
          subtitle: request.proposedLastDay || request.lastWorkingDate 
            ? `Last Day: ${request.proposedLastDay || request.lastWorkingDate}`
            : 'Last day not specified',
          details: [
            { label: 'Employee', value: request.employeeName || 'Unknown', icon: UserGroupIcon },
            { label: 'Reason', value: request.reason || 'No reason provided', icon: DocumentTextIcon },
            { label: 'Status', value: request.status || 'Submitted', icon: ClockIcon }
          ]
        };
      default:
        return { 
          title: 'Service Request', 
          subtitle: '', 
          details: [
            { label: 'Employee', value: request.employeeName || 'Unknown', icon: UserGroupIcon }
          ] 
        };
    }
  };

  const Icon = getRequestIcon();
  const details = getRequestDetails();
  const displayStatus = getDisplayStatus(); // ✅ USE THE HELPER FUNCTION

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{details.title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{details.subtitle}</p>
          </div>
        </div>
        {/* ✅ USE displayStatus INSTEAD OF request.status */}
        <StatusBadge status={displayStatus} />
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4 bg-gray-50 rounded-xl p-3">
        {details.details.map((detail, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <detail.icon className="h-4 w-4 text-gray-400 mt-0.5" />
            <span className="text-gray-500 min-w-[70px]">{detail.label}:</span>
            <span className="text-gray-900 font-medium flex-1">{detail.value || '-'}</span>
          </div>
        ))}

        {/* Show manager notes if available */}
        {request.managerNotes && request.status !== 'Pending' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-start gap-2 text-sm">
              <DocumentTextIcon className="h-4 w-4 text-gray-400 mt-0.5" />
              <span className="text-gray-500 min-w-[70px]">Manager Notes:</span>
              <span className="text-gray-900 font-medium flex-1">{request.managerNotes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {canManage && request.status === 'Pending' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove(request.id)}
            className="flex-1 px-4 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-2 group"
          >
            <CheckCircleIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Approve</span>
          </button>
          <button
            onClick={() => {
              const reason = prompt('Enter rejection reason:');
              if (reason) onReject(request.id, reason);
            }}
            className="flex-1 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-2 group"
          >
            <XCircleIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Reject</span>
          </button>
        </div>
      )}
    </div>
  );
};

// --- New Request Modal ---
export const NewRequestModal: React.FC<{
  isOpen: boolean,
  onClose: () => void,
}> = ({ isOpen, onClose }) => {
  const { 
    addLeaveRequest, 
    addPermissionRequest, 
    addCashAdvanceRequest, 
    addResignationRequest,
    loadServiceRequests
  } = useHRData();
  const { employeeDetails } = useAuth();
  const [requestType, setRequestType] = useState('leave');
  const [formData, setFormData] = useState<any>({ reason: '' });
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({ reason: '' });
      setRequestType('leave');
      setTimeError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (requestType === 'permission' && formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        setTimeError('Start time must be before end time');
      } else {
        setTimeError(null);
      }
    } else {
      setTimeError(null);
    }
  }, [formData.startTime, formData.endTime, requestType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeError) return;
    if (!employeeDetails) {
      alert("Please log in to submit a request");
      return;
    }
    
    const employeeName = `${employeeDetails.firstName || ''} ${employeeDetails.middleName || ''} ${employeeDetails.lastName || ''}`.trim();
    
    try {
      switch (requestType) {
        case 'leave':
          await addLeaveRequest({ 
            employeeId: employeeDetails.id,
            employeeName,
            leaveType: formData.leaveType || 'Annual', 
            startDate: formData.startDate, 
            endDate: formData.endDate,
            reason: formData.reason || ''
          });
          break;
        case 'permission':
          await addPermissionRequest({ 
            employeeId: employeeDetails.id,
            employeeName,
            permissionDate: formData.permissionDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            reason: formData.reason || ''
          });
          break;
        case 'cash':
          await addCashAdvanceRequest({ 
            employeeId: employeeDetails.id,
            employeeName,
            amount: parseFloat(formData.amount) || 0,
            repaymentDate: formData.repaymentDate,
            reason: formData.reason || ''
          });
          break;
        case 'resignation':
          await addResignationRequest({ 
            employeeId: employeeDetails.id,
            employeeName,
            proposedLastDay: formData.proposedLastDay,
            reason: formData.reason || ''
          });
          break;
      }
      
      // Reload service requests to show the new request
      await loadServiceRequests();
      
      alert('Request submitted successfully!');
      onClose();
    } catch (error) {
      console.error("Failed to submit request", error);
      alert("There was an error submitting your request. Please try again.");
    }
  };

  const getIcon = () => {
    switch (requestType) {
      case 'leave': return '🏖️';
      case 'permission': return '⏱️';
      case 'cash': return '💰';
      case 'resignation': return '📄';
      default: return '📋';
    }
  };

  const renderFormFields = () => {
    switch (requestType) {
      case 'leave':
        return (
          <div className="space-y-5">
            <Select 
              label="Leave Type" 
              name="leaveType" 
              value={formData.leaveType || 'Annual'} 
              onChange={e => setFormData(p => ({...p, leaveType: e.target.value}))}
            >
              <option>Annual Leave</option>
              <option>Sick Leave</option>
              <option>Emergency Leave</option>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Start Date" 
                name="startDate" 
                type="date" 
                value={formData.startDate || ''} 
                onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} 
                required 
              />
              <Input 
                label="End Date" 
                name="endDate" 
                type="date" 
                value={formData.endDate || ''} 
                onChange={e => setFormData(p => ({...p, endDate: e.target.value}))} 
                required 
              />
            </div>
            <Textarea 
              label="Reason for Leave" 
              name="reason" 
              value={formData.reason || ''} 
              onChange={e => setFormData(p => ({...p, reason: e.target.value}))} 
              required 
              placeholder="Please provide details about your leave request..."
            />
          </div>
        );
      case 'permission':
        return (
          <div className="space-y-5">
            <Input 
              label="Date" 
              name="permissionDate" 
              type="date" 
              value={formData.permissionDate || ''} 
              onChange={e => setFormData(p => ({...p, permissionDate: e.target.value}))} 
              required 
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Start Time" 
                name="startTime" 
                type="time" 
                value={formData.startTime || ''} 
                onChange={e => setFormData(p => ({...p, startTime: e.target.value}))} 
                required 
              />
              <Input 
                label="End Time" 
                name="endTime" 
                type="time" 
                value={formData.endTime || ''} 
                onChange={e => setFormData(p => ({...p, endTime: e.target.value}))} 
                required 
              />
            </div>
            {timeError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-sm text-rose-600 flex items-center gap-2">
                  <XCircleIcon className="h-4 w-4" />
                  {timeError}
                </p>
              </div>
            )}
            <Textarea 
              label="Reason for Permission" 
              name="reason" 
              value={formData.reason || ''} 
              onChange={e => setFormData(p => ({...p, reason: e.target.value}))} 
              required 
              placeholder="Please explain why you need this permission..."
            />
          </div>
        );
      case 'cash':
        return (
          <div className="space-y-5">
            <Input 
              label="Amount (AED)" 
              name="amount" 
              type="number" 
              value={formData.amount || ''} 
              onChange={e => setFormData(p => ({...p, amount: e.target.value}))} 
              required 
              placeholder="0.00"
            />
            <Input 
              label="Proposed Repayment Date" 
              name="repaymentDate" 
              type="date" 
              value={formData.repaymentDate || ''} 
              onChange={e => setFormData(p => ({...p, repaymentDate: e.target.value}))} 
              required 
            />
            <Textarea 
              label="Reason for Cash Advance" 
              name="reason" 
              value={formData.reason || ''} 
              onChange={e => setFormData(p => ({...p, reason: e.target.value}))} 
              required 
              placeholder="Please explain why you need this cash advance..."
            />
          </div>
        );
      case 'resignation':
        return (
          <div className="space-y-5">
            <Input 
              label="Proposed Last Working Day" 
              name="proposedLastDay" 
              type="date" 
              value={formData.proposedLastDay || ''} 
              onChange={e => setFormData(p => ({...p, proposedLastDay: e.target.value}))} 
              required 
            />
            <Textarea 
              label="Reason for Resignation" 
              name="reason" 
              value={formData.reason || ''} 
              onChange={e => setFormData(p => ({...p, reason: e.target.value}))} 
              required 
              placeholder="Please provide your reason for resigning..."
            />
          </div>
        );
      default: return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Service Request">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Type Selector */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-5 rounded-xl">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Request Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'leave', label: 'Leave', icon: '🏖️' },
              { value: 'permission', label: 'Permission', icon: '⏱️' },
              { value: 'cash', label: 'Cash Advance', icon: '💰' },
              { value: 'resignation', label: 'Resignation', icon: '📄' }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setRequestType(option.value); setFormData({ reason: '' }); }}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  requestType === option.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className="border-t border-gray-100 pt-6">
          {renderFormFields()}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!!timeError}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// --- Main Page Component ---
const EmployeeServicesPage: React.FC = () => {
  const { 
    employees,
    leaveRequests, 
    permissionRequests, 
    cashAdvanceRequests, 
    resignationRequests,
    updateRequestStatus,
    loadServiceRequests 
  } = useHRData();
  
  const { employeeDetails, hasPermission, currentUser, isAdmin, isManager } = useAuth();
  const canManage = hasPermission('canManageServiceRequests') || 
                  currentUser?.email === 'hr@yesagain.com' || 
                  isAdmin || 
                  isManager;
  const isHR = currentUser?.email === 'hr@yesagain.com' || isAdmin || isManager;
  
  const [activeTab, setActiveTab] = useState<'leave' | 'permission' | 'cash' | 'resignation'>('leave');
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dataLoadedRef = useRef(false);
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
      type: 'leave' | 'permission' | 'cash' | 'resignation';
      id: string;
      action: 'approve' | 'reject';
      reason?: string;
  } | null>(null);

  useEffect(() => {
      let isMounted = true;
      
      const loadData = async () => {
          if (dataLoadedRef.current) {
              console.log('📊 Data already loaded, skipping...');
              return;
          }
          
          try {
              setLoading(true);
              console.log('📊 Starting to load service requests...');
              
              await loadServiceRequests();
              
              if (isMounted) {
                  dataLoadedRef.current = true;
                  console.log('✅ Service requests loaded in page');
              }
          } catch (error) {
              console.error('Error loading service requests:', error);
          } finally {
              if (isMounted) {
                  setLoading(false);
                  console.log('🔄 Loading set to false');
              }
          }
      };
      
      loadData();
      
      return () => {
          isMounted = false;
      };
  }, [loadServiceRequests]);

  const employeeMap = useMemo(() => {
    try {
      if (!Array.isArray(employees)) return new Map();
      return new Map(employees.map(e => [e.id, `${e.firstName} ${e.lastName}`]));
    } catch (error) {
      console.error('Error creating employee map:', error);
      return new Map();
    }
  }, [employees]);

  const requestsToShow = useMemo(() => {
    try {
      const filterFn = (req: any) => {
        if (!req) return false;
        return isHR || req.employeeId === employeeDetails?.id;
      };
      
      const safeSort = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.filter(filterFn).sort((a, b) => {
          try {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          } catch {
            return 0;
          }
        });
      };
      
      return {
        leave: safeSort(leaveRequests || []),
        permission: safeSort(permissionRequests || []),
        cash: safeSort(cashAdvanceRequests || []),
        resignation: safeSort(resignationRequests || []),
      };
    } catch (error) {
      console.error('Error filtering requests:', error);
      return {
        leave: [],
        permission: [],
        cash: [],
        resignation: [],
      };
    }
  }, [leaveRequests, permissionRequests, cashAdvanceRequests, resignationRequests, isHR, employeeDetails]);

  const handleUpdateRequest = async (
    type: 'leave' | 'permission' | 'cash' | 'resignation', 
    id: string, 
    action: 'approve' | 'reject', 
    reason?: string
  ) => {
    try {
      if (!id) {
        alert('Invalid request ID');
        return;
      }
      
      const status = action === 'approve' ? 'Approved' : 'Rejected';
      await updateRequestStatus(type, id, status, reason);
      alert(`Request ${action}d successfully!`);
      
      dataLoadedRef.current = false;
      await loadServiceRequests();
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
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                    <span className="text-4xl">{pendingAction.action === 'approve' ? '✅' : '⚠️'}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {pendingAction.action === 'approve' ? 'Approve Request' : 'Reject Request'}
                </h3>
                <p className="text-gray-600 mb-6">
                    {pendingAction.action === 'approve' 
                        ? 'Are you sure you want to approve this request?' 
                        : 'Are you sure you want to reject this request?'}
                </p>
                {pendingAction.reason && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6 text-left">
                        <p className="text-sm text-amber-700">
                            <span className="font-semibold">Rejection reason:</span> {pendingAction.reason}
                        </p>
                    </div>
                )}
                <div className="flex justify-end gap-3">
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

  const renderContent = (type: 'leave' | 'permission' | 'cash' | 'resignation') => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 mt-4">Loading requests...</p>
        </div>
      );
    }

    let data: any[] = [];
    let icon: React.FC<any>;
    let title: string;
    
    switch(type) {
      case 'leave': 
        data = requestsToShow.leave || []; 
        icon = CalendarDaysIcon;  // Fixed: Changed from CalendarIcon
        title = 'Leave Requests';
        break;
      case 'permission': 
        data = requestsToShow.permission || []; 
        icon = ClockIcon;
        title = 'Permission Slips';
        break;
      case 'cash': 
        data = requestsToShow.cash || []; 
        icon = CurrencyDollarIcon;
        title = 'Cash Advances';
        break;
      case 'resignation': 
        data = requestsToShow.resignation || []; 
        icon = DocumentTextIcon;
        title = 'Resignations';
        break;
      default: return null;
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No {title.toLowerCase()}</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            There are no {title.toLowerCase()} to display. Click the button below to create a new request.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((req) => (
          <RequestCard
            key={req.id}
            request={req}
            type={type}
            canManage={canManage}
            onApprove={(id) => {
              setPendingAction({ type, id, action: 'approve' });
              setShowConfirmModal(true);
            }}
            onReject={(id, reason) => {
              setPendingAction({ type, id, action: 'reject', reason });
              setShowConfirmModal(true);
            }}
          />
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'leave', label: 'Leave Requests', icon: CalendarDaysIcon, color: 'indigo' },  // Fixed: Changed from CalendarIcon
    { id: 'permission', label: 'Permission Slips', icon: ClockIcon, color: 'emerald' },
    { id: 'cash', label: 'Cash Advances', icon: CurrencyDollarIcon, color: 'amber' },
    { id: 'resignation', label: 'Resignations', icon: DocumentTextIcon, color: 'rose' }
  ] as const;

  const getPendingCount = (type: string) => {
    switch(type) {
      case 'leave': return requestsToShow.leave.filter(r => r.status === 'Pending').length;
      case 'permission': return requestsToShow.permission.filter(r => r.status === 'Pending').length;
      case 'cash': return requestsToShow.cash.filter(r => r.status === 'Pending').length;
      case 'resignation': return requestsToShow.resignation.filter(r => r.status === 'Pending').length;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {renderConfirmationModal()}
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Services</h1>
              <p className="text-gray-600">
                {isHR 
                  ? 'Manage and review all employee service requests' 
                  : 'Submit and track your service requests'}
              </p>
            </div>
            <Button
              onClick={() => setIsNewRequestModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/30 px-6 py-3 rounded-xl text-base"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Request
            </Button>
          </div>
        </div>

        {/* Stats Cards for HR */}
        {isHR && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Leave Requests"
              total={requestsToShow.leave.length}
              pending={requestsToShow.leave.filter(r => r.status === 'Pending').length}
              icon={CalendarDaysIcon}  // Fixed: Changed from CalendarIcon
              color="indigo"
            />
            <StatCard
              title="Permission Slips"
              total={requestsToShow.permission.length}
              pending={requestsToShow.permission.filter(r => r.status === 'Pending').length}
              icon={ClockIcon}
              color="emerald"
            />
            <StatCard
              title="Cash Advances"
              total={requestsToShow.cash.length}
              pending={requestsToShow.cash.filter(r => r.status === 'Pending').length}
              icon={CurrencyDollarIcon}
              color="amber"
            />
            <StatCard
              title="Resignations"
              total={requestsToShow.resignation.length}
              pending={requestsToShow.resignation.filter(r => r.status === 'Pending').length}
              icon={DocumentTextIcon}
              color="rose"
            />
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100 bg-gray-50/50 px-6">
            <nav className="flex space-x-1" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const pendingCount = getPendingCount(tab.id);
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all
                      ${isActive 
                        ? `text-${tab.color}-600 border-b-2 border-${tab.color}-600 bg-white` 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? `text-${tab.color}-600` : 'text-gray-400'}`} />
                    <span>{tab.label}</span>
                    {isHR && pendingCount > 0 && (
                      <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-${tab.color}-100 text-${tab.color}-700`}>
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'leave' && renderContent('leave')}
            {activeTab === 'permission' && renderContent('permission')}
            {activeTab === 'cash' && renderContent('cash')}
            {activeTab === 'resignation' && renderContent('resignation')}
          </div>
        </div>
      </div>

      <NewRequestModal isOpen={isNewRequestModalOpen} onClose={() => setIsNewRequestModalOpen(false)} />
    </div>
  );
};

export default EmployeeServicesPage;