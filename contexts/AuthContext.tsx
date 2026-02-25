import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: {
    _id: string;
    name: string;
    permissions: string[];
  };
  employeeId?: string;
}

interface Employee {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  workStatus: string;
  // Add other employee fields as needed
}

interface AuthContextType {
  currentUser: User | null;
  employeeDetails: Employee | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  isAuthenticated: boolean;
  authReady: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role?.name === 'Admin' || currentUser?.role?.name === 'Super Admin';
  const isManager = currentUser?.role?.name === 'Manager';
  const isEmployee = currentUser?.role?.name === 'Employee';

  // Function to fetch employee details
  const fetchEmployeeDetails = async (employeeId: string) => {
    try {
      console.log('🔍 Fetching employee details for ID:', employeeId);
      const employee = await api.getEmployee(employeeId);
      setEmployeeDetails(employee);
      console.log('✅ Employee details loaded:', employee);
      return employee;
    } catch (error) {
      console.error('❌ Failed to fetch employee details:', error);
      setEmployeeDetails(null);
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('yespeople_current_user');
      const token = localStorage.getItem('yespeople_jwt_token');
      
      if (storedUser && token) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setCurrentUser(parsedUser);
          console.log('✅ Restored user from storage:', parsedUser.username);
          
          // Fetch employee details if user has employeeId
          if (parsedUser.employeeId) {
            await fetchEmployeeDetails(parsedUser.employeeId);
          } else {
            console.log('⚠️ User has no associated employeeId');
            
            // Try to find employee by email as fallback
            if (parsedUser.email) {
              try {
                // You might need to add an API endpoint to find employee by email
                const employees = await api.getEmployees();
                const matchingEmployee = employees.find(
                  (emp: any) => emp.email?.toLowerCase() === parsedUser.email.toLowerCase()
                );
                
                if (matchingEmployee) {
                  console.log('✅ Found employee by email:', matchingEmployee);
                  setEmployeeDetails(matchingEmployee);
                  
                  // Update user record with employeeId for future logins
                  // This would require an API call to update the user
                }
              } catch (error) {
                console.error('❌ Failed to find employee by email:', error);
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          localStorage.removeItem('yespeople_current_user');
          localStorage.removeItem('yespeople_jwt_token');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login for:', username);
      const response = await api.login(username, password);
      
      // Store token and user
      localStorage.setItem('yespeople_jwt_token', response.access_token);
      localStorage.setItem('yespeople_current_user', JSON.stringify(response.user));
      
      console.log('✅ Login successful for:', response.user.username);
      console.log('👤 Role:', response.user.role?.name);
      console.log('👤 Employee ID:', response.user.employeeId);
      
      setCurrentUser(response.user);
      
      // Fetch employee details after login if employeeId exists
      if (response.user.employeeId) {
        await fetchEmployeeDetails(response.user.employeeId);
      } else {
        console.log('⚠️ User has no associated employeeId');
        
        // Try to find employee by email as fallback
        if (response.user.email) {
          try {
            const employees = await api.getEmployees();
            const matchingEmployee = employees.find(
              (emp: any) => emp.email?.toLowerCase() === response.user.email.toLowerCase()
            );
            
            if (matchingEmployee) {
              console.log('✅ Found employee by email:', matchingEmployee);
              setEmployeeDetails(matchingEmployee);
              
              // Optionally update the user with the employeeId for future logins
              // This would require an API call to update the user
            }
          } catch (error) {
            console.error('❌ Failed to find employee by email:', error);
          }
        }
        
        setEmployeeDetails(null);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    // Clear ALL auth data
    localStorage.removeItem('yespeople_jwt_token');
    localStorage.removeItem('yespeople_current_user');
    
    // Clear any other app-specific storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('payroll_') || key.startsWith('attendance_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setCurrentUser(null);
    setEmployeeDetails(null);
    console.log('✅ Logged out, all storage cleared');
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    if (!currentUser.role) return false;
    
    // Admin role has all permissions
    if (currentUser.role.name === 'Admin' || currentUser.role.name === 'Super Admin') {
      return true;
    }
    
    // Check specific permission
    return currentUser.role.permissions?.includes(permission) || false;
  };

  const isAuthenticated = !!currentUser;
  const authReady = !loading;

  const value = {
    currentUser,
    employeeDetails,
    login,
    logout,
    hasPermission,
    loading,
    isAuthenticated,
    authReady,
    isAdmin,
    isManager,
    isEmployee
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};