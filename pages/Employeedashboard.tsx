import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHRData } from '../hooks/useHRData';
import { Card, Button } from '../components/UI';
import { api } from '../services/api';
import { 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp,
  Bell,
  ChevronRight,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Award,
  Users,
  Coffee,
  Gift,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Heart,
  Sparkles,
  CalendarDays,
  Clock3,
  Target,
  Medal,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, employeeDetails } = useAuth();
  const { getMyAttendance, getMyLeaveRequests, getMyTasks } = useHRData();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [stats, setStats] = useState({
    leaveBalance: 0,
    attendanceRate: 0,
    pendingTasks: 0,
    hoursThisWeek: 0,
    daysPresent: 0,
    daysAbsent: 0,
    leaveUsed: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Load all dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!employeeDetails?.id) return;
      
      setLoading(true);
      try {
        // Load today's attendance
        const todayStatus = await api.getTodayAttendanceStatus(employeeDetails.id);
        setTodayAttendance(todayStatus);

        // Load attendance records for this month
        const now = new Date();
        const attendance = await api.getEmployeeAttendance(employeeDetails.id, {
          month: now.getMonth() + 1,
          year: now.getFullYear()
        });

        // Calculate stats
        const presentDays = attendance.filter((r: any) => r.status === 'Present').length;
        const absentDays = attendance.filter((r: any) => r.status === 'Absent').length;
        const totalWorkedHours = attendance.reduce((sum: number, r: any) => sum + (r.workHours || 0), 0);

        // Get leave balance from employee details
        const leaveBalance = employeeDetails.leaveBalances?.Annual?.remaining || 24;

        // Get pending tasks
        const tasks = await getMyTasks(employeeDetails.id);
        const pendingTasksCount = tasks.filter(t => t.status !== 'Completed').length;

        setStats({
          leaveBalance,
          attendanceRate: attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0,
          pendingTasks: pendingTasksCount,
          hoursThisWeek: Math.round(totalWorkedHours),
          daysPresent: presentDays,
          daysAbsent: absentDays,
          leaveUsed: (employeeDetails.leaveBalances?.Annual?.total || 24) - leaveBalance
        });

        // Load recent activities (leave requests, etc.)
        const leaveRequests = await getMyLeaveRequests(employeeDetails.id);
        const recent = leaveRequests
          .slice(0, 5)
          .map((req: any) => ({
            type: req.status === 'Approved' ? 'Leave Approved' : 
                   req.status === 'Rejected' ? 'Leave Rejected' : 'Leave Requested',
            description: `${req.leaveType} leave from ${req.startDate} to ${req.endDate}`,
            time: new Date(req.createdAt).toLocaleDateString(),
            icon: req.status === 'Approved' ? CheckCircle :
                  req.status === 'Rejected' ? XCircle : Clock,
            iconColor: req.status === 'Approved' ? 'text-emerald-600' :
                      req.status === 'Rejected' ? 'text-red-600' : 'text-amber-600',
            bgColor: req.status === 'Approved' ? 'bg-emerald-100' :
                    req.status === 'Rejected' ? 'bg-red-100' : 'bg-amber-100'
          }));
        setRecentActivities(recent);

      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [employeeDetails, getMyLeaveRequests, getMyTasks]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClockIn = async () => {
    if (!employeeDetails?.id) return;
    setClockingIn(true);
    try {
      const result = await api.clockIn({
        employeeId: employeeDetails.id,
        date: new Date().toISOString().split('T')[0],
        inTime: formatTime(new Date()),
        checkInMethod: 'web'
      });
      if (result.success) {
        // Refresh today's attendance
        const todayStatus = await api.getTodayAttendanceStatus(employeeDetails.id);
        setTodayAttendance(todayStatus);
      }
    } catch (error) {
      console.error('Clock in failed:', error);
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!employeeDetails?.id) return;
    setClockingOut(true);
    try {
      const result = await api.clockOut(employeeDetails.id, {
        outTime: formatTime(new Date())
      });
      if (result.success) {
        // Refresh today's attendance
        const todayStatus = await api.getTodayAttendanceStatus(employeeDetails.id);
        setTodayAttendance(todayStatus);
      }
    } catch (error) {
      console.error('Clock out failed:', error);
    } finally {
      setClockingOut(false);
    }
  };

  const quickStats = [
    { 
      label: 'Annual Leave', 
      value: stats.leaveBalance.toString(), 
      unit: 'days left',
      icon: Calendar, 
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      textColor: 'text-blue-600',
      progress: stats.leaveBalance ? Math.round((stats.leaveUsed / (stats.leaveUsed + stats.leaveBalance)) * 100) : 0
    },
    { 
      label: 'Attendance', 
      value: stats.attendanceRate.toString(), 
      unit: '% this month',
      icon: TrendingUp, 
      color: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      progress: stats.attendanceRate
    },
    { 
      label: 'Tasks', 
      value: stats.pendingTasks.toString(), 
      unit: 'pending',
      icon: FileText, 
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      textColor: 'text-amber-600',
      progress: 0
    },
    { 
      label: 'Hours', 
      value: stats.hoursThisWeek.toString(), 
      unit: 'this month',
      icon: Clock, 
      color: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-50',
      textColor: 'text-purple-600',
      progress: Math.min(100, Math.round((stats.hoursThisWeek / 160) * 100))
    },
  ];

  const quickActions = [
    { label: 'Request Leave', icon: Calendar, to: '/employee/services?type=leave', color: 'bg-blue-500', lightColor: 'bg-blue-50' },
    { label: 'View Payslips', icon: FileText, to: '/employee/payroll', color: 'bg-emerald-500', lightColor: 'bg-emerald-50' },
    { label: 'My Attendance', icon: Clock, to: '/employee/attendance', color: 'bg-amber-500', lightColor: 'bg-amber-50' },
    { label: 'My Profile', icon: User, to: '/employee/personnel', color: 'bg-purple-500', lightColor: 'bg-purple-50' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getFullName = () => {
    if (employeeDetails) {
      const fullName = [
        employeeDetails.firstName,
        employeeDetails.middleName,
        employeeDetails.lastName
      ]
        .filter(name => name && name !== 'null' && name !== 'undefined' && name.trim() !== '')
        .join(' ');
      
      return fullName || employeeDetails.email || currentUser?.username || 'Employee';
    }
    return currentUser?.username || 'Employee';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{greeting}, {getFullName()}!</h1>
                <p className="text-white/80 text-lg">{employeeDetails?.designation || 'Employee'} • {employeeDetails?.department || 'General'}</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-6">
              <div className="text-right">
                <div className="text-2xl font-semibold">{formatTime(currentTime)}</div>
                <div className="text-white/70 text-sm">{formatDate(currentTime)}</div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm text-white/70">Staff ID</div>
                  <div className="font-semibold">{employeeDetails?.staffId || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Today's Status Card with Clock In/Out */}
        <div className="mb-8">
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <CalendarDays className="w-5 h-5 text-indigo-600 mr-2" />
                  Today's Attendance
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                  todayAttendance?.hasClockedIn 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    todayAttendance?.hasClockedIn ? 'bg-green-500' : 'bg-amber-500'
                  }`}></span>
                  {todayAttendance?.hasClockedIn ? 'Clocked In' : 'Not Clocked In'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Check In</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {todayAttendance?.record?.inTime || '--:-- --'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Check Out</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {todayAttendance?.record?.outTime || '--:-- --'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Clock3 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Work Hours</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {todayAttendance?.record?.workHours 
                        ? `${todayAttendance.record.workHours.toFixed(1)} hrs` 
                        : '-- hrs'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Overtime</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {todayAttendance?.record?.overtimeHours 
                        ? `${todayAttendance.record.overtimeHours.toFixed(1)} hrs` 
                        : '0 hrs'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div> 

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-500">{stat.unit}</span>
                  </div>
                  <h3 className="text-sm text-slate-600 font-medium mb-1">{stat.label}</h3>
                  <p className="text-3xl font-bold text-slate-800 mb-2">{stat.value}</p>
                  
                  {/* Progress Bar */}
                  {stat.progress > 0 && (
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${stat.color}`}
                        style={{ width: `${stat.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions & Upcoming */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <Card className="overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-indigo-600 rounded-full mr-3"></span> 
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={index}
                        to={action.to}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className={`absolute inset-0 ${action.lightColor} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                        <div className="relative p-5 flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-12 h-12 rounded-lg ${action.color} bg-opacity-10 flex items-center justify-center`}>
                              <Icon className={`w-6 h-6 text-${action.color.split('-')[1]}-600`} />
                            </div>
                            <span className="font-medium text-slate-700">{action.label}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Upcoming Events - Placeholder for now */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-amber-500 rounded-full mr-3"></span>
                  Upcoming Events
                </h3>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.map((event, index) => {
                      const Icon = event.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg ${event.bgColor} flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 ${event.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{event.title}</p>
                              <p className="text-sm text-slate-500">{event.date}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No upcoming events</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-1 space-y-8">
            {/* Recent Activity */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                  <span className="w-1 h-5 bg-emerald-500 rounded-full mr-3"></span>
                  Recent Activity
                </h3>
                {recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${activity.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${activity.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {activity.type}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {activity.description}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No recent activity</p>
                  </div>
                )}
                {recentActivities.length > 0 && (
                  <Link 
                    to="/employee/services" 
                    className="mt-4 block w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium py-2 border-t border-slate-100"
                  >
                    View All Activity
                  </Link>
                )}
              </div>
            </Card>

            {/* Monthly Summary */}
            <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <div className="p-6">
                <h4 className="text-white/80 text-sm mb-4">This Month</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Days Present</span>
                    <span className="text-xl font-bold">{stats.daysPresent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Days Absent</span>
                    <span className="text-xl font-bold">{stats.daysAbsent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Leave Used</span>
                    <span className="text-xl font-bold">{stats.leaveUsed}</span>
                  </div>
                  <div className="h-px bg-white/20 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Leave Balance</span>
                    <span className="text-xl font-bold">{stats.leaveBalance} days</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Company Announcements - Placeholder */}
        <div className="mt-8">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <span className="w-1 h-5 bg-purple-500 rounded-full mr-3"></span>
                Company Announcements
              </h3>
              {announcements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {announcements.map((announcement, index) => {
                    const Icon = announcement.icon;
                    return (
                      <div 
                        key={index}
                        className="p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-slate-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 mb-1">{announcement.title}</h4>
                            <p className="text-sm text-slate-600 mb-2">{announcement.description}</p>
                            <span className="text-xs text-slate-400">{announcement.date}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-2">No announcements</p>
                  <p className="text-sm">Check back later for company updates</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;



// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import { Card } from '../components/UI';
// import { 
//   User, 
//   Calendar, 
//   Clock, 
//   FileText, 
//   TrendingUp,
//   Bell,
//   ChevronRight,
//   Briefcase,
//   Mail,
//   Phone,
//   MapPin,
//   Award,
//   Users
// } from 'lucide-react';

// const EmployeeDashboard: React.FC = () => {
//   const { currentUser, employeeDetails } = useAuth();
//   const [currentTime, setCurrentTime] = useState(new Date());

//   useEffect(() => {
//     const timer = setInterval(() => setCurrentTime(new Date()), 1000);
//     return () => clearInterval(timer);
//   }, []);

//   const formatTime = (date: Date) => {
//     return date.toLocaleTimeString('en-US', { 
//       hour: '2-digit', 
//       minute: '2-digit',
//       second: '2-digit'
//     });
//   };

//   const formatDate = (date: Date) => {
//     return date.toLocaleDateString('en-US', { 
//       weekday: 'long',
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric'
//     });
//   };

//   // Sample data - replace with actual API calls
//   const quickStats = [
//     { label: 'Leave Balance', value: '12 days', icon: Calendar, color: 'from-amber-500 to-orange-500' },
//     { label: 'Attendance Rate', value: '98%', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
//     { label: 'Pending Tasks', value: '3', icon: FileText, color: 'from-blue-500 to-indigo-500' },
//     { label: 'Hours This Week', value: '38h', icon: Clock, color: 'from-purple-500 to-pink-500' },
//   ];

//   // ✅ FIXED: Correct paths that match the routes in App.tsx
//   const quickActions = [
//     { label: 'Request Leave', icon: Calendar, to: '/employee/services?type=leave' },
//     { label: 'View Payslips', icon: FileText, to: '/employee/payroll' },
//     { label: 'My Attendance', icon: Clock, to: '/employee/attendance' },
//     { label: 'My Profile', icon: User, to: '/employee/personnel' },
//   ];

//   const recentActivities = [
//     { type: 'Leave Approved', description: 'Annual leave for Dec 25-27 approved', time: '2 hours ago', icon: Calendar },
//     { type: 'Payslip Available', description: 'November 2024 payslip is now available', time: '1 day ago', icon: FileText },
//     { type: 'Performance Review', description: 'Q4 review scheduled for next week', time: '3 days ago', icon: TrendingUp },
//   ];

//   const announcements = [
//     {
//       title: 'Year-End Company Celebration',
//       description: 'Join us for our annual year-end celebration on December 20th at 6 PM. Dinner, awards, and entertainment!',
//       date: 'Posted 2 days ago',
//       color: 'amber'
//     },
//     {
//       title: 'New HR Policy Updates',
//       description: 'Please review the updated remote work and flexible hours policy in the employee handbook.',
//       date: 'Posted 5 days ago',
//       color: 'blue'
//     }
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-100">
//       {/* Main Content - NO HEADER HERE, IT'S IN LAYOUT */}
//       <main className="max-w-7xl mx-auto px-6 py-8">
//         {/* Welcome Section - Updated colors to match sidebar (gray-800) */}
//         <div className="mb-8">
//           <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-amber-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
//             {/* Background Pattern */}
//             <div className="absolute inset-0 opacity-10">
//               <div className="absolute inset-0" style={{
//                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
//               }}></div>
//             </div>
            
//             <div className="relative z-10">
//               <div className="flex items-start justify-between">
//                 <div className="flex-1">
//                   <div className="flex items-center space-x-3 mb-4">
//                     <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
//                       <Award className="w-5 h-5 text-white" />
//                     </div>
//                     <div>
//                       <h2 className="text-4xl font-bold text-white">
//                         Welcome back, {employeeDetails?.firstName || currentUser?.username}!
//                       </h2>
//                       <p className="text-amber-100 text-lg">
//                         {employeeDetails?.designation || 'Employee'} • {employeeDetails?.department || 'General'}
//                       </p>
//                     </div>
//                   </div>
                  
//                   {employeeDetails && (
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 max-w-2xl">
//                       <div className="flex items-center space-x-3 text-white/90">
//                         <Briefcase className="w-4 h-4 text-amber-300" />
//                         <span className="text-sm">Staff ID: {employeeDetails.staffId}</span>
//                       </div>
//                       <div className="flex items-center space-x-3 text-white/90">
//                         <Mail className="w-4 h-4 text-amber-300" />
//                         <span className="text-sm">{employeeDetails.email}</span>
//                       </div>
//                       {employeeDetails.phone && (
//                         <div className="flex items-center space-x-3 text-white/90">
//                           <Phone className="w-4 h-4 text-amber-300" />
//                           <span className="text-sm">{employeeDetails.phone}</span>
//                         </div>
//                       )}
//                       <div className="flex items-center space-x-3 text-white/90">
//                         <MapPin className="w-4 h-4 text-amber-300" />
//                         <span className="text-sm capitalize">{employeeDetails.workStatus || 'Active'}</span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
                
//                 {/* Time Display */}
//                 <div className="hidden lg:block text-right">
//                   <div className="text-3xl font-bold text-white mb-2">{formatTime(currentTime)}</div>
//                   <div className="text-amber-100 text-sm">{formatDate(currentTime)}</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Stats Grid */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           {quickStats.map((stat, index) => (
//             <div
//               key={index}
//               className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
//             >
//               <div className="flex items-center justify-between mb-3">
//                 <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
//                   <stat.icon className="w-6 h-6 text-white" />
//                 </div>
//               </div>
//               <h3 className="text-sm text-slate-600 font-medium mb-1">{stat.label}</h3>
//               <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
//             </div>
//           ))}
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           {/* Quick Actions */}
//           <div className="lg:col-span-2">
//             <Card className="p-6">
//               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
//                 <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
//                 Quick Actions
//               </h3>
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                 {quickActions.map((action, index) => (
//                   <Link
//                     key={index}
//                     to={action.to}
//                     className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:shadow-md border border-slate-100 group"
//                   >
//                     <div className="flex items-center space-x-3">
//                       <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
//                         <action.icon className="w-5 h-5 text-slate-600" />
//                       </div>
//                       <span className="font-medium text-slate-700">{action.label}</span>
//                     </div>
//                     <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
//                   </Link>
//                 ))}
//               </div>
//             </Card>
//           </div>

//           {/* Recent Activity */}
//           <div className="lg:col-span-1">
//             <Card className="p-6">
//               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
//                 <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
//                 Recent Activity
//               </h3>
//               <div className="space-y-4">
//                 {recentActivities.map((activity, index) => (
//                   <div
//                     key={index}
//                     className="flex space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
//                   >
//                     <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
//                       <activity.icon className="w-5 h-5 text-amber-600" />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-sm font-semibold text-slate-800 mb-1">
//                         {activity.type}
//                       </p>
//                       <p className="text-xs text-slate-600 mb-1">
//                         {activity.description}
//                       </p>
//                       <p className="text-xs text-slate-400">{activity.time}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </Card>
//           </div>
//         </div>

//         {/* Company Announcements */}
//         <div className="mt-8">
//           <Card className="p-6">
//             <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
//               <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
//               Company Announcements
//             </h3>
//             <div className="space-y-4">
//               {announcements.map((announcement, index) => (
//                 <div 
//                   key={index}
//                   className={`p-4 bg-${announcement.color}-50 border-l-4 border-${announcement.color}-500 rounded-lg`}
//                 >
//                   <div className="flex items-start justify-between">
//                     <div className="flex-1">
//                       <h4 className="font-semibold text-slate-800 mb-1">{announcement.title}</h4>
//                       <p className="text-sm text-slate-600 mb-2">{announcement.description}</p>
//                       <span className={`text-xs text-${announcement.color}-700 font-medium`}>{announcement.date}</span>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </Card>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default EmployeeDashboard;