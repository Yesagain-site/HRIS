import { useEffect, useRef } from 'react';
import { useHRData } from './useHRData';
import { useAuth } from '../contexts/AuthContext';

// Global flag to ensure data is loaded only once across the entire app
let isDataLoaded = false;
let isLoading = false;

export const useEmployeeData = () => {
  const { refreshEmployees, employees } = useHRData();
  const { isAuthenticated, authReady } = useAuth();
  const loadAttempted = useRef(false);

  useEffect(() => {
    
    if (authReady && isAuthenticated && !isDataLoaded && !isLoading && !loadAttempted.current) {
      console.log('📊 useEmployeeData: Loading employee data for dashboard...');
      isLoading = true;
      loadAttempted.current = true;
      
      refreshEmployees().then(() => {
        isDataLoaded = true;
        isLoading = false;
        console.log('✅ useEmployeeData: Employee data loaded successfully');
      }).catch((error) => {
        console.error('❌ useEmployeeData: Failed to load employee data:', error);
        isLoading = false;
        // Reset flag so we can try again
        isDataLoaded = false;
      });
    }
  }, [authReady, isAuthenticated, refreshEmployees]);

  return { employees, isDataLoaded: isDataLoaded && employees.length > 0 };
};


