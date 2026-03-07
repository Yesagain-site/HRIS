// ============================================================================
// NEW FILE: components/BulkUserUploadModal.tsx
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Select } from './UI';
import { api } from '../services/api';
import { Employee, User, Role } from '../types';

interface BulkUserUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    users: User[];
    roles: Role[];
    onSuccess: () => void;
}

const BulkUserUploadModal: React.FC<BulkUserUploadModalProps> = ({ 
    isOpen, 
    onClose, 
    employees, 
    users, 
    roles, 
    onSuccess 
}) => {
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<any>(null);

    // Get employees that don't have user accounts yet
    const employeesWithoutAccounts = useMemo(() => {
        const userEmployeeIds = users
            .filter(u => u.employeeId)
            .map(u => String(u.employeeId)); // ✅ Ensure strings
        
        return employees
            .filter(emp => {
                const empId = String(emp.id); // ✅ Ensure string
                return !userEmployeeIds.includes(empId);
            })
            .sort((a, b) => {
                const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
                const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
                return nameA.localeCompare(nameB);
            });
    }, [employees, users]);

    // Find Employee role
    const employeeRole = useMemo(() => {
        return roles.find(r => r.name === 'Employee');
    }, [roles]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedEmployees([]);
            setPassword('');
            setSelectedRole(employeeRole?.id || '');
            setResults(null);
        }
    }, [isOpen, employeeRole]);

    const handleSelectAll = () => {
        if (selectedEmployees.length === employeesWithoutAccounts.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employeesWithoutAccounts.map(e => e.id));
        }
    };

    const handleToggleEmployee = (empId: string) => {
        if (selectedEmployees.includes(empId)) {
            setSelectedEmployees(selectedEmployees.filter(id => id !== empId));
        } else {
            setSelectedEmployees([...selectedEmployees, empId]);
        }
    };

    const handleBulkCreate = async () => {
        if (selectedEmployees.length === 0) {
            alert('Please select at least one employee');
            return;
        }

        if (!password || password.length < 6) {
            alert('Please enter a password (minimum 6 characters)');
            return;
        }

        if (!selectedRole) {
            alert('Please select a role');
            return;
        }

        setIsProcessing(true);
        
        try {
            // ✅ CRITICAL FIX: Convert all employee IDs to strings
            const usersToCreate = selectedEmployees.map(empId => ({
            employeeId: String(empId), // Force conversion to string
            password: password
            }));

            console.log('📤 Sending users to create:', usersToCreate);
            
            const response = await api.bulkCreateUsers(usersToCreate, selectedRole);
            
            setResults(response);
            
            if (response.success > 0) {
            setTimeout(() => {
                onSuccess();
            }, 2000);
            }
        } catch (error: any) {
            console.error('❌ Bulk create error:', error);
            alert('Failed to create users: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessing(false);
        }
    };

    const getEmployeeDisplayName = (employee: any) => {
        const nameParts = [
            employee.firstName || '',
            employee.middleName || '',
            employee.lastName || ''
        ].filter(part => part && part !== 'null' && part !== 'undefined');
        
        const fullName = nameParts.join(' ').trim();
        return fullName || employee.staffId || employee.email || 'N/A';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Create User Accounts">
            <div className="space-y-6">
                {!results ? (
                    <>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Instructions</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Select employees from the list below</li>
                                <li>• Set a default password (users can change it later)</li>
                                <li>• Choose a role (defaults to "Employee")</li>
                                <li>• Usernames will be auto-generated from Staff IDs</li>
                                <li>• Email addresses are optional</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Default Password for All Users <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter default password (min 6 characters)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    All selected employees will get this password. They can change it after first login.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium">
                                        Select Employees ({selectedEmployees.length} selected)
                                    </label>
                                    <Button 
                                        size="sm" 
                                        variant="secondary"
                                        onClick={handleSelectAll}
                                    >
                                        {selectedEmployees.length === employeesWithoutAccounts.length 
                                            ? 'Deselect All' 
                                            : 'Select All'}
                                    </Button>
                                </div>

                                {employeesWithoutAccounts.length === 0 ? (
                                    <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-600">
                                            All employees already have user accounts!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                                        <div className="divide-y divide-gray-200">
                                            {employeesWithoutAccounts.map(employee => (
                                                <label 
                                                    key={employee.id}
                                                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEmployees.includes(employee.id)}
                                                        onChange={() => handleToggleEmployee(employee.id)}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    />
                                                    <div className="ml-3 flex-1">
                                                        <div className="font-medium text-gray-900">
                                                            {getEmployeeDisplayName(employee)}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            Staff ID: {employee.staffId || 'N/A'} 
                                                            {employee.email && ` • ${employee.email}`}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleBulkCreate}
                                disabled={isProcessing || selectedEmployees.length === 0 || !password || password.length < 6}
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating Users...
                                    </>
                                ) : (
                                    `Create ${selectedEmployees.length} User Account${selectedEmployees.length !== 1 ? 's' : ''}`
                                )}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg border ${
                                results.success > 0 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <h4 className="font-semibold mb-2">
                                    {results.success > 0 ? '✅ Bulk Creation Complete' : '❌ Bulk Creation Failed'}
                                </h4>
                                <div className="text-sm space-y-1">
                                    <p>✅ Successfully created: {results.success} user(s)</p>
                                    <p>❌ Failed: {results.failed} user(s)</p>
                                </div>
                            </div>

                            {results.created && results.created.length > 0 && (
                                <div className="border border-gray-300 rounded-lg">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                                        <h5 className="font-semibold text-sm">Created Users</h5>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-200">
                                        {results.created.map((user: any) => (
                                            <div key={user.id} className="px-4 py-2 text-sm">
                                                <div className="font-medium">{user.username}</div>
                                                <div className="text-gray-500 text-xs">
                                                    {user.email || 'No email'} • {user.role?.name || 'No role'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {results.errors && results.errors.length > 0 && (
                                <div className="border border-red-300 rounded-lg">
                                    <div className="bg-red-50 px-4 py-2 border-b border-red-300">
                                        <h5 className="font-semibold text-sm text-red-900">Errors</h5>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-red-200">
                                        {results.errors.map((error: any, idx: number) => (
                                            <div key={idx} className="px-4 py-2 text-sm">
                                                <div className="font-medium text-red-900">
                                                    Employee ID: {error.employeeId}
                                                </div>
                                                <div className="text-red-700 text-xs">{error.reason}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default BulkUserUploadModal;