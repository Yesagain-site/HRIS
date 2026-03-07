import React, { useState, useEffect } from 'react';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { BellIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';  

const NotificationPage: React.FC = () => {
  const { 
    leaveRequests, 
    permissionRequests, 
    cashAdvanceRequests, 
    resignationRequests,
    loadServiceRequests 
  } = useHRData();
  
  const { currentUser, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const isHR = currentUser?.email === 'hr@yesagain.com' || isAdmin || isManager;
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadServiceRequests();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Combine all requests into notifications
    const allRequests = [
      ...(leaveRequests || []).map(req => ({ ...req, type: 'leave' })),
      ...(permissionRequests || []).map(req => ({ ...req, type: 'permission' })),
      ...(cashAdvanceRequests || []).map(req => ({ ...req, type: 'cash' })),
      ...(resignationRequests || []).map(req => ({ ...req, type: 'resignation' }))
    ];

    // Filter based on user role
    const filteredRequests = isHR 
      ? allRequests // HR sees all
      : allRequests.filter(req => req.employeeId === currentUser?.employeeId); // Employees see only their own

    // Apply status filter
    const statusFiltered = filteredRequests.filter(req => {
      if (filter === 'pending') return req.status === 'Pending';
      if (filter === 'processed') return req.status !== 'Pending';
      return true;
    });

    // Sort by date (newest first)
    statusFiltered.sort((a, b) => 
      new Date(b.createdAt || b.submissionDate || 0).getTime() - 
      new Date(a.createdAt || a.submissionDate || 0).getTime()
    );

    setNotifications(statusFiltered);
  }, [leaveRequests, permissionRequests, cashAdvanceRequests, resignationRequests, isHR, currentUser, filter]);

  const getIcon = (type: string, status: string) => {
    if (status === 'Approved') return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    if (status === 'Rejected') return <XCircleIcon className="h-5 w-5 text-red-500" />;
    
    switch(type) {
      case 'leave': return <span className="text-xl">🏖️</span>;
      case 'permission': return <span className="text-xl">⏱️</span>;
      case 'cash': return <span className="text-xl">💰</span>;
      case 'resignation': return <span className="text-xl">📄</span>;
      default: return <BellIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTitle = (notification: any) => {
    switch(notification.type) {
      case 'leave': return `${notification.leaveType || 'Annual'} Leave Request`;
      case 'permission': return 'Permission Request';
      case 'cash': return 'Cash Advance Request';
      case 'resignation': return 'Resignation';
      default: return 'Service Request';
    }
  };

  const getDescription = (notification: any) => {
    switch(notification.type) {
      case 'leave':
        return `${notification.startDate || ''} to ${notification.endDate || ''}`;
      case 'permission':
        return `${notification.permissionDate || notification.date || ''} • ${notification.startTime || ''} - ${notification.endTime || ''}`;
      case 'cash':
        return `AED ${notification.amount?.toLocaleString() || 0}`;
      case 'resignation':
        return `Last Day: ${notification.proposedLastDay || notification.lastWorkingDay || ''}`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            title="Go back"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <BellIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600">
              {isHR ? 'All service requests' : 'Your request updates'}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'pending', 'processed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <BellIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {filter === 'pending' 
                ? 'No pending requests' 
                : filter === 'processed'
                ? 'No processed requests'
                : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  notification.status === 'Pending' 
                    ? 'bg-amber-50' 
                    : notification.status === 'Approved'
                    ? 'bg-emerald-50'
                    : 'bg-rose-50'
                }`}>
                  {getIcon(notification.type, notification.status)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getTitle(notification)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {getDescription(notification)}  
                      </p>   
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      notification.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : notification.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {notification.status}
                    </span>
                  </div>

                  {/* Employee info for HR */}
                  {isHR && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">From:</span> {notification.employeeName}
                    </p>
                  )}

                  {/* Reason */}
                  {notification.reason && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl mb-2">
                      <span className="font-medium">Reason:</span> {notification.reason}
                    </p>
                  )}

                  {/* Manager notes for processed requests */}
                  {notification.managerNotes && (
                    <p className={`text-sm p-3 rounded-xl ${
                      notification.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      <span className="font-medium">
                        {notification.status === 'Approved' ? 'Approval' : 'Rejection'} notes:
                      </span>{' '}
                      {notification.managerNotes}
                    </p>
                  )}

                  {/* Date */}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.createdAt || notification.submissionDate || notification.requestDate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPage;