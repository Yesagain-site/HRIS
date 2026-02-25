import React from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HRDataProvider } from './hooks/useHRData';
import MainLayout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PersonnelPage from './pages/PersonnelPage';
import PayrollPage from './pages/PayrollPage';
import AttendancePage from './pages/AttendancePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PerformanceAppraisalPage from './pages/PerformanceAppraisalPage';
import TrainingPage from './pages/TrainingPage';
import TasksPage from './pages/TasksPage';
import EmployeeServicesPage from './pages/EmployeeServicesPage';
import HRPolicyPage from './pages/HRPolicyPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { ProtectedRoute } from './components/ProtectedRoute'; 
import PayrollDetailPage from './pages/PayrollDetailPage';

// --- SIMPLE THEME PROVIDER ---
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    const root = document.documentElement;
    const cssVariables = {
      '--color-primary-50': '#eef2ff',
      '--color-primary-100': '#e0e7ff',
      '--color-primary-200': '#c7d2fe',
      '--color-primary-300': '#a5b4fc',
      '--color-primary-400': '#818cf8',
      '--color-primary-500': '#6366f1',
      '--color-primary-600': '#4f46e5',
      '--color-primary-700': '#4338ca',
      '--color-primary-800': '#3730a3',
      '--color-primary-900': '#312e81',
      '--color-background': '#f3f4f6',
      '--color-card': '#ffffff',
      '--color-text-primary': '#1f2937',
      '--color-text-secondary': '#6b7280',
      '--color-border': '#e5e7eb',
      '--color-input-bg': '#ffffff',
      '--color-modal-overlay': 'rgba(0, 0, 0, 0.5)',
    };
    for (const [key, value] of Object.entries(cssVariables)) {
      root.style.setProperty(key, value as string);
    }
  }, []);
  return <>{children}</>;
};

// Main App Content
const AppContent: React.FC = () => {
  const { authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><HRDataProvider><MainLayout /></HRDataProvider></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="personnel/*" element={<PersonnelPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="payroll/:entryId" element={<PayrollDetailPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="services" element={<EmployeeServicesPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="policies" element={<HRPolicyPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="appraisals" element={<PerformanceAppraisalPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;