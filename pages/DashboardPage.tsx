// DashboardPage.tsx
import React from 'react';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { WorkStatus } from '../hooks/useHRData'; // Import the enum if needed

const DashboardPage: React.FC = () => {
  const { employees, attendanceRecords, roles, users } = useHRData();
  const { currentUser } = useAuth();
  
  console.log('Dashboard Data:', {
    employeesCount: employees.length,
    attendanceCount: attendanceRecords.length,
    rolesCount: roles.length,
    usersCount: users.length
  });
  
  // Calculate stats
  const totalHeadcount = employees.length;
  const activeEmployees = employees.filter(emp => emp.workStatus === 'Active').length;
  
  // Group by department
  const departmentCounts: Record<string, number> = {};
  employees.forEach(emp => {
    const dept = emp.department || 'Unassigned';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });
  
  // Calculate attendance for today
  const today = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendanceRecords.filter(record => record.date === today);
  const presentCount = todaysAttendance.filter(record => record.status === 'Present').length;
  const notPresentCount = todaysAttendance.length - presentCount;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="text-sm text-gray-600">
          Welcome back, {currentUser?.name || currentUser?.username || 'User'}!
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Headcount Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Headcount</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalHeadcount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm text-gray-600">
              <span className="text-green-600 font-medium">
                {activeEmployees} active
              </span>
              <span className="mx-2">•</span>
              <span>{totalHeadcount - activeEmployees} inactive</span>
            </div>
          </div>
        </div>
        
        {/* Departments Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {Object.keys(departmentCounts).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(departmentCounts).slice(0, 3).map(([dept, count]) => (
              <div key={dept} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{dept}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {Object.keys(departmentCounts).length > 3 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                +{Object.keys(departmentCounts).length - 3} more departments
              </div>
            )}
          </div>
        </div>
        
        {/* Attendance Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {presentCount}/{todaysAttendance.length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${todaysAttendance.length > 0 ? (presentCount / todaysAttendance.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Present: {presentCount}</span>
                  <span>Total: {todaysAttendance.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Users Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Active users:</span>
                <span className="font-medium">{users.filter(u => u.isActive).length}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Roles:</span>
                <span className="font-medium">{roles.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts/Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Headcount by Department</h2>
          <div className="space-y-3">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <div key={dept} className="flex items-center">
                <div className="w-32 text-sm text-gray-600">{dept}</div>
                <div className="flex-1 ml-4">
                  <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(count / totalHeadcount) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right font-medium">{count}</div>
              </div>
            ))}
            {Object.keys(departmentCounts).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No department data available
              </div>
            )}
          </div>
        </div>
        
        {/* Attendance Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Overview</h2>
          <div className="flex items-center justify-center h-64">
            {todaysAttendance.length > 0 ? (
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{presentCount}</div>
                  <div className="text-sm text-gray-600 mt-2">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600">{notPresentCount}</div>
                  <div className="text-sm text-gray-600 mt-2">Not Present</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <svg className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-4">No attendance records for today</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-blue-600 font-medium">Add Employee</div>
            <div className="text-sm text-gray-600 mt-1">Create new employee record</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-green-600 font-medium">Record Attendance</div>
            <div className="text-sm text-gray-600 mt-1">Mark today's attendance</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-purple-600 font-medium">Generate Payroll</div>
            <div className="text-sm text-gray-600 mt-1">Process monthly payroll</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="text-yellow-600 font-medium">View Reports</div>
            <div className="text-sm text-gray-600 mt-1">Generate HR reports</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;