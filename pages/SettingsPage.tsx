import React, { useState, useEffect, useMemo, FC, useCallback } from 'react';
import { Card, Input, Button, ToggleSwitch, Modal, Select, ConfirmationModal, Textarea } from '../components/UI';
import { CheckIcon, PlusIcon, PencilIcon, TrashIcon, SunIcon, ClockIcon } from '../components/Icons';
import { useHRData } from '../hooks/useHRData';
import { 
    SystemSettings, User, Role, Employee, Permission, CustomFieldDef, 
    PayComponent, PayComponentType, PayCycle, RoundingRule, GLCodeMapping,
    AttendanceRule, APIKey, Webhook, IntegrationSettings, SSOSettings,
    NotificationSetting, NotificationRecipient, UIThemeSettings
} from '../types';
import { api } from '../services/api';

const TABS = {
    'company': 'Company Profile',
    'ui': 'UI Management',
    'modules': 'Module Management',
    'users': 'User Management',
    'roles': 'Roles & Permissions',
    'documents': 'Document Expiry Rules',
    'fields': 'Custom Fields',
    'payroll': 'Payroll Settings',
    'attendance': 'Attendance Rules',
    'integrations': 'Integrations',
    'notifications': 'Notifications',
    'audit': 'Audit & Logs'
};

const ALL_PERMISSIONS: { name: Permission, group: string, description: string }[] = [
    { name: 'canViewDashboard', group: 'General', description: 'View the main dashboard' },
    { name: 'canViewAnalytics', group: 'General', description: 'Access the HR Analytics page' },
    { name: 'canViewPersonnel', group: 'Personnel', description: 'View employee list and profiles' },
    { name: 'canManagePersonnel', group: 'Personnel', description: 'Add, edit, and delete employees' },
    { name: 'canViewPayroll', group: 'Payroll', description: 'View payroll data and payslips' },
    { name: 'canManagePayroll', group: 'Payroll', description: 'Generate payroll and manage salaries' },
    { name: 'canViewAttendance', group: 'Attendance', description: 'View attendance records and shifts' },
    { name: 'canManageAttendance', group: 'Attendance', description: 'Manage shifts, holidays, and attendance data' },
    { name: 'canViewTasks', group: 'Operations', description: 'View the company task board' },
    { name: 'canManageTasks', group: 'Operations', description: 'Create, edit, and assign tasks' },
    { name: 'canViewServiceRequests', group: 'Operations', description: 'View own or all employee service requests' },
    { name: 'canManageServiceRequests', group: 'Operations', description: 'Approve or reject service requests' },
    { name: 'canViewHRPolicies', group: 'Operations', description: 'View HR policies' },
    { name: 'canManageHRPolicies', group: 'Operations', description: 'Create and manage HR policies' },
    { name: 'canViewReports', group: 'System', description: 'Access and generate reports' },
    { name: 'canViewAppraisals', group: 'Development', description: 'View performance appraisals' },
    { name: 'canManageAppraisals', group: 'Development', description: 'Conduct and save performance appraisals' },
    { name: 'canViewTraining', group: 'Development', description: 'View training programs and sessions' },
    { name: 'canManageTraining', group: 'Development', description: 'Manage training programs and enrollments' },
    { name: 'canManageSettings', group: 'System', description: 'Access and modify system settings' },
];

const PERMISSION_GROUPS = ['General', 'Personnel', 'Payroll', 'Attendance', 'Operations', 'Development', 'System'];

const SaveBar: FC<{ onSave: () => void; isSaving: boolean; saveSuccess: boolean }> = ({ onSave, isSaving, saveSuccess }) => (
    <div className="flex justify-end items-center gap-4 mt-6 pt-4 border-t border-[var(--color-border)]">
        {saveSuccess && <span className="flex items-center text-green-600 text-sm"><CheckIcon className="h-5 w-5 mr-1" />Saved!</span>}
        <Button onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
    </div>
);

const defaultSystemSettings: SystemSettings = {
    companyName: 'YesPeople HRIS',
    workWeekStart: 0,
    defaultWorkHoursPerDay: 8,
    overtimeRate: 1.5,
    leaveApprovalWorkflow: 'Manager then HR',
    payrollCycle: 'Monthly',
    uiSettings: {
        themeColor: 'indigo',
        themeMode: 'light',
        navStyle: 'default'
    },
    enabledModules: {
        payroll: true,
        attendance: true,
        training: true,
        appraisals: true
    },
    documentExpiryRules: {
        passport: [90, 60, 30],
        visa: [90, 60, 30],
        eid: [90, 60, 30]
    },
    customFields: [],
    payrollSettings: {
        payCycle: 'Monthly' as PayCycle,
        roundingRule: 'Nearest' as RoundingRule,
        payrollPeriodStartDate: '1',
        payrollPeriodEndDate: '30',
        payComponents: [],
        glCodeMappings: []
    },
    attendanceRules: {
        workdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        graceTimeMinutes: 15,
        overtimeMultipliers: {
            weekday: 1.5,
            weekend: 2.0,
            holiday: 2.5
        }
    },
    integrationSettings: {
        apiKeys: [],
        webhooks: [],
        sso: {
            enabled: false,
            provider: 'SAML'
        }
    },
    notificationSettings: []
};

const getEmployeeDisplayName = (employee?: any) => {
    if (!employee) return 'N/A';
    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    
    if (firstName && lastName) {
        return `${firstName} ${lastName}`;
    } else if (firstName) {
        return firstName;
    } else if (lastName) {
        return lastName;
    }
    
    return 'N/A';
};

// --- Section Components ---
const UIManagementSection: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const loadSettings = async () => {
        try {
            console.log('Loading UI settings...');
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.log('Using default UI settings');
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleSettingChange = (field: keyof UIThemeSettings, value: string) => {
        const newSettings = {
            ...settings,
            uiSettings: { ...settings.uiSettings, [field]: value }
        };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const saveSettings = async (newSettings: SystemSettings) => {
        setIsSaving(true);
        try {
            console.log('Saving settings:', newSettings);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const themes: { name: UIThemeSettings['themeColor'], color: string }[] = [
        { name: 'indigo', color: '#4f46e5' },
        { name: 'teal', color: '#0d9488' },
        { name: 'rose', color: '#e11d48' },
        { name: 'slate', color: '#475569' },
    ];

    const navStyles = [
        { name: 'default', label: 'Default', description: 'Standard size and layout.' },
        { name: 'compact', label: 'Compact', description: 'Smaller text and icons.' },
    ];

    return (
        <div className="space-y-6">
            <Card title="Theme Mode">
                 <p className="text-sm text-[var(--color-text-secondary)] mb-4">Switch between a light or dark theme for the entire application.</p>
                 <div className="flex gap-4">
                     <button
                        onClick={() => handleSettingChange('themeMode', 'light')}
                        className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${settings.uiSettings.themeMode === 'light' ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-100)]' : 'border-[var(--color-border)] hover:border-gray-300'}`}
                     >
                        <SunIcon className="h-6 w-6 text-yellow-500"/>
                        <span className="font-bold text-lg text-[var(--color-text-primary)]">Light</span>
                     </button>
                      <button
                        onClick={() => handleSettingChange('themeMode', 'dark')}
                        className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${settings.uiSettings.themeMode === 'dark' ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-100)]' : 'border-[var(--color-border)] hover:border-gray-500'}`}
                     >
                        <ClockIcon className="h-6 w-6 text-indigo-400"/>
                        <span className="font-bold text-lg text-[var(--color-text-primary)]">Dark</span>
                     </button>
                 </div>
            </Card>   
            <Card title="Accent Color">
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Select a primary color for buttons, links, and highlights across the application.</p>
                <div className="flex gap-4">
                    {themes.map(theme => (
                        <button 
                            key={theme.name} 
                            onClick={() => handleSettingChange('themeColor', theme.name)} 
                            className="flex items-center gap-2 p-2 rounded-lg border-2 transition-colors"
                            style={{ borderColor: settings.uiSettings.themeColor === theme.name ? theme.color : 'transparent' }}
                        >
                            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.color }}></div>
                            <span className="capitalize font-medium text-[var(--color-text-primary)]">{theme.name}</span>
                        </button>
                    ))}
                </div>
            </Card>

            <Card title="Navigation Bar Style">
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Choose the appearance of the main sidebar navigation.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {navStyles.map(style => (
                        <div 
                            key={style.name} 
                            onClick={() => handleSettingChange('navStyle', style.name)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${settings.uiSettings.navStyle === style.name ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-100)]' : 'border-[var(--color-border)] hover:border-gray-300'}`}
                        >
                            <h4 className="font-bold text-[var(--color-text-primary)]">{style.label}</h4>
                            <p className="text-xs text-[var(--color-text-secondary)]">{style.description}</p>
                        </div>
                    ))}
                </div>  
            </Card>
            <SaveBar onSave={() => saveSettings(settings)} isSaving={isSaving} saveSuccess={saveSuccess} />
        </div>
    );
};

const CompanyProfileSection: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const loadSettings = async () => {
        try {
            console.log('Loading company settings...');
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.log('Using default company settings');
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ 
            ...prev, 
            [name]: name === 'fiscalYearStartMonth' ? parseInt(value) : value 
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log('Saving company settings:', settings);
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Failed to save company settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card title="Company Profile">
            <div className="space-y-4">
                <Input 
                    label="Company Name" 
                    name="companyName" 
                    value={settings.companyName} 
                    onChange={handleChange} 
                />
                <Input 
                    label="Currency Symbol" 
                    name="currency" 
                    value={settings.currency || 'AED'} 
                    onChange={handleChange} 
                    placeholder="e.g., AED, USD" 
                />
                <Select 
                    label="Timezone" 
                    name="timezone" 
                    value={settings.timezone} 
                    onChange={handleChange}
                >
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                </Select>
                <Select 
                    label="Work Week Start Day" 
                    name="workWeekStart" 
                    value={settings.workWeekStart} 
                    onChange={handleChange}
                >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                </Select>
            </div>
            <SaveBar onSave={handleSave} isSaving={isSaving} saveSuccess={saveSuccess} />
        </Card>
    );
};

const ModuleManagementSection: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [isSaving, setIsSaving] = useState(false);

    const loadSettings = async () => {
        try {
            console.log('Loading module settings...');
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.log('Using default module settings');
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleToggleChange = async (module: keyof SystemSettings['enabledModules'], enabled: boolean) => {
        const newSettings = {
            ...settings,
            enabledModules: { ...settings.enabledModules, [module]: enabled },
        };
        setSettings(newSettings);
        
        try {
            setIsSaving(true);
            console.log(`Updating module ${module}: ${enabled}`);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Failed to update module settings:', error);
            setSettings(settings);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card title="Module Management">
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                Enable or disable modules to customize the application. Changes take effect on next page load.
            </p>
            <div className="p-4 border border-[var(--color-border)] rounded-md space-y-4">
                <ToggleSwitch 
                    label="Payroll Module" 
                    enabled={settings.enabledModules.payroll} 
                    onChange={(e) => handleToggleChange('payroll', e)} 
                    disabled={isSaving}
                />
                <hr className="border-[var(--color-border)]" />
                <ToggleSwitch 
                    label="Attendance Module" 
                    enabled={settings.enabledModules.attendance} 
                    onChange={(e) => handleToggleChange('attendance', e)} 
                    disabled={isSaving}
                />
                <hr className="border-[var(--color-border)]" />
                <ToggleSwitch 
                    label="Training Module" 
                    enabled={settings.enabledModules.training} 
                    onChange={(e) => handleToggleChange('training', e)} 
                    disabled={isSaving}
                />
                <hr className="border-[var(--color-border)]" />
                <ToggleSwitch 
                    label="Performance Appraisals Module" 
                    enabled={settings.enabledModules.appraisals} 
                    onChange={(e) => handleToggleChange('appraisals', e)} 
                    disabled={isSaving}
                />
            </div>
            {isSaving && (
                <div className="mt-4 text-sm text-blue-600">
                    Saving changes...
                </div>
            )}
        </Card>
    );
};

// ============ FIXED UserManagementSection - NO BLINKING ============
const UserManagementSection: React.FC = () => {
    const { 
        users = [], 
        roles = [], 
        employees = [], 
        addUser, 
        updateUser, 
        deleteUser,
        loadUsers,
        loadRoles 
    } = useHRData();
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Load data once on mount
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            try {
                if (loadUsers) await loadUsers();
                if (loadRoles) await loadRoles();
            } catch (err) {
                console.error('Error loading user data:', err);
            } finally {
                if (isMounted) {
                    setIsInitialLoad(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array = runs once

    const handleSaveUser = async (userData: any) => {
        try {
            if (editingUser) {
                await updateUser(editingUser.id, userData);
            } else {
                await addUser(userData);
            }
            setIsUserModalOpen(false);
            setEditingUser(null);
            // Refresh after save
            if (loadUsers) await loadUsers();
        } catch (err: any) {
            alert(err?.message || 'Failed to save user');
        }
    };

    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
            if (loadUsers) await loadUsers();
        } catch (err: any) {
            alert(err?.message || 'Failed to delete user');
        }
    };

    // Format users for display with safe access - memoized
    const usersWithDetails = useMemo(() => {
        if (!Array.isArray(users) || !Array.isArray(employees) || !Array.isArray(roles)) {
            return [];
        }
        
        return users.map(user => {
            const employee = employees.find(e => e?.id === user?.employeeId);
            const employeeName = employee 
                ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() 
                : 'N/A';
            const role = roles.find(r => r?.id === user?.roleId);
            const roleName = role?.name || 'N/A';
            
            return {
                ...user,
                employeeName: employeeName || 'N/A',
                roleName: roleName
            };
        }).sort((a, b) => (a.username || '').localeCompare(b.username || ''));
    }, [users, employees, roles]);

    if (isInitialLoad) {
        return (
            <Card title="User Management">
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Card>
        );
    }

    return (
        <Card title="User Management">
            <div className="flex justify-end mb-4">
                <Button onClick={() => { 
                    setEditingUser(null); 
                    setIsUserModalOpen(true); 
                }}>
                    <PlusIcon className="h-5 w-5 mr-2" />Add New User
                </Button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-border)]">
                    <thead className="bg-opacity-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {usersWithDetails.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            usersWithDetails.map(user => (
                                <tr key={user.id || user._id}>
                                    <td className="px-6 py-4">{user.username || 'N/A'}</td>
                                    <td className="px-6 py-4">{user.email || 'N/A'}</td>
                                    <td className="px-6 py-4">{user.employeeName}</td>
                                    <td className="px-6 py-4">{user.roleName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                            user.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 space-x-2">
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            onClick={() => { 
                                                setEditingUser(user); 
                                                setIsUserModalOpen(true); 
                                            }}
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            onClick={() => setUserToDelete(user)}
                                            disabled={user.roleName === 'Admin' && users.filter(u => u.roleName === 'Admin').length <= 1}
                                            title={user.roleName === 'Admin' ? 'Cannot delete the last admin' : ''}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <UserFormModal 
                isOpen={isUserModalOpen} 
                onClose={() => {
                    setIsUserModalOpen(false);
                    setEditingUser(null);
                }} 
                onSave={handleSaveUser} 
                user={editingUser}
                roles={roles}
                employees={employees}
                users={users}
            />
            
            <ConfirmationModal
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDeleteUser}
                title="Delete User"
                message={`Are you sure you want to delete user "${userToDelete?.username}"?`}
            />
        </Card>
    );
};

// ============ FIXED UserFormModal with Password Field for Edit ============
const UserFormModal: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (user: any) => void;
    user: any | null; 
    roles: Role[]; 
    employees: Employee[];
    users: UserAccount[];
}> = ({ isOpen, onClose, onSave, user, roles = [], employees = [], users = [] }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        employeeId: '',
        roleId: '',
        email: '',
        isActive: true
    });
    
    // 🔴 NEW: State to track if password should be changed
    const [changePassword, setChangePassword] = useState(false);

    // Get already assigned employee IDs
    const assignedEmployeeIds = useMemo(() => {
        return users
            .filter(u => u.employeeId) // Only users with assigned employees
            .map(u => u.employeeId);
    }, [users]);

    // Filter employees to show only those NOT already assigned to a user
    // And sort alphabetically by name
    const availableEmployees = useMemo(() => {
        return employees
            .filter(emp => {
                // If editing an existing user, include their currently assigned employee
                if (user && user.employeeId === emp.id) {
                    return true;
                }
                // Otherwise, only show employees not already assigned
                return !assignedEmployeeIds.includes(emp.id);
            })
            .sort((a, b) => {
                const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
                const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });
    }, [employees, assignedEmployeeIds, user]);

    useEffect(() => {
        if (isOpen) {
            if (user) {
                setFormData({
                    username: user.username || '',
                    password: '', // Always empty for security
                    employeeId: user.employeeId || '',
                    roleId: user.roleId || '',
                    email: user.email || '',
                    isActive: user.isActive !== undefined ? user.isActive : true
                });
                // Reset password change state when opening modal
                setChangePassword(false);
            } else {
                setFormData({
                    username: '',
                    password: '',
                    employeeId: availableEmployees.length > 0 ? availableEmployees[0]?.id || '' : '',
                    roleId: roles.length > 0 ? roles[0]?.id || '' : '',
                    email: '',
                    isActive: true
                });
                setChangePassword(false);
            }
        }
    }, [user, isOpen, availableEmployees, roles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // If editing and changePassword is false, remove password from formData
        const submitData = { ...formData };
        if (user && !changePassword) {
            delete submitData.password;
        }
        
        onSave(submitData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User' : 'Add New User'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Employee dropdown - First in order */}
                <Select
                    label="Employee"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select an employee</option>
                    {availableEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                            {getEmployeeDisplayName(emp)}
                        </option>
                    ))}
                </Select>
                
                {/* 2. Username - Second in order */}
                <Input
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={!!user} // Disable username editing for existing users
                    autoComplete="off"
                />
                
                {/* 3. Password - Third in order (with change option for edit) */}
                {!user ? (
                    // New user - password required
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Enter password"
                        autoComplete="new-password"
                    />
                ) : (
                    // Edit user - optional password change
                    <div className="space-y-2">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="changePassword"
                                checked={changePassword}
                                onChange={(e) => setChangePassword(e.target.checked)}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <label htmlFor="changePassword" className="ml-2 text-sm text-gray-700">
                                Change Password
                            </label>
                        </div>
                        
                        {changePassword && (
                            <Input
                                label="New Password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter new password"
                                autoComplete="new-password"
                            />
                        )}
                    </div>
                )}
                
                {/* 4. Email - Fourth in order */}
                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@example.com"
                    required
                />
                
                {/* 5. Role - Fifth in order */}
                <Select
                    label="Role"
                    name="roleId"
                    value={formData.roleId}
                    onChange={handleChange}
                    required
                >
                    <option value="">Select a role</option>
                    {roles.map(role => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </Select>
                
                {/* 6. Active checkbox - Last */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isActive"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                        Active Account
                    </label>
                </div>
                
                {availableEmployees.length === 0 && !user && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-700">
                            No employees available. All employees already have user accounts.
                        </p>
                    </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={!user && availableEmployees.length === 0}>
                        {user ? 'Update User' : 'Add User'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// ============ FIXED RolesPermissionsSection - NO BLINKING ============
const RolesPermissionsSection: React.FC = () => {
    const { roles = [], users = [], addRole, updateRole, deleteRole, loadRoles } = useHRData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleToDelete, setRoleToDelete] = useState<any>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Load data once on mount
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            try {
                if (loadRoles) await loadRoles();
            } catch (err) {
                console.error('Error loading roles:', err);
            } finally {
                if (isMounted) {
                    setIsInitialLoad(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    }, []); // Empty dependency array = runs once

    const handleSaveRole = async (roleData: any) => {
        try {
            if (editingRole) {
                await updateRole(editingRole.id, roleData);
            } else {
                await addRole(roleData);
            }
            setIsModalOpen(false);
            setEditingRole(null);
            if (loadRoles) await loadRoles();
        } catch (err: any) {
            alert(err?.message || 'Failed to save role');
        }
    };

    const handleConfirmDelete = async () => {
        if (!roleToDelete) return;
        try {
            await deleteRole(roleToDelete.id);
            setRoleToDelete(null);
            if (loadRoles) await loadRoles();
        } catch (err: any) {
            alert(err?.message || 'Failed to delete role');
        }
    };

    const rolesWithDetails = useMemo(() => {
        if (!Array.isArray(roles) || !Array.isArray(users)) {
            return [];
        }
        
        return roles.map(role => ({
            ...role,
            userCount: users.filter(user => user?.roleId === role?.id).length || 0
        }));
    }, [roles, users]);

    if (isInitialLoad) {
        return (
            <Card title="Roles & Permissions">
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Card>
        );
    }

    return (
        <Card title="Roles & Permissions">
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                    Manage user roles and their permissions.
                </p>
                <Button onClick={() => { 
                    setEditingRole(null); 
                    setIsModalOpen(true); 
                }}>
                    <PlusIcon className="h-5 w-5 mr-2" />Add New Role
                </Button>
            </div>
            
            <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
                <table className="min-w-full divide-y divide-[var(--color-border)]">
                    <thead className="bg-[var(--color-bg-secondary)]">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Role Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Permissions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Users</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {rolesWithDetails.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                    No roles found
                                </td>
                            </tr>
                        ) : (
                            rolesWithDetails.map(role => (
                                <tr key={role.id || role._id}>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold">{role.name || 'Unnamed Role'}</div>
                                        {role.isSystem && (
                                            <span className="text-xs text-gray-500">System Role</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-xs">
                                            <div className="text-sm font-medium mb-1">
                                                {role.permissions?.length || 0} permission(s)
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {role.permissions?.slice(0, 3).join(', ') || 'No permissions'}
                                                {(role.permissions?.length || 0) > 3 && '...'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            role.userCount > 0 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 space-x-2">
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            onClick={() => { 
                                                setEditingRole(role); 
                                                setIsModalOpen(true); 
                                            }}
                                            disabled={role.isSystem}
                                            title={role.isSystem ? "Cannot edit system role" : ""}
                                        >
                                            <PencilIcon className="h-4 w-4 mr-1" /> Edit
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="danger" 
                                            onClick={() => setRoleToDelete(role)}
                                            disabled={role.isSystem || role.userCount > 0}
                                            title={
                                                role.isSystem 
                                                    ? "Cannot delete system role"
                                                    : role.userCount > 0
                                                        ? `${role.userCount} user(s) assigned`
                                                        : ""
                                            }
                                        >
                                            <TrashIcon className="h-4 w-4 mr-1" /> Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            <RoleFormModal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingRole(null);
                }} 
                onSave={handleSaveRole} 
                role={editingRole}
            />
            
            <ConfirmationModal
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Role"
                message={`Are you sure you want to delete the role "${roleToDelete?.name}"?`}
            />
        </Card>
    );
};

// ============ FIXED RoleFormModal ============
const RoleFormModal: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (role: any) => void; 
    role: any | null;
}> = ({ isOpen, onClose, onSave, role }) => {
    const [formData, setFormData] = useState({
        name: '',
        permissions: [] as string[]
    });

    useEffect(() => {
        if (isOpen) {
            if (role) {
                setFormData({
                    name: role.name || '',
                    permissions: Array.isArray(role.permissions) ? role.permissions : []
                });
            } else {
                setFormData({
                    name: '',
                    permissions: []
                });
            }
        }
    }, [role, isOpen]);

    const handlePermissionChange = (permission: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: checked 
                ? [...prev.permissions, permission]
                : prev.permissions.filter(p => p !== permission)
        }));
    };

    const handleSelectAllInGroup = (group: string, select: boolean) => {
        const groupPermissions = ALL_PERMISSIONS
            .filter(p => p.group === group)
            .map(p => p.name);
        
        setFormData(prev => {
            const newPermissions = new Set(prev.permissions);
            groupPermissions.forEach(perm => {
                if (select) newPermissions.add(perm);
                else newPermissions.delete(perm);
            });
            return { ...prev, permissions: Array.from(newPermissions) };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={role ? 'Edit Role' : 'Add New Role'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    label="Role Name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="e.g., Manager, HR Admin"
                />
                
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Permissions</h3>
                        <div className="text-sm text-gray-500">
                            {formData.permissions.length} permission(s) selected
                        </div>
                    </div>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto p-4 border border-gray-200 rounded-md">
                        {PERMISSION_GROUPS.map(group => {
                            const groupPermissions = ALL_PERMISSIONS.filter(p => p.group === group);
                            const selectedCount = groupPermissions.filter(p => 
                                formData.permissions.includes(p.name)
                            ).length;
                            const allSelected = selectedCount === groupPermissions.length;
                            
                            return (
                                <div key={group} className="pb-4 last:pb-0">
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                                        <h4 className="font-bold text-sm">{group}</h4>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAllInGroup(group, !allSelected)}
                                            className="text-xs text-blue-600 hover:text-blue-700"
                                        >
                                            {allSelected ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {groupPermissions.map(p => (
                                            <label key={p.name} className="flex items-start p-2 rounded hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    className="mt-1 rounded text-blue-600 border-gray-300"
                                                    checked={formData.permissions.includes(p.name)}
                                                    onChange={e => handlePermissionChange(p.name, e.target.checked)}
                                                />
                                                <div className="ml-3 flex-1">
                                                    <div className="flex items-center">
                                                        <span className="text-sm font-medium">
                                                            {p.name.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {p.description}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        {role ? 'Update Role' : 'Save Role'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

// Placeholder for other sections
const DocumentRulesSection: React.FC = () => (
    <Card title="Document Expiry Rules">
        <p className="text-center text-gray-500 p-8">
            Document expiry rules configuration will be available soon.
        </p>
    </Card>
);

const CustomFieldsSection: React.FC = () => (
    <Card title="Custom Employee Fields">
        <p className="text-center text-gray-500 p-8">
            Custom fields configuration will be available soon.
        </p>
    </Card>
);

// ============ FIXED PayrollSettingsSection with Working Delete ============
const PayrollSettingsSection: React.FC = () => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newPeriod, setNewPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  
  // 🔴 ADD THESE STATES for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  const loadPeriods = async () => {
    setIsLoading(true);
    try {
      // Get only settings-created periods from your existing payroll API
      const response = await api.getSettingsPeriods();
      setPeriods(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load payroll periods:', error);
      setPeriods([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const handleCreatePeriod = async () => {
    try {
      // Calculate month name and dates
      const monthName = months[newPeriod.month - 1].name;
      const startDate = `${newPeriod.year}-${String(newPeriod.month).padStart(2, '0')}-01`;
      const lastDay = new Date(newPeriod.year, newPeriod.month, 0).getDate();
      const endDate = `${newPeriod.year}-${String(newPeriod.month).padStart(2, '0')}-${lastDay}`;

      await api.createSettingsPeriod({
        month: newPeriod.month,
        year: newPeriod.year,
        monthName,
        startDate,
        endDate
      });

      await loadPeriods();
      setShowCreateModal(false);
      
      // Show success message
      alert(`✅ Payroll period for ${monthName} ${newPeriod.year} created successfully!`);
    } catch (error: any) {
      console.error('Failed to create period:', error);
      alert(error?.message || 'Failed to create payroll period');
    }
  };

  // 🔴 FIXED: Delete function with confirmation
  const handleDeleteClick = (period: any) => {
    setPeriodToDelete(period);
    setShowDeleteModal(true);
  };

  // 🔴 NEW: Confirm delete function
  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.deleteSettingsPeriod(periodToDelete.id || periodToDelete._id);
      await loadPeriods();
      setShowDeleteModal(false);
      setPeriodToDelete(null);
      alert(`✅ Payroll period deleted successfully!`);
    } catch (error: any) {
      console.error('Failed to delete period:', error);
      alert(error?.message || 'Failed to delete payroll period');
    } finally {
      setIsDeleting(false);
    }
  };

  // 🔴 NEW: Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPeriodToDelete(null);
  };

  return (
    <Card title="Payroll Period Management">
      <div className="mb-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create New Payroll Period
        </Button>
        <p className="text-sm text-gray-500 mt-2">
          Create payroll periods here. Only these months will appear in the Payroll page.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-3 text-gray-300">📅</div>
              <p className="text-gray-600 mb-2">No payroll periods created yet</p>
              <p className="text-sm text-gray-500">
                Click the button above to create your first payroll period.
              </p>
            </div>
          ) : (
            periods.map(period => (
              <div key={period.id || period._id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{period.monthName} {period.year}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      period.status === 'generated' ? 'bg-green-100 text-green-700' :
                      period.status === 'calculated' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {period.status || 'draft'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Created: {new Date(period.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => handleDeleteClick(period)}
                    title="Delete period"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Create New Payroll Period"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Create a new payroll period. This will make the month available in the Payroll page.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Month"
              value={newPeriod.month}
              onChange={e => setNewPeriod({...newPeriod, month: Number(e.target.value)})}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </Select>
            
            <Select 
              label="Year"
              value={newPeriod.year}
              onChange={e => setNewPeriod({...newPeriod, year: Number(e.target.value)})}
            >
              {[2024,2025,2026,2027,2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Period will be:</strong><br />
              Start: {newPeriod.year}-{String(newPeriod.month).padStart(2, '0')}-01<br />
              End: {newPeriod.year}-{String(newPeriod.month).padStart(2, '0')}-{new Date(newPeriod.year, newPeriod.month, 0).getDate()}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod}>
              Create Period
            </Button>
          </div>
        </div>
      </Modal>

      {/* 🔴 NEW: Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        title="Delete Payroll Period"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center text-5xl mb-4 text-red-500">
            ⚠️
          </div>
          <p className="text-center text-gray-700">
            Are you sure you want to delete <strong>{periodToDelete?.monthName} {periodToDelete?.year}</strong>?
          </p>
          <p className="text-center text-sm text-red-600">
            This action cannot be undone. All payroll data for this period will be permanently deleted.
          </p>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-700">
              <strong>Period details:</strong><br />
              Status: {periodToDelete?.status || 'draft'}<br />
              Dates: {periodToDelete?.startDate && new Date(periodToDelete.startDate).toLocaleDateString()} - {periodToDelete?.endDate && new Date(periodToDelete.endDate).toLocaleDateString()}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Period'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

const AttendanceRulesSection: React.FC = () => (
    <Card title="Attendance Rules">
        <p className="text-center text-gray-500 p-8">
            Attendance rules configuration will be available soon.
        </p>
    </Card>
);

const IntegrationsSection: React.FC = () => (
    <Card title="Integrations">
        <p className="text-center text-gray-500 p-8">
            Integrations configuration will be available soon.
        </p>
    </Card>
);

const NotificationSettingsSection: React.FC = () => (
    <Card title="Notification Settings">
        <p className="text-center text-gray-500 p-8">
            Notification settings configuration will be available soon.
        </p>
    </Card>
);

const PlaceholderSection: React.FC<{ title: string }> = ({ title }) => (
    <Card title={title}>
        <p className="text-center text-gray-500 p-8">
            Configuration for {title} will be available in a future update.
        </p>
    </Card>
);

// --- Main Page Component ---
const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('company');

    const renderContent = () => {
        switch (activeTab) {
            case 'company': return <CompanyProfileSection />;
            case 'ui': return <UIManagementSection />;
            case 'modules': return <ModuleManagementSection />;
            case 'users': return <UserManagementSection />;
            case 'roles': return <RolesPermissionsSection />;
            case 'documents': return <DocumentRulesSection />;
            case 'fields': return <CustomFieldsSection />;
            case 'payroll': return <PayrollSettingsSection />;
            case 'attendance': return <AttendanceRulesSection />;
            case 'integrations': return <IntegrationsSection />;
            case 'notifications': return <NotificationSettingsSection />;
            case 'audit': return <PlaceholderSection title="Audit & Logs" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 items-start">
            <aside className="w-full md:w-64 flex-shrink-0">
                <Card className="p-0">
                    <nav className="flex flex-col">
                        {Object.entries(TABS).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`text-left p-3 font-medium text-sm transition-colors ${
                                    activeTab === key
                                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                                        : 'text-gray-500 hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                </Card>
            </aside>

            <main className="flex-grow w-full">
                {renderContent()}
            </main>
        </div>
    );
};

export default SettingsPage;