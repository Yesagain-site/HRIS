// DashboardPage.tsx
import React, { useState } from 'react';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { WorkStatus } from '../hooks/useHRData'; // Import the enum if needed
import { Modal } from '../components/UI';

const DashboardPage: React.FC = () => {
  const { employees, attendanceRecords, roles, users } = useHRData();
  const { currentUser } = useAuth();
  
  // State for department modal
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
  const employeesByDepartment: Record<string, any[]> = {};
  
  employees.forEach(emp => {
    const dept = emp.department || 'Unassigned';
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    
    // Store employees by department for modal display
    if (!employeesByDepartment[dept]) {
      employeesByDepartment[dept] = [];
    }
    employeesByDepartment[dept].push(emp);
  });
  
  // Calculate attendance for today
  const today = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendanceRecords.filter(record => record.date === today);
  const presentCount = todaysAttendance.filter(record => 
    record.status === 'Present' || record.status === 'Late' || record.status === 'Early Departure'
  ).length;
  const notPresentCount = todaysAttendance.length - presentCount;
  
  // Handle department click
  const handleDepartmentClick = (department: string) => {
    setSelectedDepartment(department);
    setIsModalOpen(true);
  };
  
  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDepartment(null);
  };
  
  // Get employees for selected department
  const departmentEmployees = selectedDepartment ? employeesByDepartment[selectedDepartment] || [] : [];
  
  // Sort employees by name
  const sortedEmployees = [...departmentEmployees].sort((a, b) => 
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );
  
  return (
    <div className="space-y-6">
      {/* Department Employee Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={selectedDepartment ? `${selectedDepartment} Department (${departmentEmployees.length} employees)` : 'Department Employees'}
      >
        <div className="max-h-96 overflow-y-auto">
          {sortedEmployees.length > 0 ? (
            <div className="space-y-2">
              {sortedEmployees.map((emp) => (
                <div 
                  key={emp.id} 
                  className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {emp.firstName} {emp.middleName || ''} {emp.lastName}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{emp.designation || 'No designation'}</span>
                          <span>•</span>
                          <span>ID: {emp.staffId || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        emp.workStatus === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {emp.workStatus || 'Active'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Additional details */}
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 border-t pt-2">
                    <div>
                      <span className="font-medium">Email:</span> {emp.email || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {emp.phone || emp.mobile || '—'}
                    </div>
                    <div>
                      <span className="font-medium">Join Date:</span> {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString() : '—'}
                    </div>
                    <div>
                      <span className="font-medium">Manager:</span> {emp.manager || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No employees found in this department
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    
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
            {Object.entries(departmentCounts).slice(0, 5).map(([dept, count]) => (
              <div 
                key={dept} 
                className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                onClick={() => handleDepartmentClick(dept)}
              >
                <span className="text-sm text-gray-600 hover:text-indigo-600">{dept}</span>
                <span className="font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{count}</span>
              </div>
            ))}
            {Object.keys(departmentCounts).length > 5 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                +{Object.keys(departmentCounts).length - 5} more departments
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
        {/* Department Distribution - Clickable Bars */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Headcount by Department</h2>
          <div className="space-y-3">
            {Object.entries(departmentCounts).map(([dept, count]) => (
              <div 
                key={dept} 
                className="flex items-center cursor-pointer group"
                onClick={() => handleDepartmentClick(dept)}
              >
                <div className="w-32 text-sm text-gray-600 group-hover:text-indigo-600 transition-colors">{dept}</div>
                <div className="flex-1 ml-4">
                  <div className="h-8 bg-gray-200 rounded-full overflow-hidden relative group-hover:bg-gray-300 transition-colors">
                    <div 
                      className="h-full bg-blue-500 rounded-full group-hover:bg-blue-600 transition-colors flex items-center justify-end px-3"
                      style={{ width: `${(count / totalHeadcount) * 100}%` }}
                    >
                      {((count / totalHeadcount) * 100) > 15 && (
                        <span className="text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-12 text-right font-medium group-hover:text-indigo-600">{count}</div>
              </div>
            ))}
            {Object.keys(departmentCounts).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No department data available
              </div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-500 text-center">
            Click on any department bar or name to view employees
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