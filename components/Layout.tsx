import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHRData } from '../hooks/useHRData';
import { useEmployeeData } from '../hooks/useEmployeeData'; // ✅ Add this import
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
  CalendarDaysIcon
} from './Icons';
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
  const { logout, currentUser, authReady, hasPermission } = useAuth();
  const { employees } = useHRData();
  // ✅ This will load employee data immediately when layout mounts
  useEmployeeData();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>('');
  const location = useLocation();
  
  // ✅ Find the employee details from the employees list using employeeId
  // This will update whenever employees array changes
  useEffect(() => {
    if (currentUser?.employeeId) {
      if (employees.length > 0) {
        const employee = employees.find(emp => emp.id === currentUser.employeeId);
        if (employee) {
          const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
          setEmployeeName(fullName || employee.email || currentUser.username);
          console.log('✅ Found employee name:', fullName);
        } else {
          setEmployeeName(currentUser.username);
        }
      } else {
        // If employees not loaded yet, use username as fallback
        setEmployeeName(currentUser.username);
      }
    } else if (currentUser) {
      setEmployeeName(currentUser.username);
    }
  }, [currentUser, employees]);

  // ✅ Wait for auth to be ready
  useEffect(() => {
    if (authReady && currentUser) {
      console.log('✅ User data ready:', currentUser.username);
      setIsUserDataReady(true);
    }
  }, [authReady, currentUser]);

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

  // ✅ Show loading until auth is ready
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
  
  // Safe user data with fallbacks
  const userName = employeeName || currentUser?.username || currentUser?.email || 'User';
  
  const roleName = currentUser?.role?.name || 
                  (currentUser?.role as any)?.name || 
                  'User';
  
  const isCompact = false;
  
  // Define all possible nav items with their required permissions
  const allNavSections = [
    {
      title: 'Main',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: ChartBarIcon, permission: 'canViewDashboard' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { to: '/analytics', label: 'Analytics', icon: ChartBarIcon, permission: 'canViewAnalytics' },
      ],
    },
    {
      title: 'Core HR',
      items: [
        { to: '/personnel', label: 'Personnel', icon: UserGroupIcon, permission: 'canViewPersonnel' },
        { to: '/payroll', label: 'Payroll', icon: CurrencyDollarIcon, permission: 'canViewPayroll' },
        { to: '/attendance', label: 'Attendance', icon: CalendarDaysIcon, permission: 'canViewAttendance' },
        { to: '/reports', label: 'Reports', icon: ChartBarIcon, permission: 'canViewReports' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { to: '/services', label: 'Employee Services', icon: BriefcaseIcon, permission: 'canViewServiceRequests' },
        { to: '/tasks', label: 'Tasks', icon: ClipboardDocumentListIcon, permission: 'canViewTasks' },
        { to: '/policies', label: 'HR Policies', icon: DocumentTextIcon, permission: 'canViewHRPolicies' },
      ],
    },
    {
      title: 'Development',
      items: [
        { to: '/appraisals', label: 'Appraisals', icon: UserCircleIcon, permission: 'canViewAppraisals' },
        { to: '/training', label: 'Training', icon: AcademicCapIcon, permission: 'canViewTraining' },
      ]
    },
    {
      title: 'System',
      items: [
        { to: '/settings', label: 'Settings', icon: Cog6ToothIcon, permission: 'canManageSettings' },
      ]
    }
  ];

  // Filter nav items based on user permissions
  const filteredNavSections = allNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => safeHasPermission(item.permission))
    }))
    .filter(section => section.items.length > 0);

  // Helper function to get page title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'Dashboard';
    if (path.startsWith('/personnel')) return 'Personnel';
    if (path === '/payroll') return 'Payroll';
    if (path === '/attendance') return 'Attendance';
    if (path === '/reports') return 'Reports';
    if (path === '/services') return 'Employee Services';
    if (path === '/tasks') return 'Tasks';
    if (path === '/policies') return 'HR Policies';
    if (path === '/appraisals') return 'Performance Appraisals';
    if (path === '/training') return 'Training';
    if (path === '/analytics') return 'Analytics';
    if (path === '/settings') return 'Settings';
    return 'Dashboard';
  };

  // Sidebar classes
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
              <Link to="/dashboard" className="flex items-center space-x-2" onClick={() => setSidebarOpen(false)}>
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
                        end={item.to === '/dashboard'}
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
            
            <div className="px-4 mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center space-x-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-gray-400 truncate">{roleName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className={sidebarClasses}>
        <div className="px-4 mb-6">
          <Link to="/dashboard" className="flex items-center space-x-2 group">
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
                    end={item.to === '/dashboard'}
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
        
        <div className="px-4 mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-gray-400 truncate">{roleName}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="md:hidden w-12"></div>
          
          <div className="text-xl font-semibold text-gray-800">
            {getPageTitle()}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="font-semibold text-gray-800">
                {userName}  {/* ✅ This now shows the employee name immediately */}
              </div>
              <div className="text-sm text-gray-600">
                {roleName}
              </div>
            </div>
            
            <div className="relative group">
              <UserCircleIcon className="h-10 w-10 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
            </div>
            
            <button 
              onClick={logout} 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-gray-100"
            >
              Logout
            </button>
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