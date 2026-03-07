import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * DashboardRouter Component
 * 
 * Automatically redirects users to the appropriate dashboard based on their role
 * Use this as the default route after login
 * 
 * Usage in routing:
 * <Route path="/dashboard" element={<DashboardRouter />} />
 */
const DashboardRouter: React.FC = () => {
  const { currentUser, authReady, isAuthenticated } = useAuth();

  // Show loading while checking auth
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  const userRole = currentUser?.role?.name;

  console.log('🔀 DashboardRouter: Routing user with role:', userRole);

  if (userRole === 'Admin' || userRole === 'Super Admin') {
    console.log('→ Redirecting to admin dashboard');
    return <Navigate to="/admin/dashboard" replace />;
  } else if (userRole === 'Manager') {
    // You can choose whether managers see admin or employee dashboard
    // Option 1: Managers see admin dashboard (default)
    console.log('→ Redirecting manager to admin dashboard');
    return <Navigate to="/admin/dashboard" replace />;
    
    // Option 2: Managers see employee dashboard
    // console.log('→ Redirecting manager to employee dashboard');
    // return <Navigate to="/employee/dashboard" replace />;
  } else {
    // Default to employee dashboard for all other roles
    console.log('→ Redirecting to employee dashboard');
    return <Navigate to="/employee/dashboard" replace />;
  }
};

export default DashboardRouter;