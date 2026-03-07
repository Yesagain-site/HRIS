import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('Admin' | 'Super Admin' | 'Manager' | 'Employee')[];
  redirectPath?: string;
}

/**
 * RoleBasedRoute Component
 * 
 * Protects routes based on user roles and redirects to appropriate dashboards
 * 
 * Usage:
 * <RoleBasedRoute allowedRoles={['Admin', 'Super Admin']}>
 *   <AdminDashboard />
 * </RoleBasedRoute>
 */
const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles,
  redirectPath 
}) => {
  const { currentUser, isAuthenticated, authReady } = useAuth();

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

  // If no role restrictions, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user's role is allowed
  const userRole = currentUser?.role?.name;
  const hasAccess = userRole && allowedRoles.includes(userRole as any);

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on user role
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    // Default redirects based on role
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userRole === 'Manager') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default RoleBasedRoute;