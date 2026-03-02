import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, Link, useLocation, Navigate } from 'react-router-dom';
import { Card, Button, Input, Select, Modal, ConfirmationModal, Textarea, ToggleSwitch } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { Employee, WorkStatus, MaritalStatus, VisaStatus, PayFrequency, Allowance, Document, LeaveBalance, CustomFieldDef, WorkLocation } from '../types';
import { PlusIcon, UserCircleIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ArrowUpTrayIcon, CheckIcon, ExclamationTriangleIcon } from '../components/Icons';
import { api } from '../services/api';
import { fixPhotoUrl } from '../utils/photoUrl';
import EmployeeImportModal from '../components/Employeeimportmodal'; 

// --- Helper Functions ---
const getStatusBadgeClass = (status: WorkStatus) => {
    switch(status) {
        case WorkStatus.ACTIVE:     return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
        case WorkStatus.PROBATION:  return 'bg-blue-100 text-blue-800 border border-blue-200';
        case WorkStatus.ON_LEAVE:   return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        case WorkStatus.RESIGNED:   return 'bg-gray-100 text-gray-700 border border-gray-200';
        case WorkStatus.TERMINATED: return 'bg-red-100 text-red-700 border border-red-200';
        case WorkStatus.SUSPENDED:  return 'bg-orange-100 text-orange-800 border border-orange-200';
        default:                    return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
};

const getStatusDotClass = (status: string) => {
    const map: Record<string, string> = {
        Active: 'bg-emerald-500', Probation: 'bg-blue-500', 'On Leave': 'bg-yellow-500',
        Resigned: 'bg-gray-400', Terminated: 'bg-red-500', Suspended: 'bg-orange-500',
    };
    return map[status] || 'bg-gray-400';
};

const calculateAge = (dob: string | null): number | string => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (e) { return ''; }
};

const formatDisplayDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
};

const getAvatarColor = (name: string) => {
    const colors = [
        'from-indigo-400 to-violet-500', 'from-blue-400 to-indigo-500',
        'from-emerald-400 to-teal-500',  'from-amber-400 to-orange-500',
        'from-pink-400 to-rose-500',     'from-purple-400 to-fuchsia-500',
        'from-cyan-400 to-blue-500',     'from-lime-400 to-green-500',
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
};

// --- Column Configuration for List View ---
const ALL_COLUMNS = [
    { key: 'sn', label: 'SN' },
    { key: 'staffId', label: 'Staff ID' },
    { key: 'name', label: 'Employee Name' },
    { key: 'workStatus', label: 'WORK STATUS' },
    { key: 'joiningDate', label: 'JOINING DATE' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Dept.' },
    { key: 'phone', label: 'CONTACT No.' },
    { key: 'previousSalary', label: 'Previous Salary' },
    { key: 'baseSalary', label: 'Basic Salary' },
    { key: 'presentGrossSalary', label: 'Present Gross Salary' },
    { key: 'passportNo', label: 'PP #' },
    { key: 'passportExp', label: 'PP EXP.' },
    { key: 'visaStatus', label: 'VISA STATUS' },
    { key: 'visaStartDate', label: 'VISA START DATE' },
    { key: 'visaExpDate', label: 'VISA EXP / Cancelled' },
    { key: 'eidNumber', label: 'EID #' },
    { key: 'eidIssueDate', label: 'EID Issue Date' },
    { key: 'eidExpDate', label: 'EID Exp Date' },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'DOB' },
    { key: 'age', label: 'AGE' },
    { key: 'maritalStatus', label: 'MARITAL STATUS' },
    { key: 'remarks', label: 'Remarks' },
];

const DEFAULT_VISIBLE_COLUMNS = new Set(['sn', 'staffId', 'name', 'workStatus', 'department', 'designation', 'phone']);

// --- Sub-components for Detail View ---
type TabProps = {
    form: Partial<Employee>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onNestedChange: (objectName: keyof Employee, fieldName: string, value: any) => void;
    onArrayChange: (arrayName: 'allowances' | 'documents', index: number, fieldName: string, value: any) => void;
    addArrayItem: (arrayName: 'allowances' | 'documents') => void;
    removeArrayItem: (arrayName: 'allowances' | 'documents', index: number) => void;
    onToggleChange: (fieldName: keyof Employee, value: boolean) => void;
    onLeaveBalanceChange: (leaveType: string, field: keyof LeaveBalance, value: number) => void;
    onAddLeaveType: (leaveType: string) => void;
    onDeleteLeaveType: (leaveType: string) => void;
    onCustomFieldChange: (fieldId: string, value: any) => void;
    isEditing: boolean;
    isNew: boolean;
    employees: Employee[];
};

const PersonalInfoTab: React.FC<TabProps> = ({ form, onChange, isEditing, isNew }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Staff # - only required when creating new */}
        <Input 
            label="Staff #" 
            name="staffId" 
            value={form.staffId || ''} 
            onChange={onChange} 
            disabled={!isNew} 
            required={isNew} // Only required when creating new
        />
        
        {/* First Name - make optional */}
        <Input 
            label="First Name" 
            name="firstName" 
            value={form.firstName || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
            required={false} // REMOVED required
        />
        
        <Input 
            label="Middle Name" 
            name="middleName" 
            value={form.middleName || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
        />
        
        {/* Last Name - make optional */}
        <Input 
            label="Last Name" 
            name="lastName" 
            value={form.lastName || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
            required={false} // REMOVED required
        />
        
        <Select 
            label="Gender" 
            name="gender" 
            value={form.gender || 'Male'} 
            onChange={onChange} 
            disabled={!isEditing}
        >
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
        </Select>
        
        <Input 
            label="Date of Birth" 
            name="dob" 
            type="date" 
            value={formatDate(form.dob)} 
            onChange={onChange} 
            disabled={!isEditing} 
        />
        
        <Input 
            label="Nationality" 
            name="nationality" 
            value={form.nationality || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
        />
        
        <Select 
            label="Marital Status" 
            name="maritalStatus" 
            value={form.maritalStatus || MaritalStatus.SINGLE} 
            onChange={onChange} 
            disabled={!isEditing}
        >
            {Object.values(MaritalStatus).map(s => <option key={s}>{s}</option>)}
        </Select>
        
        {/* Contact No. - make optional */}
        <Input 
            label="Contact No." 
            name="phone" 
            value={form.phone || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
            required={false} // REMOVED required
        />
        
        {/* Email - make optional */}
        <Input 
            label="Email" 
            name="email" 
            type="email" 
            value={form.email || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
            required={false} // REMOVED required
        />
        
        <Textarea 
            label="Address" 
            name="address" 
            value={form.address || ''} 
            onChange={onChange} 
            disabled={!isEditing} 
            className="md:col-span-3" 
        />
    </div>
);

const LeaveBalanceCard: React.FC<{
    balances?: Employee['leaveBalances'];
    isEditing: boolean;
    onBalanceChange: (leaveType: string, field: keyof LeaveBalance, value: number) => void;
    onAddLeaveType: (leaveType: string) => void;
    onDeleteLeaveType: (leaveType: string) => void;
}> = ({ balances, isEditing, onBalanceChange, onAddLeaveType, onDeleteLeaveType }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newLeaveTypeName, setNewLeaveTypeName] = useState('');
    if (!balances) return null;
    const leaveTypes = Object.keys(balances);

    const handleAdd = () => {
        if (newLeaveTypeName.trim() && !balances.hasOwnProperty(newLeaveTypeName.trim())) {
            onAddLeaveType(newLeaveTypeName.trim());
            setNewLeaveTypeName('');
            setIsAdding(false);
        } else {
            alert('Leave type name cannot be empty or a duplicate.');
        }
    };

    return (
        <Card title="Leave Balances">
            <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 text-center font-semibold text-sm text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2">
                    <span className="text-left col-span-3">Leave Type</span>
                    <span className="col-span-2">Total</span>
                    <span className="col-span-2">Taken</span>
                    <span className="text-[var(--color-primary-700)] col-span-3">Remaining</span>
                    {isEditing && <span className="col-span-2">Actions</span>}
                </div>
                {leaveTypes.length > 0 ? leaveTypes.map(type => {
                    const balance = balances[type];
                    const remaining = balance.total - balance.taken;
                    return (
                        <div key={type} className="grid grid-cols-12 gap-2 text-center text-sm items-center pt-2">
                            <span className="font-medium text-[var(--color-text-primary)] text-left col-span-3">{type}</span>
                            {isEditing ? (
                                <>
                                    <div className="col-span-2"><Input label="" id={`total-${type}`} type="number" value={balance.total} onChange={(e) => onBalanceChange(type, 'total', Number(e.target.value))} /></div>
                                    <div className="col-span-2"><Input label="" id={`taken-${type}`} type="number" value={balance.taken} onChange={(e) => onBalanceChange(type, 'taken', Number(e.target.value))} /></div>
                                </>
                            ) : (
                                <>
                                    <span className="text-[var(--color-text-secondary)] col-span-2">{balance.total}</span>
                                    <span className="text-[var(--color-text-secondary)] col-span-2">{balance.taken}</span>
                                </>
                            )}
                            <span className="font-bold text-lg text-[var(--color-primary-600)] col-span-3">{remaining}</span>
                            {isEditing && (
                                <div className="col-span-2 flex justify-center">
                                    <Button size="sm" variant="danger" onClick={() => onDeleteLeaveType(type)}><TrashIcon className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    );
                }) : (
                    <p className="text-center text-[var(--color-text-secondary)] pt-4">No leave balance data available.</p>
                )}
                {isEditing && (
                    <div className="pt-4 border-t border-[var(--color-border)] mt-4">
                        {isAdding ? (
                            <div className="flex items-end gap-2">
                                <Input label="New Leave Type Name" value={newLeaveTypeName} onChange={e => setNewLeaveTypeName(e.target.value)} placeholder="e.g., Maternity" />
                                <Button size="sm" onClick={handleAdd}>Save</Button>
                                <Button size="sm" variant="secondary" onClick={() => setIsAdding(false)}>Cancel</Button>
                            </div>
                        ) : (
                            <Button variant="secondary" onClick={() => setIsAdding(true)}>
                                <PlusIcon className="h-4 w-4 mr-2" /> Add Leave Type
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

const EmploymentTab: React.FC<TabProps> = ({ form, onChange, isEditing, employees, onLeaveBalanceChange, onAddLeaveType, onDeleteLeaveType }) => (
    <div className="space-y-6">
        <Card title="Employment Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select 
                    label="Work Status" 
                    name="workStatus" 
                    value={form.workStatus || WorkStatus.PROBATION} 
                    onChange={onChange} 
                    disabled={!isEditing}
                >
                    {Object.values(WorkStatus).map(s => <option key={s}>{s}</option>)}
                </Select>
                
                {/* Joining Date - make optional */}
                <Input 
                    label="Joining Date" 
                    name="joiningDate" 
                    type="date" 
                    value={formatDate(form.joiningDate)} 
                    onChange={onChange} 
                    disabled={!isEditing} 
                    required={false} // REMOVED required
                />
                
                {/* Designation - make optional */}
                <Input 
                    label="Designation" 
                    name="designation" 
                    value={form.designation || ''} 
                    onChange={onChange} 
                    disabled={!isEditing} 
                    required={false} // REMOVED required
                />
                
                {/* Department - make optional */}
                <Input 
                    label="Department" 
                    name="department" 
                    value={form.department || ''} 
                    onChange={onChange} 
                    disabled={!isEditing} 
                    required={false} // REMOVED required
                />
                
                <Select 
                    label="Reporting Manager" 
                    name="reportingManagerId" 
                    value={form.reportingManagerId || ''} 
                    onChange={onChange} 
                    disabled={!isEditing}
                >
                    <option value="">None</option>
                    {employees.filter(e => e.id !== form.id).map(emp => (
                        <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                        </option>
                    ))}
                </Select>
                
                <Textarea 
                    label="Remarks" 
                    name="remarks" 
                    value={form.remarks || ''} 
                    onChange={onChange} 
                    disabled={!isEditing} 
                    className="md:col-span-2" 
                />
            </div>
        </Card>
        <LeaveBalanceCard
            balances={form.leaveBalances}
            isEditing={isEditing}
            onBalanceChange={onLeaveBalanceChange}
            onAddLeaveType={onAddLeaveType}
            onDeleteLeaveType={onDeleteLeaveType}
        />
    </div>
);

const CompensationTab: React.FC<TabProps> = ({ form, onChange, onArrayChange, addArrayItem, removeArrayItem, onToggleChange, isEditing }) => {
    const dailyRate = form.baseSalary ? form.baseSalary / 30 : 0;
    const hourlyRate = dailyRate / 10;

    return (
        <div className="space-y-6">
            <Card title="Salary Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Previous Salary" name="previousSalary" type="number" value={form.previousSalary || ''} onChange={onChange} disabled={!isEditing} />
                    <Input label="Basic Salary (CTC)" name="baseSalary" type="number" value={form.baseSalary || ''} onChange={onChange} disabled={!isEditing} />
                    <Input label="Present Gross Salary" name="presentGrossSalary" type="number" value={form.presentGrossSalary || 0} onChange={() => {}} disabled={true} className="bg-opacity-50" />
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <span className="text-sm text-gray-600">Daily Rate (CTC/30):</span>
                        <span className="ml-2 font-semibold text-blue-700">{dailyRate.toFixed(2)} AED</span>
                    </div>
                    <div>
                        <span className="text-sm text-gray-600">Hourly Rate (Daily/10):</span>
                        <span className="ml-2 font-semibold text-blue-700">{hourlyRate.toFixed(2)} AED</span>
                    </div>
                </div>
            </Card>

            <Card title="Salary Components (Allowances)">
                <p className="text-sm text-gray-500 mb-3">Note: Allowances with "Housing" or "Transport" in name will be automatically categorized in payroll</p>
                <div className="space-y-2">
                    {form.allowances?.map((allowance, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                                <Input label="" id={`allowance_name_${index}`} placeholder="Allowance Name (e.g., Housing, Transport)" value={allowance.name} onChange={(e) => onArrayChange('allowances', index, 'name', e.target.value)} disabled={!isEditing} />
                            </div>
                            <div className="col-span-5">
                                <Input label="" id={`allowance_amount_${index}`} placeholder="Amount" type="number" value={allowance.amount} onChange={(e) => onArrayChange('allowances', index, 'amount', Number(e.target.value))} disabled={!isEditing} />
                            </div>
                            {isEditing && (
                                <div className="col-span-2">
                                    <Button variant="danger" size="sm" onClick={() => removeArrayItem('allowances', index)}>Delete</Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {isEditing && (
                    <Button variant="secondary" onClick={() => addArrayItem('allowances')} className="mt-4">
                        <PlusIcon className="h-4 w-4 mr-2" /> Add Allowance
                    </Button>
                )}
                {form.allowances && form.allowances.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Allowance Summary:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                                <span className="text-gray-600">Housing:</span>
                                <span className="ml-2 font-semibold">
                                    {form.allowances.filter(a => a.name?.toLowerCase().includes('housing')).reduce((sum, a) => sum + (Number(a.amount) || 0), 0).toFixed(2)} AED
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Transport:</span>
                                <span className="ml-2 font-semibold">
                                    {form.allowances.filter(a => a.name?.toLowerCase().includes('transport')).reduce((sum, a) => sum + (Number(a.amount) || 0), 0).toFixed(2)} AED
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Other:</span>
                                <span className="ml-2 font-semibold">
                                    {form.allowances.filter(a => !a.name?.toLowerCase().includes('housing') && !a.name?.toLowerCase().includes('transport')).reduce((sum, a) => sum + (Number(a.amount) || 0), 0).toFixed(2)} AED
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Card title="Payroll Settings">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Payroll Code" name="payrollCode" value={form.payrollCode || ''} onChange={onChange} disabled={!isEditing} />
                    <Select label="Pay Frequency" name="payFrequency" value={form.payFrequency || PayFrequency.MONTHLY} onChange={onChange} disabled={!isEditing}>
                        {Object.values(PayFrequency).map(pf => <option key={pf}>{pf}</option>)}
                    </Select>
                    <Input label="Target Rate (%)" name="targetRate" type="number" value={form.targetRate || ''} onChange={onChange} disabled={!isEditing} />
                    <Input label="Bank Name" name="bankName" value={form.bankName || ''} onChange={onChange} disabled={!isEditing} />
                    <Input label="IBAN" name="iban" value={form.iban || ''} onChange={onChange} disabled={!isEditing} className="md:col-span-2" />
                    <div className="col-span-1">
                        <ToggleSwitch label="Taxable" enabled={!!form.isTaxable} onChange={(val) => onToggleChange('isTaxable', val)} />
                    </div>
                    <div className="col-span-1">
                        <ToggleSwitch label="Overtime Eligible" enabled={!!form.isOvertimeEligible} onChange={(val) => onToggleChange('isOvertimeEligible', val)} />
                    </div>
                </div>
            </Card>
        </div>
    );
};

const IdentityTab: React.FC<TabProps> = ({ form, onChange, onArrayChange, addArrayItem, removeArrayItem, isEditing }) => (
    <div className="space-y-6">
        <Card title="Passport Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Passport #" name="passportNo" value={form.passportNo || ''} onChange={onChange} disabled={!isEditing} />
                <Input label="Passport Expiry" name="passportExp" type="date" value={formatDate(form.passportExp)} onChange={onChange} disabled={!isEditing} />
            </div>
        </Card>
        <Card title="Visa Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Visa Status" name="visaStatus" value={form.visaStatus || VisaStatus.ACTIVE} onChange={onChange} disabled={!isEditing}>
                    {Object.values(VisaStatus).map(s => <option key={s}>{s}</option>)}
                </Select>
                <Input label="Visa Start Date" name="visaStartDate" type="date" value={formatDate(form.visaStartDate)} onChange={onChange} disabled={!isEditing} />
                <Input label="Visa Expiry / Cancel Date" name="visaExpDate" type="date" value={formatDate(form.visaExpDate)} onChange={onChange} disabled={!isEditing} />
            </div>
        </Card>
        <Card title="Emirates ID Details">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="EID #" name="eidNumber" value={form.eidNumber || ''} onChange={onChange} disabled={!isEditing} />
                <Input label="EID Issue Date" name="eidIssueDate" type="date" value={formatDate(form.eidIssueDate)} onChange={onChange} disabled={!isEditing} />
                <Input label="EID Expiry Date" name="eidExpDate" type="date" value={formatDate(form.eidExpDate)} onChange={onChange} disabled={!isEditing} />
            </div>
        </Card>
        <Card title="Documents">
            <div className="space-y-3">
                {form.documents?.map((doc, index) => (
                    <div key={doc.id} className="grid grid-cols-12 gap-2 items-center p-2 border border-[var(--color-border)] bg-opacity-50 rounded-md">
                        <div className="col-span-12 md:col-span-3"><Input label="" id={`doc_name_${index}`} placeholder="Document Name" value={doc.name} onChange={(e) => onArrayChange('documents', index, 'name', e.target.value)} disabled={!isEditing} /></div>
                        <div className="col-span-6 md:col-span-3"><Input label="" id={`doc_issue_${index}`} placeholder="Issue Date" type="date" value={formatDate(doc.issueDate)} onChange={(e) => onArrayChange('documents', index, 'issueDate', e.target.value)} disabled={!isEditing} /></div>
                        <div className="col-span-6 md:col-span-3"><Input label="" id={`doc_exp_${index}`} placeholder="Expiry Date" type="date" value={formatDate(doc.expiryDate)} onChange={(e) => onArrayChange('documents', index, 'expiryDate', e.target.value)} disabled={!isEditing} /></div>
                        <div className="col-span-12 md:col-span-2"><Input label="" id={`doc_url_${index}`} placeholder="URL/Link" value={doc.url} onChange={(e) => onArrayChange('documents', index, 'url', e.target.value)} disabled={!isEditing} /></div>
                        {isEditing && <div className="col-span-12 md:col-span-1 text-right"><Button variant="danger" size="sm" onClick={() => removeArrayItem('documents', index)}>Delete</Button></div>}
                    </div>
                ))}
                {form.documents?.length === 0 && !isEditing && <p className="text-sm text-[var(--color-text-secondary)] text-center">No documents added.</p>}
            </div>
            {isEditing && <Button variant="secondary" onClick={() => addArrayItem('documents')} className="mt-4"><PlusIcon className="h-4 w-4 mr-2" /> Add Document</Button>}
        </Card>
    </div>
);

const EmergencyTab: React.FC<TabProps> = ({ form, onNestedChange, isEditing }) => (
    <div className="space-y-6">
        <Card title="Emergency Contact">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Name" name="name" value={form.emergencyContact?.name || ''} onChange={(e) => onNestedChange('emergencyContact', 'name', e.target.value)} disabled={!isEditing} />
                <Input label="Relationship" name="relationship" value={form.emergencyContact?.relationship || ''} onChange={(e) => onNestedChange('emergencyContact', 'relationship', e.target.value)} disabled={!isEditing} />
                <Input label="Phone" name="phone" value={form.emergencyContact?.phone || ''} onChange={(e) => onNestedChange('emergencyContact', 'phone', e.target.value)} disabled={!isEditing} />
            </div>
        </Card>
    </div>
);

const CustomFieldsTab: React.FC<TabProps> = ({ form, onCustomFieldChange, isEditing }) => {
    const { systemSettings } = useHRData();
    const { customFields } = systemSettings;

    if (!customFields || customFields.length === 0) {
        return <Card><p className="text-center text-[var(--color-text-secondary)]">No custom fields have been defined by the administrator.</p></Card>;
    }

    const renderField = (field: CustomFieldDef) => {
        const value = form.customFieldValues?.[field.id] ?? '';
        switch (field.type) {
            case 'select':
                return (
                    <Select key={field.id} label={field.name} id={field.id} value={value} onChange={(e) => onCustomFieldChange(field.id, e.target.value)} disabled={!isEditing} required={field.isRequired}>
                        <option value="">Select...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>
                );
            case 'date':
                return <Input key={field.id} label={field.name} id={field.id} type="date" value={formatDate(value)} onChange={(e) => onCustomFieldChange(field.id, e.target.value)} disabled={!isEditing} required={field.isRequired} />;
            default:
                return <Input key={field.id} label={field.name} id={field.id} type="text" value={value} onChange={(e) => onCustomFieldChange(field.id, e.target.value)} disabled={!isEditing} required={field.isRequired} />;
        }
    };

    return (
        <Card title="Additional Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map(field => renderField(field))}
            </div>
        </Card>
    );
};

const AuditTab: React.FC<TabProps> = ({ form, employees }) => {
    const createdBy = useMemo(() => employees.find(e => e.id === form.auditTrail?.createdBy)?.firstName, [employees, form.auditTrail]);
    const editedBy = useMemo(() => employees.find(e => e.id === form.auditTrail?.lastEditedBy)?.firstName, [employees, form.auditTrail]);

    return (
        <Card>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8">
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-[var(--color-text-secondary)]">Created By</dt>
                    <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{createdBy || form.auditTrail?.createdBy || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-[var(--color-text-secondary)]">Created On</dt>
                    <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{form.auditTrail?.createdAt ? new Date(form.auditTrail.createdAt).toLocaleString() : 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-[var(--color-text-secondary)]">Last Edited By</dt>
                    <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{editedBy || form.auditTrail?.lastEditedBy || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-[var(--color-text-secondary)]">Last Edited On</dt>
                    <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{form.auditTrail?.lastEditedOn ? new Date(form.auditTrail.lastEditedOn).toLocaleString() : 'N/A'}</dd>
                </div>
            </dl>
        </Card>
    );
};


// --- Personnel Detail View ---
const PersonnelDetailView: React.FC = () => {
    const location = useLocation();
    const isNewPath = location.pathname.endsWith('/new');
    const { employeeId } = useParams<{ employeeId: string }>();
    const navigate = useNavigate();
    const { employees, addEmployee, updateEmployee, refreshEmployees } = useHRData();
    const { hasPermission, currentUser, employeeDetails, isAdmin, isManager } = useAuth();
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageKey, setImageKey] = useState(Date.now());

    const isNew = isNewPath || employeeId === 'new';
    const canManage = hasPermission('canManagePersonnel');
    const isOwnProfile = employeeDetails?.id === employeeId;
    const canEdit = isAdmin || isManager || (isOwnProfile && isNew);

    const [isEditing, setIsEditing] = useState(isNew && canEdit);
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState<Partial<Employee>>({
        allowances: [],
        documents: [],
        emergencyContact: { name: '', relationship: '', phone: '' },
        isTaxable: false,
        isOvertimeEligible: false,
        customFieldValues: {},
        designation: '',
        joiningDate: '',
    });

    const employee = useMemo(() => {
        if (isNew) return null;
        return employees.find(e =>
            e.id === employeeId ||
            (e as any)._id === employeeId ||
            e.staffId === employeeId
        );
    }, [employees, employeeId, isNew]);

    useEffect(() => {
    console.log('🔄 useEffect triggered - employee changed');
    console.log('📦 Employee object:', employee);
    console.log('📸 Employee photoUrl:', employee?.photoUrl);
    
    if (employee) {
        // Clean the name fields - remove any "null" strings
        const cleanName = (value: any) => {
        if (!value || value === 'null' || value === 'Null' || value === 'NULL' || value === 'Nulll') {
            return '';
        }
        return value;
        };

        // Create cleaned employee data
        const cleanedEmployee = {
        ...employee,
        firstName: cleanName(employee.firstName),
        middleName: cleanName(employee.middleName),
        lastName: cleanName(employee.lastName),
        };
        
        console.log('📝 Setting formData with cleaned employee:', cleanedEmployee);
        setFormData(cleanedEmployee);
        setIsEditing(false);
    } else if (isNew) {
        // Set default values for new employee
        setFormData({
        workStatus: WorkStatus.PROBATION,
        allowances: [],
        documents: [],
        emergencyContact: { name: '', relationship: '', phone: '' },
        isTaxable: false,
        isOvertimeEligible: false,
        leaveBalances: { Annual: { total: 24, taken: 0 }, Sick: { total: 10, taken: 0 } },
        customFieldValues: {},
        });
        setIsEditing(true);
        setActiveTab('personal');
    }
    }, [employee, isNew]);

    // Auto-update gross salary
    useEffect(() => {
        const base = Number(formData.baseSalary) || 0;
        const allowancesTotal = formData.allowances?.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 0;
        const gross = base + allowancesTotal;
        if (formData.presentGrossSalary !== gross) {
            setFormData(prev => ({ ...prev, presentGrossSalary: gross }));
        }
    }, [formData.baseSalary, formData.allowances]);

    if (!isNew && !employee) {
        return <Card><p className="text-red-500 text-center p-4">Employee not found.</p></Card>;
    }

    useEffect(() => {
        if (formData.photoUrl) {
            const fixedUrl = fixPhotoUrl(formData.photoUrl);
            console.log('📸 Photo URL updated in formData:', formData.photoUrl);
            console.log('🔧 Fixed photo URL:', fixedUrl);
            // Test if the image loads
            const img = new Image();
            img.onload = () => console.log('✅ Test image loaded successfully');
            img.onerror = () => console.error('❌ Test image failed to load');
            img.src = fixedUrl || formData.photoUrl;
        }
    }, [formData.photoUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNestedChange = (objectName: keyof Employee, fieldName: string, value: any) => {
        setFormData(prev => ({ ...prev, [objectName]: { ...(prev[objectName] as any), [fieldName]: value } }));
    };

    const handleToggleChange = (fieldName: keyof Employee, value: boolean) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleArrayChange = (arrayName: 'allowances' | 'documents', index: number, fieldName: string, value: any) => {
        setFormData(prev => {
            const newArray = [...(prev[arrayName] || [])];
            (newArray[index] as any) = { ...newArray[index], [fieldName]: value };
            return { ...prev, [arrayName]: newArray };
        });
    };

    const addArrayItem = (arrayName: 'allowances' | 'documents') => {
        const newItem = arrayName === 'allowances'
            ? { name: '', amount: 0 }
            : { id: `doc${Date.now()}`, name: '', url: '', issueDate: '', expiryDate: '' };
        setFormData(prev => ({ ...prev, [arrayName]: [...(prev[arrayName] || []), newItem] }));
    };

    const removeArrayItem = (arrayName: 'allowances' | 'documents', index: number) => {
        setFormData(prev => ({ ...prev, [arrayName]: (prev[arrayName] || []).filter((_, i) => i !== index) }));
    };

    const handleLeaveBalanceChange = (leaveType: string, field: keyof LeaveBalance, value: number) => {
        setFormData(prev => ({
            ...prev,
            leaveBalances: {
                ...prev.leaveBalances!,
                [leaveType]: { ...prev.leaveBalances![leaveType], [field]: value < 0 ? 0 : value }
            }
        }));
    };

    const handleAddLeaveType = (leaveType: string) => {
        setFormData(prev => ({ ...prev, leaveBalances: { ...prev.leaveBalances!, [leaveType]: { total: 0, taken: 0 } } }));
    };

    const handleDeleteLeaveType = (leaveType: string) => {
        setFormData(prev => {
            const newBalances = { ...prev.leaveBalances! };
            delete newBalances[leaveType];
            return { ...prev, leaveBalances: newBalances };
        });
    };

    const handleCustomFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, customFieldValues: { ...prev.customFieldValues, [fieldId]: value } }));
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type.toLowerCase())) {
            alert('Please upload a valid image file (JPEG, PNG, or GIF)');
            return;
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        // Check if employee ID exists
        if (!employeeId || employeeId === 'new') {
            alert('Please save the employee first before uploading a photo');
            return;
        }

        setIsUploadingPhoto(true);
        try {
            console.log('📤 Uploading photo for employee:', employeeId);
            
            const data = await api.uploadEmployeePhoto(employeeId, file);
            
            console.log('✅ Upload successful - FULL RESPONSE:', JSON.stringify(data, null, 2));
            console.log('📸 Received photoUrl from API:', data.photoUrl);
            console.log('🔍 Response keys:', Object.keys(data));
            
            // Update form data with new photo URL
            setFormData(prev => {
                const updated = {
                    ...prev,
                    photoUrl: data.photoUrl
                };
                console.log('📝 Updated formData with photoUrl:', updated.photoUrl);
                return updated;
            });
            setImageKey(Date.now());

            // If we're in edit mode and the employee exists, update the employee record
            if (employee && !isNew) {
                const employeeIdToUpdate = employee.id || (employee as any)._id;
                
                console.log('💾 Updating employee record with photoUrl:', data.photoUrl);
                
                // Create update object with the new photo URL
                const updateData = {
                    ...formData,
                    photoUrl: data.photoUrl
                };
                
                // Remove any fields that shouldn't be sent in update
                delete (updateData as any).id;
                delete (updateData as any)._id;
                delete (updateData as any).auditTrail;
                
                const updatedEmployee = await updateEmployee(employeeIdToUpdate, updateData as any);
                console.log('✅ Employee record updated via API:', updatedEmployee);
                console.log('📸 Updated employee photoUrl:', updatedEmployee?.photoUrl);
            }

            // Trigger refresh to update the employee list
            console.log('🔄 Calling refreshEmployees...');
            if (refreshEmployees) {
                await refreshEmployees();
                console.log('✅ Employees refreshed');
            }

            alert('Photo uploaded successfully!');
        } catch (error: any) {
            console.error('❌ Error uploading photo:', error);
            
            let errorMessage = 'Failed to upload photo. ';
            if (error.message?.includes('401')) {
                errorMessage += 'You are not authorized. Please log in again.';
            } else if (error.message?.includes('413')) {
                errorMessage += 'File size is too large. Please use a smaller image.';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }
            
            alert(errorMessage);
        } finally {
            setIsUploadingPhoto(false);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

   const handleSave = async () => {
     console.log('🔵 SAVE BUTTON CLICKED - Starting save process');
     console.log('🔵 Form data before save:', JSON.stringify(formData, null, 2));
    
    try {
        // Prepare employee data
        const employeeData = {
        staffId: formData.staffId || `TEMP-${Date.now()}`,
        firstName: formData.firstName || '',
        middleName: formData.middleName || '',
        lastName: formData.lastName || '',
        email: formData.email || `${formData.staffId || 'emp'}@company.com`,
        phone: formData.phone || '',
        gender: formData.gender || 'Male',
        dob: formData.dob || null,
        nationality: formData.nationality || '',
        address: formData.address || '',
        department: formData.department || '',
        designation: formData.designation || '',
        joiningDate: formData.joiningDate || null,
        workStatus: formData.workStatus || 'Active',
        status: formData.workStatus || 'Active',
        baseSalary: Number(formData.baseSalary) || 0,
        presentGrossSalary: Number(formData.presentGrossSalary) || Number(formData.baseSalary) || 0,
        previousSalary: Number(formData.previousSalary) || 0,
        maritalStatus: formData.maritalStatus || 'Single',
        reportingManagerId: formData.reportingManagerId || '',
        remarks: formData.remarks || '',
        allowances: formData.allowances || [],
        payrollCode: formData.payrollCode || '',
        payFrequency: formData.payFrequency || 'Monthly',
        targetRate: Number(formData.targetRate) || 0,
        bankName: formData.bankName || '',
        iban: formData.iban || '',
        isTaxable: !!formData.isTaxable,
        isOvertimeEligible: !!formData.isOvertimeEligible,
        passportNo: formData.passportNo || '',
        passportExp: formData.passportExp || null,
        visaStatus: formData.visaStatus || 'Active',
        visaStartDate: formData.visaStartDate || null,
        visaExpDate: formData.visaExpDate || null,
        eidNumber: formData.eidNumber || '',
        eidIssueDate: formData.eidIssueDate || null,
        eidExpDate: formData.eidExpDate || null,
        documents: formData.documents || [],
        emergencyContact: formData.emergencyContact || {},
        leaveBalances: formData.leaveBalances || {
            Annual: { total: 24, taken: 0 },
            Sick: { total: 10, taken: 0 }
        },
        customFieldValues: formData.customFieldValues || {},
        photoUrl: formData.photoUrl || null,
        };

        console.log('📤 Employee data prepared:', JSON.stringify(employeeData, null, 2));

         if (isNew) {
            // Check for duplicate staffId
            if (employees.some(e => e.staffId === formData.staffId)) {
                alert("Staff # must be unique.");
                return;
            }
            
            console.log('📤 Creating new employee...');
            const result = await addEmployee(employeeData as any);
            console.log('✅ Employee created:', result);
            alert("Employee created successfully!");
            navigate('/personnel');
            
            } else if (employee) {
            const employeeIdToUpdate = employee.id || (employee as any)._id;
            console.log('📤 Updating employee with ID:', employeeIdToUpdate);
            console.log('📤 Update payload:', JSON.stringify(employeeData, null, 2));
            
            const result = await updateEmployee(employeeIdToUpdate, employeeData as any);
            console.log('✅ Employee updated successfully:', result);
            
            setIsEditing(false);
            
            // FORCE REFRESH to get fresh data from server
            if (refreshEmployees) {
                console.log('🔄 Refreshing employee list...');
                await refreshEmployees();
            }
            
            alert("Employee updated successfully!");
            navigate('/personnel');
            }
        } catch (error: any) {
            console.error("❌ Error saving employee:", error);
            console.error("❌ Error response:", error.response?.data);
            console.error("❌ Error message:", error.message);
            
            const errorMessage = error.response?.data?.message || error.message || error;
            alert(`Failed to save employee: ${JSON.stringify(errorMessage)}`);
        }
    };

    const tabs = [
        { id: 'personal',     label: 'Personal Info' },
        { id: 'employment',   label: 'Employment' },
        { id: 'compensation', label: 'Compensation & Payroll' },
        { id: 'identity',     label: 'Identity & Documents' },
        { id: 'emergency',    label: 'Emergency & Notes' },
        { id: 'custom',       label: 'Additional Info' },
        { id: 'audit',        label: 'Audit Trail' },
    ];

    const tabProps: TabProps = {
        form: formData,
        onChange: handleChange,
        onNestedChange: handleNestedChange,
        onArrayChange: handleArrayChange,
        addArrayItem,
        removeArrayItem,
        onToggleChange: handleToggleChange,
        onLeaveBalanceChange: handleLeaveBalanceChange,
        onAddLeaveType: handleAddLeaveType,
        onDeleteLeaveType: handleDeleteLeaveType,
        onCustomFieldChange: handleCustomFieldChange,
        isEditing,
        isNew,
        employees,
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'personal':     return <PersonalInfoTab {...tabProps} />;
            case 'employment':   return <EmploymentTab {...tabProps} />;
            case 'compensation': return <CompensationTab {...tabProps} />;
            case 'identity':     return <IdentityTab {...tabProps} />;
            case 'emergency':    return <EmergencyTab {...tabProps} />;
            case 'custom':       return <CustomFieldsTab {...tabProps} />;
            case 'audit':        return <AuditTab {...tabProps} />;
            default:             return null;
        }
    };

    const empName = isNew ? 'New Employee' : [formData.firstName, formData.middleName, formData.lastName].filter(n => n && n !== 'null' && n !== 'undefined').join(' ') || 'Employee';
    const avatarGrad = getAvatarColor(empName);

    return (
        <div className="space-y-6">
            {/* Back + actions row */}
            <div className="flex justify-between items-center">
                <Button variant="secondary" onClick={() => navigate('/personnel')}>
                    &larr; Back to Personnel List
                </Button>
                {canManage && (isAdmin || isManager || isOwnProfile) && (
                    <div className="flex gap-2">
                        {isEditing && <Button variant="secondary" onClick={() => { setIsEditing(false); setFormData(employee || {}); }}>Cancel</Button>}
                        {isEditing && <Button onClick={handleSave}>Save Changes</Button>}
                        {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit Employee</Button>}
                    </div>
                )}
            </div>

            {/* Profile header card */}
            <Card>
                <div className="p-4 flex items-center gap-6">
                    {/* Avatar with photo upload option */}
                    <div className="relative group">
                        {formData.photoUrl ? (
                        <div className="relative">
                            <img 
                            key={formData.photoUrl}
                            src={`${fixPhotoUrl(formData.photoUrl)}?t=${imageKey}`}
                            alt={[formData.firstName, formData.middleName, formData.lastName]
                                .filter(n => n && n !== 'null' && n !== 'undefined')
                                .join(' ') || 'Employee'}
                            className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-lg"
                            onError={(e) => {
                                console.error('❌ Failed to load image:', formData.photoUrl);
                                // Hide the broken image
                                (e.target as HTMLImageElement).style.display = 'none';
                                // Show fallback
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                const fallback = document.createElement('div');
                                fallback.className = `w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg`;
                                
                                if (isNew) {
                                    fallback.textContent = '?';
                                } else {
                                    const firstName = formData.firstName || '';
                                    const middleName = formData.middleName || '';
                                    const lastName = formData.lastName || '';
                                    const firstInitial = firstName ? firstName[0] : '';
                                    const middleInitial = middleName ? middleName[0] : '';
                                    const lastInitial = lastName ? lastName[0] : '';
                                    
                                    fallback.textContent = (firstInitial + (lastInitial || middleInitial)) || '?';
                                }
                                parent.appendChild(fallback);
                                }
                            }}
                            onLoad={() => console.log('✅ Image loaded successfully:', fixPhotoUrl(formData.photoUrl))}
                            />
                        </div>
                        ) : (
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg`}>
                            {isNew ? '?' : (() => {
                            const firstName = formData.firstName || '';
                            const middleName = formData.middleName || '';
                            const lastName = formData.lastName || '';
                            const firstInitial = firstName ? firstName[0] : '';
                            const middleInitial = middleName ? middleName[0] : '';
                            const lastInitial = lastName ? lastName[0] : '';
                            
                            return (firstInitial + (lastInitial || middleInitial)) || '?';
                            })()}
                        </div>
                        )}
                        
                        {/* Upload button - show when editing or for own profile */}
                        {(isEditing || (isOwnProfile && !isNew)) && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    disabled={isUploadingPhoto}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingPhoto}
                                    className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Upload photo"
                                >
                                    {isUploadingPhoto ? (
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                    
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{empName || 'New Employee'}</h1>
                        <p className="text-lg text-[var(--color-text-secondary)]">{formData.designation || 'Not specified'}</p>
                        {!isNew && formData.workStatus && (
                            <span className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(formData.workStatus as WorkStatus)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass(formData.workStatus as string)}`} />
                                {formData.workStatus}
                            </span>
                        )}
                    </div>
                    
                    {!isNew && (
                        <div className="ml-auto grid grid-cols-3 gap-6 text-center hidden md:grid">
                            <div>
                                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Staff ID</p>
                                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{formData.staffId || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Department</p>
                                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{formData.department || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide">Joined</p>
                                <p className="font-semibold text-[var(--color-text-primary)] mt-0.5">{formatDisplayDate(formData.joiningDate)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Tabs + content */}
            <Card>
                <div className="border-b border-[var(--color-border)]">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${activeTab === tab.id
                                    ? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-gray-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="p-4">{renderActiveTab()}</div>
            </Card>
        </div>
    );
};


// --- Personnel List View ---
const PersonnelList: React.FC = () => {
    const { employees, deleteEmployee, refreshEmployees } = useHRData();
    const { hasPermission } = useAuth();
    const navigate = useNavigate();
    const dataLoadedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);

    const [filters, setFilters]               = useState({ global: '', department: '', status: '', nationality: '', visaExp: '' });
    const [visibleColumns, setVisibleColumns] = useState(new Set(DEFAULT_VISIBLE_COLUMNS));
    const [isChooserOpen, setIsChooserOpen]   = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

    // ✅ NEW: Import modal state
    const [showImportModal, setShowImportModal] = useState(false);

    const canManage   = hasPermission('canManagePersonnel');
    const departments  = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);
    const nationalities = useMemo(() => [...new Set(employees.map(e => e.nationality).filter(Boolean))].sort(), [employees]);

    // Stats for the header strip
    const stats = useMemo(() => {
        const statusCounts = {
            total: employees.length,
            active: employees.filter((e: any) => e.workStatus === WorkStatus.ACTIVE).length,
            probation: employees.filter((e: any) => e.workStatus === WorkStatus.PROBATION).length,
            onLeave: employees.filter((e: any) => e.workStatus === WorkStatus.ON_LEAVE).length,
            suspended: employees.filter((e: any) => e.workStatus === WorkStatus.SUSPENDED).length,
            resigned: employees.filter((e: any) => e.workStatus === WorkStatus.RESIGNED).length,
            terminated: employees.filter((e: any) => e.workStatus === WorkStatus.TERMINATED).length,
            inactive: employees.filter((e: any) => 
                [ WorkStatus.TERMINATED, WorkStatus.RESIGNED, WorkStatus.SUSPENDED].includes(e.workStatus)
            ).length,
        };
        return statusCounts;
    }, [employees]);

    // ⭐ FIX: Only load data once on mount
    useEffect(() => {
        // Prevent multiple loads
        if (initialLoadDoneRef.current) {
            console.log('📊 Personnel data already loaded, skipping initial load...');
            return;
        }

        console.log('📊 PersonnelList mounted - loading data...');
        initialLoadDoneRef.current = true;
        
        // No need to call refreshEmployees here - the HRDataProvider handles it globally
        
    }, []); // Empty dependency array - only run once on mount

    const enhancedEmployees = useMemo(() => employees.map((emp, index) => {
            const d = emp as any;

            const cleanName = (value: any) => {
                if (!value || value === 'null' || value === 'Null' || value === 'NULL' || value === 'Nulll') {
                return '';
                }
                return value;
            };
  
            const firstName = cleanName(d.firstName);
            const middleName = cleanName(d.middleName);
            const lastName = cleanName(d.lastName);

        return {
            id:                 d.id || d._id || `emp-${index}`,
            _id:                d._id,
            staffId:            d.staffId || '',
            firstName:          d.firstName || '',
            middleName:         d.middleName || '',
            lastName:           d.lastName || '',
            name: [d.firstName, d.middleName, d.lastName].filter(n => n && n !== 'null' && n !== 'undefined').join(' ') || 'Unknown',
            dob:                d.dob || d.dateOfBirth || null,
            age:                calculateAge(d.dob || d.dateOfBirth || null),
            gender:             d.gender || '',
            nationality:        d.nationality || '',
            maritalStatus:      d.maritalStatus || '',
            phone:              d.phone || '',
            email:              d.email || '',
            address:            d.address || '',
            designation:        d.designation || d.jobTitle || '',
            department:         d.department || '',
            workStatus:         d.workStatus || 'Active',
            joiningDate:        d.joiningDate || d.hireDate || '',
            remarks:            d.remarks || '',
            reportingManagerId: d.reportingManagerId || '',
            baseSalary:         d.baseSalary || 0,
            previousSalary:     d.previousSalary || 0,
            presentGrossSalary: d.presentGrossSalary || 0,
            allowances:         d.allowances || [],
            payrollCode:        d.payrollCode || '',
            payFrequency:       d.payFrequency || '',
            targetRate:         d.targetRate || 0,
            bankName:           d.bankName || '',
            iban:               d.iban || '',
            isTaxable:          d.isTaxable || false,
            isOvertimeEligible: d.isOvertimeEligible || false,
            passportNo:         d.passportNo || d.passportNumber || '',
            passportExp:        d.passportExp || '',
            visaStatus:         d.visaStatus || '',
            visaStartDate:      d.visaStartDate || '',
            visaExpDate:        d.visaExpDate || '',
            eidNumber:          d.eidNumber || d.nationalIdNumber || '',
            eidIssueDate:       d.eidIssueDate || '',
            eidExpDate:         d.eidExpDate || '',
            documents:          d.documents || [],
            emergencyContact:   d.emergencyContact || {},
            leaveBalances:      d.leaveBalances || {},
            customFieldValues:  d.customFieldValues || {},
            auditTrail:         d.auditTrail || {},
            photoUrl:           d.photoUrl,
            ...d,
        };
    }), [employees]);

    const filteredEmployees = useMemo(() => enhancedEmployees.filter(emp => {
        const globalMatch = Object.values(emp).some(val => String(val).toLowerCase().includes(filters.global.toLowerCase()));
        const departmentMatch  = filters.department  ? emp.department  === filters.department  : true;
        const statusMatch      = filters.status      ? emp.workStatus  === filters.status      : true;
        const nationalityMatch = filters.nationality ? emp.nationality === filters.nationality : true;

        let visaExpMatch = true;
        if (filters.visaExp && emp.visaExpDate) {
            const today = new Date();
            const expiryDate = new Date(emp.visaExpDate);
            const daysUntilExpiry = (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
            if (filters.visaExp === '30')      visaExpMatch = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
            else if (filters.visaExp === '60') visaExpMatch = daysUntilExpiry <= 60 && daysUntilExpiry >= 0;
            else if (filters.visaExp === 'expired') visaExpMatch = daysUntilExpiry < 0;
        }
        return globalMatch && departmentMatch && statusMatch && nationalityMatch && visaExpMatch;
    }), [enhancedEmployees, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const s = new Set(prev);
            if (s.has(key)) s.delete(key); else s.add(key);
            return s;
        });
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            await deleteEmployee(employeeToDelete.id || (employeeToDelete as any)._id);
            alert("Employee deleted successfully!");
            setEmployeeToDelete(null);
            // Don't call refreshEmployees here - let the delete function handle it
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || error;
            alert(`Failed to delete employee: ${errorMessage}`);
        }
    };

    const renderCell = (emp: any, key: string, index: number) => {
        if (key === 'sn') return index + 1;
        if (key === 'name') {
            const firstName = emp.firstName || '';
            const lastName = emp.lastName || '';
            const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
            return fullName || 'N/A';
        }
        if (key === 'workStatus') {
            return (
                <span className={`px-2.5 py-0.5 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(emp[key])}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDotClass(emp[key])}`} />
                    {emp[key]}
                </span>
            );
        }
        if (['joiningDate', 'passportExp', 'visaStartDate', 'visaExpDate', 'eidIssueDate', 'eidExpDate', 'dob'].includes(key)) {
            return formatDisplayDate(emp[key]);
        }
        if (['previousSalary', 'baseSalary', 'presentGrossSalary'].includes(key)) {
            return `AED ${(emp[key] || 0).toLocaleString()}`;
        }
        return emp[key] ?? '—';
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Personnel</h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                        Manage your workforce · <span className="font-semibold">{employees.length}</span> total employee{employees.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {canManage && (
                    <div className="flex items-center gap-2">
                        {/* ✅ Import Excel button */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Import Excel
                        </button>
                        {/* Add New button */}
                        <Button onClick={() => navigate('new')}>
                            <PlusIcon className="h-5 w-5 mr-2" /> Add New
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'bg-indigo-50 border-indigo-100', textColor: 'text-indigo-700', dot: 'bg-indigo-500' },
                    { label: 'Active', value: stats.active, color: 'bg-emerald-50 border-emerald-100', textColor: 'text-emerald-700', dot: 'bg-emerald-500' },
                    { label: 'Probation', value: stats.probation, color: 'bg-blue-50 border-blue-100', textColor: 'text-blue-700', dot: 'bg-blue-500' },
                    { label: 'On Leave', value: stats.onLeave, color: 'bg-yellow-50 border-yellow-100', textColor: 'text-yellow-700', dot: 'bg-yellow-500' },
                    { label: 'Suspended', value: stats.suspended, color: 'bg-orange-50 border-orange-100', textColor: 'text-orange-700', dot: 'bg-orange-500' },
                    { label: 'Resigned', value: stats.resigned, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700', dot: 'bg-gray-500' },
                    { label: 'Terminated', value: stats.terminated, color: 'bg-red-50 border-red-100', textColor: 'text-red-700', dot: 'bg-red-500' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border ${s.color} px-4 py-4 flex items-center gap-3`}>
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div>
                            <p className={`text-2xl font-extrabold ${s.textColor} leading-none`}>{s.value}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Input label="Global Search" name="global" value={filters.global} onChange={handleFilterChange} placeholder="Search anything..." />
                    <Select label="Department" name="department" value={filters.department} onChange={handleFilterChange}>
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    <Select label="Status" name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="">All Statuses</option>
                        {Object.values(WorkStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <Select label="Nationality" name="nationality" value={filters.nationality} onChange={handleFilterChange}>
                        <option value="">All Nationalities</option>
                        {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                    <Select label="Visa Expiry" name="visaExp" value={filters.visaExp} onChange={handleFilterChange}>
                        <option value="">Any</option>
                        <option value="30">Within 30 Days</option>
                        <option value="60">Within 60 Days</option>
                        <option value="expired">Expired</option>
                    </Select>
                </div>
            </Card>

            {/* ── Table ── */}
            <Card>
                {/* Table toolbar */}
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Showing <span className="font-semibold text-[var(--color-text-primary)]">{filteredEmployees.length}</span> of {employees.length} employees
                        </p>
                    </div>
                    {/* Column chooser */}
                    <div className="relative">
                        <Button variant="secondary" onClick={() => setIsChooserOpen(!isChooserOpen)}>
                            Columns <ChevronDownIcon className="h-4 w-4 ml-1" />
                        </Button>
                        {isChooserOpen && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-[var(--color-card)] border border-[var(--color-border)] shadow-xl rounded-xl z-20 p-4 grid grid-cols-2 gap-2">
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-[var(--color-primary-600)]">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.has(col.key)}
                                            onChange={() => toggleColumn(col.key)}
                                            className="rounded text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)] bg-[var(--color-input-bg)] border-[var(--color-border)]"
                                        />
                                        {col.label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                        <thead className="bg-[var(--color-bg)] bg-opacity-60">
                            <tr>
                                {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                                    <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap">
                                        {col.label}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleColumns.size + 1} className="text-center py-16 text-[var(--color-text-secondary)]">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <p className="font-medium">No employees found</p>
                                            <p className="text-xs">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp, idx) => (
                                    <tr key={emp.id} className="hover:bg-[var(--color-bg)] hover:bg-opacity-60 transition-colors group">
                                        {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                                            <td key={col.key} className="px-4 py-3.5 whitespace-nowrap">
                                                {/* Employee name column: show avatar + name */}
                                                {col.key === 'name' ? (
                                                <div className="flex items-center gap-3">
                                                    {emp.photoUrl ? (
                                                    <div className="relative">
                                                        <img 
                                                        key={emp.photoUrl}
                                                        src={`${fixPhotoUrl(emp.photoUrl)}?t=${Date.now()}`}
                                                        alt={emp.name}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                        onError={(e) => {
                                                            // Hide the broken image
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            // Show fallback
                                                            const parent = (e.target as HTMLImageElement).parentElement;
                                                            if (parent) {
                                                            const fallback = document.createElement('div');
                                                            fallback.className = `w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`;
                                                            
                                                            // Get initials from available name parts
                                                            const firstName = emp.firstName || '';
                                                            const middleName = emp.middleName || '';
                                                            const lastName = emp.lastName || '';
                                                            const firstInitial = firstName ? firstName[0] : '';
                                                            const middleInitial = middleName ? middleName[0] : '';
                                                            const lastInitial = lastName ? lastName[0] : '';
                                                            
                                                            // Use first available initials
                                                            fallback.textContent = (firstInitial + (lastInitial || middleInitial)) || '?';
                                                            parent.appendChild(fallback);
                                                            }
                                                        }}
                                                        />
                                                    </div>
                                                    ) : (
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(emp.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                                        {(() => {
                                                        const firstName = emp.firstName || '';
                                                        const middleName = emp.middleName || '';
                                                        const lastName = emp.lastName || '';
                                                        const firstInitial = firstName ? firstName[0] : '';
                                                        const middleInitial = middleName ? middleName[0] : '';
                                                        const lastInitial = lastName ? lastName[0] : '';
                                                        
                                                        // Return first available initials
                                                        return (firstInitial + (lastInitial || middleInitial)) || '?';
                                                        })()}
                                                    </div>
                                                    )}
                                                    <div>
                                                    <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                                                        {[emp.firstName, emp.middleName, emp.lastName]
                                                        .filter(n => n && n !== 'null' && n !== 'undefined')
                                                        .join(' ') || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{emp.email}</p>
                                                    </div>
                                                </div>
                                                ) : (
                                                <span className="text-[var(--color-text-primary)]">{renderCell(emp, col.key, idx)}</span>
                                                )}
                                            </td>
                                        ))}
                                        {/* Actions */}
                                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => navigate(`/personnel/${emp.id || emp._id}`)}
                                                    className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary-200)] transition-colors"
                                                >
                                                    View
                                                </button>
                                                {canManage && (
                                                    <button
                                                        onClick={() => navigate(`/personnel/${emp.id || emp._id}`)}
                                                        className="px-3 py-1.5 text-xs font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] rounded-lg border border-[var(--color-primary-200)] transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {canManage && (
                                                    <button
                                                        onClick={() => setEmployeeToDelete(emp)}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Delete confirmation modal */}
            <ConfirmationModal
                isOpen={!!employeeToDelete}
                onClose={() => setEmployeeToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Employee"
                message={`Are you sure you want to delete ${[employeeToDelete?.firstName, employeeToDelete?.middleName, employeeToDelete?.lastName].filter(n => n && n !== 'null' && n !== 'undefined').join(' ')}? This action cannot be easily undone.`}
            />

            {/* ✅ Excel Import Modal */}
            <EmployeeImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onSuccess={(count) => {
                    // Don't call refreshEmployees here - let the import modal handle it
                }}
            />
        </div>
    );
};


// --- Main Page Component ---
const PersonnelPage: React.FC = () => {
    const location = useLocation();
    const { employeeDetails, isAdmin, isManager } = useAuth();

    console.log("DEBUG - Current URL path:", location.pathname);

    if (!isAdmin && !isManager) {
        const pathParts = location.pathname.split('/');
        const requestedId = pathParts[pathParts.length - 1];
        if (requestedId !== 'new' && requestedId !== employeeDetails?.id && !location.pathname.endsWith('/personnel')) {
            return <Navigate to={`/personnel/${employeeDetails?.id}`} replace />;
        }
    }

    return (
        <Routes>
            <Route index element={
                isAdmin || isManager
                    ? <PersonnelList />
                    : <Navigate to={`/personnel/${employeeDetails?.id}`} replace />
            } />
            <Route path="new" element={
                isAdmin || isManager
                    ? <PersonnelDetailView />
                    : <Navigate to={`/personnel/${employeeDetails?.id}`} replace />
            } />
            <Route path=":employeeId" element={<PersonnelDetailView />} />
        </Routes>
    );
};

export default PersonnelPage;