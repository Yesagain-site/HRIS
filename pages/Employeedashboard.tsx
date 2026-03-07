import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/UI';
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
  Users
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, employeeDetails } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
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

  // Sample data - replace with actual API calls
  const quickStats = [
    { label: 'Leave Balance', value: '12 days', icon: Calendar, color: 'from-amber-500 to-orange-500' },
    { label: 'Attendance Rate', value: '98%', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
    { label: 'Pending Tasks', value: '3', icon: FileText, color: 'from-blue-500 to-indigo-500' },
    { label: 'Hours This Week', value: '38h', icon: Clock, color: 'from-purple-500 to-pink-500' },
  ];

  const quickActions = [
    { label: 'Request Leave', icon: Calendar, href: '/employee/services?type=leave' },
    { label: 'View Payslips', icon: FileText, href: '/employee/payslips' },
    { label: 'My Attendance', icon: Clock, href: '/employee/attendance' },
    { label: 'My Profile', icon: User, href: '/employee/profile' },
  ];

  const recentActivities = [
    { type: 'Leave Approved', description: 'Annual leave for Dec 25-27 approved', time: '2 hours ago', icon: Calendar },
    { type: 'Payslip Available', description: 'November 2024 payslip is now available', time: '1 day ago', icon: FileText },
    { type: 'Performance Review', description: 'Q4 review scheduled for next week', time: '3 days ago', icon: TrendingUp },
  ];

  const announcements = [
    {
      title: 'Year-End Company Celebration',
      description: 'Join us for our annual year-end celebration on December 20th at 6 PM. Dinner, awards, and entertainment!',
      date: 'Posted 2 days ago',
      color: 'amber'
    },
    {
      title: 'New HR Policy Updates',
      description: 'Please review the updated remote work and flexible hours policy in the employee handbook.',
      date: 'Posted 5 days ago',
      color: 'blue'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50 to-slate-100">
      {/* Main Content - NO HEADER HERE, IT'S IN LAYOUT */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section - Updated colors to match sidebar (gray-800) */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-amber-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-white">
                        Welcome back, {employeeDetails?.firstName || currentUser?.username}!
                      </h2>
                      <p className="text-amber-100 text-lg">
                        {employeeDetails?.designation || 'Employee'} • {employeeDetails?.department || 'General'}
                      </p>
                    </div>
                  </div>
                  
                  {employeeDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 max-w-2xl">
                      <div className="flex items-center space-x-3 text-white/90">
                        <Briefcase className="w-4 h-4 text-amber-300" />
                        <span className="text-sm">Staff ID: {employeeDetails.staffId}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-white/90">
                        <Mail className="w-4 h-4 text-amber-300" />
                        <span className="text-sm">{employeeDetails.email}</span>
                      </div>
                      {employeeDetails.phone && (
                        <div className="flex items-center space-x-3 text-white/90">
                          <Phone className="w-4 h-4 text-amber-300" />
                          <span className="text-sm">{employeeDetails.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-3 text-white/90">
                        <MapPin className="w-4 h-4 text-amber-300" />
                        <span className="text-sm capitalize">{employeeDetails.workStatus || 'Active'}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Time Display */}
                <div className="hidden lg:block text-right">
                  <div className="text-3xl font-bold text-white mb-2">{formatTime(currentTime)}</div>
                  <div className="text-amber-100 text-sm">{formatDate(currentTime)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm text-slate-600 font-medium mb-1">{stat.label}</h3>
              <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <a
                    key={index}
                    href={action.href}
                    className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:shadow-md border border-slate-100 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                        <action.icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <span className="font-medium text-slate-700">{action.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </a>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
                Recent Activity
              </h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <activity.icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 mb-1">
                        {activity.type}
                      </p>
                      <p className="text-xs text-slate-600 mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Company Announcements */}
        <div className="mt-8">
          <Card className="p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <span className="w-1 h-6 bg-amber-500 rounded-full mr-3"></span>
              Company Announcements
            </h3>
            <div className="space-y-4">
              {announcements.map((announcement, index) => (
                <div 
                  key={index}
                  className={`p-4 bg-${announcement.color}-50 border-l-4 border-${announcement.color}-500 rounded-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 mb-1">{announcement.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{announcement.description}</p>
                      <span className={`text-xs text-${announcement.color}-700 font-medium`}>{announcement.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;