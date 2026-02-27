import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, Button, Modal, Input, Select, Textarea } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon } from '../components/Icons';

// --- New Request Modal (exported for AttendancePage) ---
export const NewRequestModal: React.FC<{
  isOpen: boolean,
  onClose: () => void,
}> = ({ isOpen, onClose }) => {
  const { 
    addLeaveRequest, 
    addPermissionRequest, 
    addCashAdvanceRequest, 
    addResignationRequest 
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
        setTimeError('Start time must be before end time.');
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
      alert("Please log in to submit a request.");
      return;
    }
    
    const employeeName = `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim();
    
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
      alert('Request submitted successfully!');
      onClose();
    } catch (error) {
      console.error("Failed to submit request", error);
      alert("There was an error submitting your request. Please try again.");
    }
  };

  const renderFormFields = () => {
    switch (requestType) {
      case 'leave':
        return <>
          <Select label="Leave Type" name="leaveType" value={formData.leaveType || 'Annual'} onChange={e => setFormData(p => ({...p, leaveType: e.target.value}))}>
            <option>Annual</option><option>Sick</option><option>Emergency</option>
          </Select>
          <Input label="Start Date" name="startDate" type="date" value={formData.startDate || ''} onChange={e => setFormData(p => ({...p, startDate: e.target.value}))} required />
          <Input label="End Date" name="endDate" type="date" value={formData.endDate || ''} onChange={e => setFormData(p => ({...p, endDate: e.target.value}))} required />
          <Textarea label="Reason" name="reason" value={formData.reason || ''} onChange={e => setFormData(p => ({...p, reason: e.target.value}))} required />
        </>;
      case 'permission':
        return <>
          <Input label="Date" name="permissionDate" type="date" value={formData.permissionDate || ''} onChange={e => setFormData(p => ({...p, permissionDate: e.target.value}))} required />
          <Input label="Start Time" name="startTime" type="time" value={formData.startTime || ''} onChange={e => setFormData(p => ({...p, startTime: e.target.value}))} required />
          <Input label="End Time" name="endTime" type="time" value={formData.endTime || ''} onChange={e => setFormData(p => ({...p, endTime: e.target.value}))} required />
          {timeError && <p className="text-sm text-red-600">{timeError}</p>}
          <Textarea label="Reason" name="reason" value={formData.reason || ''} onChange={e => setFormData(p => ({...p, reason: e.target.value}))} required />
        </>;
      case 'cash':
        return <>
          <Input label="Amount (AED)" name="amount" type="number" value={formData.amount || ''} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} required />
          <Input label="Proposed Repayment Date" name="repaymentDate" type="date" value={formData.repaymentDate || ''} onChange={e => setFormData(p => ({...p, repaymentDate: e.target.value}))} required />
          <Textarea label="Reason" name="reason" value={formData.reason || ''} onChange={e => setFormData(p => ({...p, reason: e.target.value}))} required />
        </>;
      case 'resignation':
        return <>
          <Input label="Proposed Last Working Day" name="proposedLastDay" type="date" value={formData.proposedLastDay || ''} onChange={e => setFormData(p => ({...p, proposedLastDay: e.target.value}))} required />
          <Textarea label="Reason for Resignation" name="reason" value={formData.reason || ''} onChange={e => setFormData(p => ({...p, reason: e.target.value}))} required />
        </>;
      default: return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit New Service Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Request Type" value={requestType} onChange={e => { setRequestType(e.target.value); setFormData({ reason: '' }); }}>
          <option value="leave">Leave Request</option>
          <option value="permission">Permission Request</option>
          <option value="cash">Cash Advance</option>
          <option value="resignation">Resignation</option>
        </Select>
        <hr />
        {renderFormFields()}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!!timeError}>Submit Request</Button>
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
  
  const { employeeDetails, hasPermission } = useAuth();
  const canManage = hasPermission('canManageServiceRequests');
  
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

  useEffect(() => {
      console.log('📊 Loading state changed to:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('📊 leaveRequests in page:', leaveRequests);
    console.log('📊 permissionRequests in page:', permissionRequests);
    console.log('📊 cashAdvanceRequests in page:', cashAdvanceRequests);
    console.log('📊 resignationRequests in page:', resignationRequests);
  }, [leaveRequests, permissionRequests, cashAdvanceRequests, resignationRequests]);

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
        return canManage || req.employeeId === employeeDetails?.id;
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
  }, [leaveRequests, permissionRequests, cashAdvanceRequests, resignationRequests, canManage, employeeDetails]);

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

  const renderTable = (type: 'leave' | 'permission' | 'cash' | 'resignation') => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    let headers: string[] = [];
    let data: any[] = [];
    let renderRow: (req: any) => React.ReactNode;

    switch(type) {
      case 'leave':
        headers = [canManage && 'Employee', 'Type', 'Dates', 'Reason', 'Status', 'Manager Notes'].filter(Boolean) as string[];
        data = requestsToShow.leave || [];
        renderRow = (req: any) => (
          <>
            {canManage && <td className="px-4 py-3">{employeeMap.get(req.employeeId) || 'Unknown'}</td>}
            <td className="px-4 py-3">{req.leaveType || '-'}</td>
            <td className="px-4 py-3">{req.startDate || ''} to {req.endDate || ''}</td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.reason}>{req.reason || '-'}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                {req.status || 'Pending'}
              </span>
            </td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.managerNotes}>{req.managerNotes || '-'}</td>
          </>
        );
        break;
      case 'permission':
        headers = [canManage && 'Employee', 'Date', 'Time', 'Reason', 'Status', 'Manager Notes'].filter(Boolean) as string[];
        data = requestsToShow.permission || [];
        renderRow = (req: any) => (
          <>
            {canManage && <td className="px-4 py-3">{employeeMap.get(req.employeeId) || 'Unknown'}</td>}
            <td className="px-4 py-3">{req.permissionDate || '-'}</td>
            <td className="px-4 py-3">{req.startTime || ''} to {req.endTime || ''}</td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.reason}>{req.reason || '-'}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                {req.status || 'Pending'}
              </span>
            </td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.managerNotes}>{req.managerNotes || '-'}</td>
          </>
        );
        break;
      case 'cash':
        headers = [canManage && 'Employee', 'Amount', 'Repayment Date', 'Reason', 'Status', 'Manager Notes'].filter(Boolean) as string[];
        data = requestsToShow.cash || [];
        renderRow = (req: any) => (
          <>
            {canManage && <td className="px-4 py-3">{employeeMap.get(req.employeeId) || 'Unknown'}</td>}
            <td className="px-4 py-3">
              AED {req.amount ? req.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </td>
            <td className="px-4 py-3">{req.repaymentDate || '-'}</td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.reason}>{req.reason || '-'}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                {req.status || 'Pending'}
              </span>
            </td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.managerNotes}>{req.managerNotes || '-'}</td>
          </>
        );
        break;
      case 'resignation':
        headers = [canManage && 'Employee', 'Proposed Last Day', 'Reason', 'Status', 'Manager Notes'].filter(Boolean) as string[];
        data = requestsToShow.resignation || [];
        renderRow = (req: any) => (
          <>
            {canManage && <td className="px-4 py-3">{employeeMap.get(req.employeeId) || 'Unknown'}</td>}
            <td className="px-4 py-3">{req.proposedLastDay || '-'}</td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.reason}>{req.reason || '-'}</td>
            <td className="px-4 py-3">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>
                {req.status || 'Pending'}
              </span>
            </td>
            <td className="px-4 py-3 max-w-xs truncate" title={req.managerNotes}>{req.managerNotes || '-'}</td>
          </>
        );
        break;
    }

    if (canManage) headers.push('Actions');
    
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((h, index) => (
                            <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.length > 0 ? (
                        data.map((req, index) => (
                            <tr key={req.id || index}>
                                {renderRow(req)}
                                {canManage && req.status === 'Pending' && (
                                    <td className="px-4 py-3">
                                        <div className="flex space-x-2">
                                            <Button 
                                                size="sm" 
                                                onClick={() => {
                                                    setPendingAction({
                                                        type,
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
                                                variant="secondary" 
                                                onClick={() => {
                                                    const reason = prompt('Enter rejection reason:');
                                                    if (reason) {
                                                        setPendingAction({
                                                            type,
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
                                    </td>
                                )}
                                {canManage && req.status !== 'Pending' && (
                                    <td className="px-4 py-3 text-gray-400">—</td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length} className="px-4 py-6 text-center text-gray-500">
                                No {type} requests found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6 p-4">
      {renderConfirmationModal()}
      
      <Card>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Employee Service Requests</h1>
          <Button onClick={() => setIsNewRequestModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-1" /> New Request
          </Button>
        </div>
      </Card>

      <Card>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('leave')}
              className={`${activeTab === 'leave' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Leave Requests
            </button>
            <button 
              onClick={() => setActiveTab('permission')}
              className={`${activeTab === 'permission' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Permission Slips
            </button>
            <button 
              onClick={() => setActiveTab('cash')}
              className={`${activeTab === 'cash' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Cash Advance
            </button>
            <button 
              onClick={() => setActiveTab('resignation')}
              className={`${activeTab === 'resignation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Resignations
            </button>
          </nav>
        </div>
        <div className="pt-4">
          {activeTab === 'leave' && renderTable('leave')}
          {activeTab === 'permission' && renderTable('permission')}
          {activeTab === 'cash' && renderTable('cash')}
          {activeTab === 'resignation' && renderTable('resignation')}
        </div>
      </Card>

      <NewRequestModal isOpen={isNewRequestModalOpen} onClose={() => setIsNewRequestModalOpen(false)} />
    </div>
  );
};

export default EmployeeServicesPage;