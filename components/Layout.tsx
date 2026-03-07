import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHRData } from '../hooks/useHRData';
import { useEmployeeData } from '../hooks/useEmployeeData';
import { 
  UserCircleIcon,
  UserGroupIcon, 
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BellIcon
} from './Icons';
import { api } from '../services/api';
import { Outlet } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  permission: string;
}

const NavHeading: React.FC<{ children: React.ReactNode; isCompact: boolean }> = ({ children, isCompact }) => (
    <h3 className={`px-4 pb-2 text-xs font-bold uppercase tracking-wider ${isCompact ? 'pt-3' : 'pt-4'} text-gray-400`}>
        {children}
    </h3>
);

const MainLayout: React.FC = () => {
  const { logout, currentUser, authReady, hasPermission, isAdmin, isManager } = useAuth();
  const { employees } = useHRData();
  useEmployeeData();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  
  // Determine user role flags FIRST (before using them)
  const roleName = currentUser?.role?.name || (currentUser?.role as any)?.name || 'User';
  const isEmployee = roleName === 'Employee';
  const isHR = currentUser?.email === 'hr@yesagain.com' || isAdmin;
  
  // Get employee name from employees list
  useEffect(() => {
    if (currentUser?.employeeId) {
      if (employees.length > 0) {
        const employee = employees.find(emp => emp.id === currentUser.employeeId);
        if (employee) {
          const fullName = `${employee.firstName || ''} ${employee.middleName || ''} ${employee.lastName || ''}`
            .replace(/\s+/g, ' ')
            .trim();
          setEmployeeName(fullName || employee.email || currentUser.username);
          console.log('✅ Found employee name:', fullName);
        } else {
          setEmployeeName(currentUser.username);
        }
      } else {
        setEmployeeName(currentUser.username);
      }
    } else if (currentUser) {
      setEmployeeName(currentUser.username);
    }
  }, [currentUser, employees]);

  // Wait for auth to be ready
  useEffect(() => {
    if (authReady && currentUser) {
      console.log('✅ User data ready:', currentUser.username);
      setIsUserDataReady(true);
    }
  }, [authReady, currentUser]);

  // Fetch pending requests count for all users
  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        // For HR/Admin/Manager - get all pending requests
        if (isHR || isAdmin || isManager) {
          const response = await api.getServiceRequests({ status: 'Pending' });
          setPendingRequestsCount(response?.length || 0);
          console.log('📊 Pending requests count:', response?.length);
        } 
        // For employees - get only their pending requests
        else if (currentUser?.employeeId) {
          const response = await api.getServiceRequests({ 
            employeeId: currentUser.employeeId,
            status: 'Pending' 
          });
          setPendingRequestsCount(response?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending requests:', error);
      }
    };

    if (authReady && currentUser) {
      fetchPendingRequests();
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [authReady, currentUser, isHR, isAdmin, isManager]);

  // Safe permission checker
  const safeHasPermission = (permission: string): boolean => {
    try {
      if (!hasPermission || !currentUser) return false;
      return hasPermission(permission);
    } catch (e) {
      console.error('Permission check error:', e);
      return false;
    }
  };

  if (!authReady || !isUserDataReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }
  
  const userName = employeeName || currentUser?.username || currentUser?.email || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
  const isCompact = false;
  
  // Determine base path based on current URL
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/employee';
  
  // Get navigation sections based on user role
  const getNavSections = () => {
    if (isEmployee) {
      // Employee menu - limited items
      return [
        {
          title: 'Main',
          items: [
            { to: `${basePath}/dashboard`, label: 'Dashboard', icon: ChartBarIcon, permission: 'canViewDashboard' },
          ],
        },
        {
          title: 'Employee Services',
          items: [
            { to: `${basePath}/attendance`, label: 'My Attendance', icon: CalendarDaysIcon, permission: 'canViewAttendance' },
            { to: `${basePath}/payslips`, label: 'My Payslips', icon: CurrencyDollarIcon, permission: 'canViewPayroll' },
            { to: `${basePath}/services`, label: 'My Requests', icon: BriefcaseIcon, permission: 'canViewServiceRequests' },
            { to: `${basePath}/tasks`, label: 'My Tasks', icon: ClipboardDocumentListIcon, permission: 'canViewTasks' },
            { to: `${basePath}/policies`, label: 'HR Policies', icon: DocumentTextIcon, permission: 'canViewHRPolicies' },
          ],
        }
      ];
    } else {
      // Admin/Manager menu - full items
      return [
        {
          title: 'Main',
          items: [
            { to: `${basePath}/dashboard`, label: 'Dashboard', icon: ChartBarIcon, permission: 'canViewDashboard' },
          ],
        },
        {
          title: 'Analytics',
          items: [
            { to: `${basePath}/analytics`, label: 'Analytics', icon: ChartBarIcon, permission: 'canViewAnalytics' },
          ],
        },
        {
          title: 'Core HR',
          items: [
            { to: `${basePath}/personnel`, label: 'Personnel', icon: UserGroupIcon, permission: 'canViewPersonnel' },
            { to: `${basePath}/payroll`, label: 'Payroll', icon: CurrencyDollarIcon, permission: 'canViewPayroll' },
            { to: `${basePath}/attendance`, label: 'Attendance', icon: CalendarDaysIcon, permission: 'canViewAttendance' },
            { to: `${basePath}/reports`, label: 'Reports', icon: ChartBarIcon, permission: 'canViewReports' },
          ],
        },
        {
          title: 'Operations',
          items: [
            { to: `${basePath}/services`, label: 'Employee Services', icon: BriefcaseIcon, permission: 'canViewServiceRequests' },
            { to: `${basePath}/tasks`, label: 'Tasks', icon: ClipboardDocumentListIcon, permission: 'canViewTasks' },
            { to: `${basePath}/policies`, label: 'HR Policies', icon: DocumentTextIcon, permission: 'canViewHRPolicies' },
          ],
        },
        {
          title: 'Development',
          items: [
            { to: `${basePath}/appraisals`, label: 'Appraisals', icon: UserCircleIcon, permission: 'canViewAppraisals' },
            { to: `${basePath}/training`, label: 'Training', icon: AcademicCapIcon, permission: 'canViewTraining' },
          ]
        },
        {
          title: 'System',
          items: [
            { to: `${basePath}/settings`, label: 'Settings', icon: Cog6ToothIcon, permission: 'canManageSettings' },
          ]
        }
      ];
    }
  };

  const allNavSections = getNavSections();

  // Filter nav items based on user permissions
  const filteredNavSections = allNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => safeHasPermission(item.permission))
    }))
    .filter(section => section.items.length > 0);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/personnel')) return 'Personnel';
    if (path.includes('/payroll')) return 'Payroll';
    if (path.includes('/attendance')) return 'Attendance';
    if (path.includes('/reports')) return 'Reports';
    if (path.includes('/services')) return 'Employee Services';
    if (path.includes('/tasks')) return 'Tasks';
    if (path.includes('/policies')) return 'HR Policies';
    if (path.includes('/appraisals')) return 'Performance Appraisals';
    if (path.includes('/training')) return 'Training';
    if (path.includes('/analytics')) return 'Analytics';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/payslips')) return 'My Payslips';
    if (path.includes('/notifications')) return 'Notifications';
    return 'Dashboard';
  };

  const sidebarClasses = `
    w-64
    bg-gray-800 text-white
    h-full
    flex-shrink-0
    hidden md:flex flex-col
    py-7
    transition-all duration-300
  `;

  const navLinkBase = `flex items-center space-x-3 my-1 rounded-md transition duration-200`;
  const navLinkDefault = `py-2 px-3`;
  const navLinkText = 'text-gray-300 hover:bg-gray-700 hover:text-white';
  const navLinkActive = `bg-blue-600 bg-opacity-30 text-white font-semibold border-l-4 border-blue-500`;

  // Logout icon
  const LogoutIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white z-50 flex flex-col py-7 shadow-xl">
            <div className="px-4 mb-6 flex justify-between items-center">
              <Link to={`${basePath}/dashboard`} className="flex items-center space-x-2" onClick={() => setSidebarOpen(false)}>
                <span className="text-2xl font-extrabold text-white tracking-tight">YesPeople</span>
              </Link>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="flex-grow px-2 overflow-y-auto">
              {filteredNavSections.length > 0 ? (
                filteredNavSections.map(section => (
                  <div key={section.title} className="mb-2">
                    <NavHeading isCompact={isCompact}>{section.title}</NavHeading>
                    {section.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to.endsWith('/dashboard')}
                        className={({ isActive }) =>
                          `${navLinkBase} ${navLinkDefault} ${navLinkText} ${isActive ? navLinkActive : ''}`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-4 px-2">
                  <p className="font-semibold">Welcome, {userName}!</p>
                  <p className="text-sm mt-1">Your role: {roleName}</p>
                  <p className="text-xs mt-3">No menu items available for your role.</p>
                  <p className="text-xs">Contact your administrator for access.</p>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop - Navigation Only */}
      <aside className={sidebarClasses}>
        <div className="px-4 mb-6">
          <Link to={`${basePath}/dashboard`} className="flex items-center space-x-2 group">
            <span className="text-2xl font-extrabold text-white tracking-tight group-hover:text-blue-300 transition-colors">
              YesPeople
            </span>
          </Link>
        </div>
        
        <nav className="flex-grow px-2 overflow-y-auto">
          {filteredNavSections.length > 0 ? (
            filteredNavSections.map(section => (
              <div key={section.title} className="mb-2">
                <NavHeading isCompact={isCompact}>{section.title}</NavHeading>
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to.endsWith('/dashboard')}
                    className={({ isActive }) =>
                      `${navLinkBase} ${navLinkDefault} ${navLinkText} ${isActive ? navLinkActive : ''}`
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-4 px-2">
              <p className="font-semibold">Welcome, {userName}!</p>
              <p className="text-sm mt-1">Your role: {roleName}</p>
              <p className="text-xs mt-3">No menu items available for your role.</p>
              <p className="text-xs">Contact your administrator for access.</p>
            </div>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Notification Bell and User Menu */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-between items-center px-6 py-3">
            <div className="md:hidden w-12"></div>
            
            <div className="text-xl font-semibold text-gray-800">
              {getPageTitle()}
            </div>
            
            {/* Right side - Notification Bell + User Menu */}
            <div className="flex items-center space-x-4">
              
              {/* 🔔 NOTIFICATION BELL - FOR ALL USERS */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    // Navigate to the correct notifications path based on role
                    if (isHR || isAdmin || isManager) {
                      window.location.href = '#/admin/notifications';
                    } else {
                      window.location.href = '#/employee/notifications';
                    }
                  }}
                  className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </button>
              </div>
              
              {/* User Name and Role */}
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-gray-700">
                  {userName}
                </div>
                <div className="text-xs text-gray-500">
                  {roleName}
                </div>
              </div>
              
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {userInitials}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
                title="Sign out"
              >
                <LogoutIcon />
                <span className="text-sm font-medium hidden lg:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

// import React, { useState, useEffect, useRef } from 'react';
// import { NavLink, Link, useLocation } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import { useHRData } from '../hooks/useHRData';
// import { useEmployeeData } from '../hooks/useEmployeeData';
// import { 
//   UserCircleIcon,
//   UserGroupIcon, 
//   CurrencyDollarIcon,
//   ClipboardDocumentListIcon,
//   AcademicCapIcon,
//   BriefcaseIcon,
//   Cog6ToothIcon,
//   ChartBarIcon,
//   DocumentTextIcon,
//   CalendarDaysIcon,
//   BellIcon
// } from './Icons';
// import { api } from '../services/api';
// import { Outlet } from 'react-router-dom';

// interface NavItem {
//   to: string;
//   label: string;
//   icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
//   permission: string;
// }

// const NavHeading: React.FC<{ children: React.ReactNode; isCompact: boolean }> = ({ children, isCompact }) => (
//     <h3 className={`px-4 pb-2 text-xs font-bold uppercase tracking-wider ${isCompact ? 'pt-3' : 'pt-4'} text-gray-400`}>
//         {children}
//     </h3>
// );

// const MainLayout: React.FC = () => {
//   const { logout, currentUser, authReady, hasPermission } = useAuth();
//   const { employees } = useHRData();
//   useEmployeeData();
  
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [isUserDataReady, setIsUserDataReady] = useState(false);
//   const [employeeName, setEmployeeName] = useState<string>('');
//   const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
//   const [showNotifications, setShowNotifications] = useState(false);
//   const notificationsRef = useRef<HTMLDivElement>(null);
//   const location = useLocation();
  
//   // Get employee name from employees list
//   useEffect(() => {
//     if (currentUser?.employeeId) {
//       if (employees.length > 0) {
//         const employee = employees.find(emp => emp.id === currentUser.employeeId);
//         if (employee) {
//           const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
//           setEmployeeName(fullName || employee.email || currentUser.username);
//           console.log('✅ Found employee name:', fullName);
//         } else {
//           setEmployeeName(currentUser.username);
//         }
//       } else {
//         setEmployeeName(currentUser.username);
//       }
//     } else if (currentUser) {
//       setEmployeeName(currentUser.username);
//     }
//   }, [currentUser, employees]);

//   // Wait for auth to be ready
//   useEffect(() => {
//     if (authReady && currentUser) {
//       console.log('✅ User data ready:', currentUser.username);
//       setIsUserDataReady(true);
//     }
//   }, [authReady, currentUser]);

//   // Fetch pending requests count for HR only
//   useEffect(() => {
//     const fetchPendingRequests = async () => {
//       try {
//         // Only fetch if user is HR (hr@yesagain.com)
//         if (currentUser?.email === 'hr@yesagain.com') {
//           const response = await api.getServiceRequests({ status: 'Pending' });
//           setPendingRequestsCount(response?.length || 0);
//           console.log('📊 Pending requests count:', response?.length);
//         }
//       } catch (error) {
//         console.error('Failed to fetch pending requests:', error);
//       }
//     };

//     if (authReady && currentUser) {
//       fetchPendingRequests();
//       // Refresh every 30 seconds
//       const interval = setInterval(fetchPendingRequests, 30000);
//       return () => clearInterval(interval);
//     }
//   }, [authReady, currentUser]);

//   // Handle click outside to close notifications
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
//         setShowNotifications(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   // Safe permission checker
//   const safeHasPermission = (permission: string): boolean => {
//     try {
//       if (!hasPermission || !currentUser) return false;
//       return hasPermission(permission);
//     } catch (e) {
//       console.error('Permission check error:', e);
//       return false;
//     }
//   };

//   const handleNotificationClick = (e: React.MouseEvent) => {
//     e.stopPropagation();
//     setShowNotifications(!showNotifications);
//   };

//   if (!authReady || !isUserDataReady) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-gray-100">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading your workspace...</p>
//         </div>
//       </div>
//     );
//   }
  
//   const userName = employeeName || currentUser?.username || currentUser?.email || 'User';
//   const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
//   const roleName = currentUser?.role?.name || (currentUser?.role as any)?.name || 'User';
//   const isEmployee = roleName === 'Employee';
//   const isHR = currentUser?.email === 'hr@yesagain.com';
//   const isCompact = false;
  
//   // Determine base path based on current URL
//   const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/employee';
  
//   // Get navigation sections based on user role
//   const getNavSections = () => {
//     if (isEmployee) {
//       // Employee menu - limited items
//       return [
//         {
//           title: 'Main',
//           items: [
//             { to: `${basePath}/dashboard`, label: 'Dashboard', icon: ChartBarIcon, permission: 'canViewDashboard' },
//           ],
//         },
//         {
//           title: 'Employee Services',
//           items: [
//             { to: `${basePath}/attendance`, label: 'My Attendance', icon: CalendarDaysIcon, permission: 'canViewAttendance' },
//             { to: `${basePath}/payslips`, label: 'My Payslips', icon: CurrencyDollarIcon, permission: 'canViewPayroll' },
//             { to: `${basePath}/services`, label: 'My Requests', icon: BriefcaseIcon, permission: 'canViewServiceRequests' },
//             { to: `${basePath}/tasks`, label: 'My Tasks', icon: ClipboardDocumentListIcon, permission: 'canViewTasks' },
//             { to: `${basePath}/policies`, label: 'HR Policies', icon: DocumentTextIcon, permission: 'canViewHRPolicies' },
//           ],
//         }
//       ];
//     } else {
//       // Admin/Manager menu - full items
//       return [
//         {
//           title: 'Main',
//           items: [
//             { to: `${basePath}/dashboard`, label: 'Dashboard', icon: ChartBarIcon, permission: 'canViewDashboard' },
//           ],
//         },
//         {
//           title: 'Analytics',
//           items: [
//             { to: `${basePath}/analytics`, label: 'Analytics', icon: ChartBarIcon, permission: 'canViewAnalytics' },
//           ],
//         },
//         {
//           title: 'Core HR',
//           items: [
//             { to: `${basePath}/personnel`, label: 'Personnel', icon: UserGroupIcon, permission: 'canViewPersonnel' },
//             { to: `${basePath}/payroll`, label: 'Payroll', icon: CurrencyDollarIcon, permission: 'canViewPayroll' },
//             { to: `${basePath}/attendance`, label: 'Attendance', icon: CalendarDaysIcon, permission: 'canViewAttendance' },
//             { to: `${basePath}/reports`, label: 'Reports', icon: ChartBarIcon, permission: 'canViewReports' },
//           ],
//         },
//         {
//           title: 'Operations',
//           items: [
//             { to: `${basePath}/services`, label: 'Employee Services', icon: BriefcaseIcon, permission: 'canViewServiceRequests' },
//             { to: `${basePath}/tasks`, label: 'Tasks', icon: ClipboardDocumentListIcon, permission: 'canViewTasks' },
//             { to: `${basePath}/policies`, label: 'HR Policies', icon: DocumentTextIcon, permission: 'canViewHRPolicies' },
//           ],
//         },
//         {
//           title: 'Development',
//           items: [
//             { to: `${basePath}/appraisals`, label: 'Appraisals', icon: UserCircleIcon, permission: 'canViewAppraisals' },
//             { to: `${basePath}/training`, label: 'Training', icon: AcademicCapIcon, permission: 'canViewTraining' },
//           ]
//         },
//         {
//           title: 'System',
//           items: [
//             { to: `${basePath}/settings`, label: 'Settings', icon: Cog6ToothIcon, permission: 'canManageSettings' },
//           ]
//         }
//       ];
//     }
//   };

//   const allNavSections = getNavSections();

//   // Filter nav items based on user permissions
//   const filteredNavSections = allNavSections
//     .map(section => ({
//       ...section,
//       items: section.items.filter(item => safeHasPermission(item.permission))
//     }))
//     .filter(section => section.items.length > 0);

//   const getPageTitle = () => {
//     const path = location.pathname;
//     if (path.includes('/dashboard')) return 'Dashboard';
//     if (path.includes('/personnel')) return 'Personnel';
//     if (path.includes('/payroll')) return 'Payroll';
//     if (path.includes('/attendance')) return 'Attendance';
//     if (path.includes('/reports')) return 'Reports';
//     if (path.includes('/services')) return 'Employee Services';
//     if (path.includes('/tasks')) return 'Tasks';
//     if (path.includes('/policies')) return 'HR Policies';
//     if (path.includes('/appraisals')) return 'Performance Appraisals';
//     if (path.includes('/training')) return 'Training';
//     if (path.includes('/analytics')) return 'Analytics';
//     if (path.includes('/settings')) return 'Settings';
//     if (path.includes('/payslips')) return 'My Payslips';
//     return 'Dashboard';
//   };

//   const sidebarClasses = `
//     w-64
//     bg-gray-800 text-white
//     h-full
//     flex-shrink-0
//     hidden md:flex flex-col
//     py-7
//     transition-all duration-300
//   `;

//   const navLinkBase = `flex items-center space-x-3 my-1 rounded-md transition duration-200`;
//   const navLinkDefault = `py-2 px-3`;
//   const navLinkText = 'text-gray-300 hover:bg-gray-700 hover:text-white';
//   const navLinkActive = `bg-blue-600 bg-opacity-30 text-white font-semibold border-l-4 border-blue-500`;

//   // Logout icon
//   const LogoutIcon = () => (
//     <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//     </svg>
//   );

//   return (
//     <div className="flex h-screen bg-gray-100">
//       {/* Mobile Menu Button */}
//       <button
//         onClick={() => setSidebarOpen(!sidebarOpen)}
//         className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors"
//         aria-label="Toggle menu"
//       >
//         <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
//         </svg>
//       </button>

//       {/* Sidebar for Mobile */}
//       {sidebarOpen && (
//         <div className="fixed inset-0 z-40 md:hidden">
//           <div 
//             className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
//             onClick={() => setSidebarOpen(false)}
//           />
          
//           <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white z-50 flex flex-col py-7 shadow-xl">
//             <div className="px-4 mb-6 flex justify-between items-center">
//               <Link to={`${basePath}/dashboard`} className="flex items-center space-x-2" onClick={() => setSidebarOpen(false)}>
//                 <span className="text-2xl font-extrabold text-white tracking-tight">YesPeople</span>
//               </Link>
//               <button 
//                 onClick={() => setSidebarOpen(false)}
//                 className="text-gray-400 hover:text-white transition-colors"
//                 aria-label="Close menu"
//               >
//                 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             </div>
            
//             <nav className="flex-grow px-2 overflow-y-auto">
//               {filteredNavSections.length > 0 ? (
//                 filteredNavSections.map(section => (
//                   <div key={section.title} className="mb-2">
//                     <NavHeading isCompact={isCompact}>{section.title}</NavHeading>
//                     {section.items.map(item => (
//                       <NavLink
//                         key={item.to}
//                         to={item.to}
//                         end={item.to.endsWith('/dashboard')}
//                         className={({ isActive }) =>
//                           `${navLinkBase} ${navLinkDefault} ${navLinkText} ${isActive ? navLinkActive : ''}`
//                         }
//                         onClick={() => setSidebarOpen(false)}
//                       >
//                         <item.icon className="h-5 w-5" />
//                         <span>{item.label}</span>
//                       </NavLink>
//                     ))}
//                   </div>
//                 ))
//               ) : (
//                 <div className="text-center text-gray-400 py-4 px-2">
//                   <p className="font-semibold">Welcome, {userName}!</p>
//                   <p className="text-sm mt-1">Your role: {roleName}</p>
//                   <p className="text-xs mt-3">No menu items available for your role.</p>
//                   <p className="text-xs">Contact your administrator for access.</p>
//                 </div>
//               )}
//             </nav>
//           </div>
//         </div>
//       )}

//       {/* Sidebar for Desktop - Navigation Only */}
//       <aside className={sidebarClasses}>
//         <div className="px-4 mb-6">
//           <Link to={`${basePath}/dashboard`} className="flex items-center space-x-2 group">
//             <span className="text-2xl font-extrabold text-white tracking-tight group-hover:text-blue-300 transition-colors">
//               YesPeople
//             </span>
//           </Link>
//         </div>
        
//         <nav className="flex-grow px-2 overflow-y-auto">
//           {filteredNavSections.length > 0 ? (
//             filteredNavSections.map(section => (
//               <div key={section.title} className="mb-2">
//                 <NavHeading isCompact={isCompact}>{section.title}</NavHeading>
//                 {section.items.map(item => (
//                   <NavLink
//                     key={item.to}
//                     to={item.to}
//                     end={item.to.endsWith('/dashboard')}
//                     className={({ isActive }) =>
//                       `${navLinkBase} ${navLinkDefault} ${navLinkText} ${isActive ? navLinkActive : ''}`
//                     }
//                   >
//                     <item.icon className="h-5 w-5" />
//                     <span>{item.label}</span>
//                   </NavLink>
//                 ))}
//               </div>
//             ))
//           ) : (
//             <div className="text-center text-gray-400 py-4 px-2">
//               <p className="font-semibold">Welcome, {userName}!</p>
//               <p className="text-sm mt-1">Your role: {roleName}</p>
//               <p className="text-xs mt-3">No menu items available for your role.</p>
//               <p className="text-xs">Contact your administrator for access.</p>
//             </div>
//           )}
//         </nav>
//       </aside>

//       {/* Main content */}
//       <div className="flex-1 flex flex-col overflow-hidden">
//         {/* Header with Notification Bell and User Menu */}
//         <header className="bg-white border-b border-gray-200 shadow-sm">
//           <div className="flex justify-between items-center px-6 py-3">
//             <div className="md:hidden w-12"></div>
            
//             <div className="text-xl font-semibold text-gray-800">
//               {getPageTitle()}
//             </div>
            
//             {/* Right side - Notification Bell + User Menu */}
//             <div className="flex items-center space-x-4">
              
//               {/* 🔔 NOTIFICATION BELL - ONLY FOR HR (hr@yesagain.com) */}
//               {isHR && (
//                 <div className="relative" ref={notificationsRef}>
//                   <button
//                     onClick={handleNotificationClick}
//                     className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
//                     title="Pending requests"
//                   >
//                     <BellIcon className="h-5 w-5" />
//                     {pendingRequestsCount > 0 && (
//                       <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white animate-pulse">
//                         {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
//                       </span>
//                     )}
//                   </button>

//                   {/* Notifications Dropdown */}
//                   {showNotifications && (
//                     <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
//                       <div className="px-4 py-3 border-b border-gray-100">
//                         <h3 className="text-sm font-semibold text-gray-800">Pending Requests</h3>
//                         <p className="text-xs text-gray-500 mt-0.5">
//                           {pendingRequestsCount} request{pendingRequestsCount !== 1 ? 's' : ''} waiting for review
//                         </p>
//                       </div>
                      
//                       {pendingRequestsCount > 0 ? (
//                         <div className="max-h-96 overflow-y-auto">
//                           {/* Quick preview of pending requests */}
//                           <div className="px-4 py-3 text-center">
//                             <Link
//                               to="/admin/services"
//                               className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
//                               onClick={() => setShowNotifications(false)}
//                             >
//                               <span>View all requests in Employee Services</span>
//                               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                               </svg>
//                             </Link>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className="px-4 py-6 text-center text-gray-500">
//                           <p className="text-sm">No pending requests</p>
//                         </div>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}
              
//               {/* User Name and Role */}
//               <div className="hidden md:block text-right">
//                 <div className="text-sm font-semibold text-gray-700">
//                   {userName}
//                 </div>
//                 <div className="text-xs text-gray-500">
//                   {roleName}
//                 </div>
//               </div>
              
//               {/* Avatar */}
//               <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
//                 {userInitials}
//               </div>
              
//               {/* Logout Button */}
//               <button
//                 onClick={logout}
//                 className="flex items-center space-x-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 group"
//                 title="Sign out"
//               >
//                 <LogoutIcon />
//                 <span className="text-sm font-medium hidden lg:inline">Sign out</span>
//               </button>
//             </div>
//           </div>
//         </header>

//         <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
//           <div className="max-w-7xl mx-auto">
//             <Outlet />
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };

// export default MainLayout;