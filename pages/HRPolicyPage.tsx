


import React, { useState } from 'react';
import { Card, Button, Modal, Input, Textarea, Select, ConfirmationModal } from '../components/UI';
// FIX: Changed import to be a named import as useHRData is not a default export.
import { useHRData } from '../hooks/useHRData';
import { useAuth } from '../contexts/AuthContext';
import { Policy, ViolationType, Penalty, PenaltyType } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '../components/Icons';

// --- MODALS ---

const PolicyFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (policy: Omit<Policy, 'id' | 'violationTypes'>) => void;
    policy: Policy | null;
}> = ({ isOpen, onClose, onSave, policy }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setTitle(policy?.title || '');
            setDescription(policy?.description || '');
        }
    }, [policy, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ title, description });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={policy ? 'Edit HR Policy' : 'Add New HR Policy'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Policy Title" value={title} onChange={e => setTitle(e.target.value)} required />
                <Textarea label="Policy Description" value={description} onChange={e => setDescription(e.target.value)} rows={5} required />
                {/* FIX: Added children to Button components to resolve missing property errors. */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Policy</Button>
                </div>
            </form>
        </Modal>
    );
};

const ViolationFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (violation: Omit<ViolationType, 'id'>) => void;
    violation: ViolationType | null;
}> = ({ isOpen, onClose, onSave, violation }) => {
    const [name, setName] = useState('');
    const [penalties, setPenalties] = useState<Penalty[]>([]);

    React.useEffect(() => {
        if (isOpen) {
            setName(violation?.name || '');
            setPenalties(violation?.penalties || []);
        }
    }, [violation, isOpen]);

    const handlePenaltyChange = (index: number, field: keyof Penalty, value: any) => {
        const newPenalties = [...penalties];
        (newPenalties[index] as any)[field] = value;
        if (field === 'penaltyType' && value !== PenaltyType.DEDUCTION) {
            delete newPenalties[index].deductionAmount;
        }
        setPenalties(newPenalties);
    };

    const addPenalty = () => {
        setPenalties([...penalties, {
            offenseNumber: penalties.length + 1,
            penaltyType: PenaltyType.VERBAL,
        }]);
    };

    const removePenalty = (index: number) => {
        setPenalties(penalties.filter((_, i) => i !== index).map((p, i) => ({ ...p, offenseNumber: i + 1 })));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, penalties });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={violation ? 'Edit Violation Type' : 'Add Violation Type'}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <Input label="Violation Name" value={name} onChange={e => setName(e.target.value)} required />
                
                <div>
                    <h3 className="font-semibold mb-2">Penalties</h3>
                    <div className="space-y-3 p-3 border rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                        {penalties.map((penalty, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border bg-white rounded">
                                <span className="col-span-1 font-bold">{penalty.offenseNumber}.</span>
                                <div className="col-span-5">
                                    <Select label="" id={`type-${index}`} value={penalty.penaltyType} onChange={e => handlePenaltyChange(index, 'penaltyType', e.target.value)}>
                                        {Object.values(PenaltyType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                    </Select>
                                </div>
                                {penalty.penaltyType === PenaltyType.DEDUCTION && (
                                    <div className="col-span-4">
                                        <Input label="" id={`amount-${index}`} type="number" placeholder="Amount" value={penalty.deductionAmount || ''} onChange={e => handlePenaltyChange(index, 'deductionAmount', Number(e.target.value))} />
                                    </div>
                                )}
                                <div className="col-span-2 flex justify-end">
                                    {/* FIX: Added children to Button component to resolve missing property error. */}
                                    <Button type="button" variant="danger" size="sm" onClick={() => removePenalty(index)}><TrashIcon className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                         {/* FIX: Added children to Button component to resolve missing property error. */}
                         <Button type="button" variant="secondary" onClick={addPenalty} className="w-full">Add Penalty Step</Button>
                    </div>
                </div>

                {/* FIX: Added children to Button components to resolve missing property errors. */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Violation</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- Main Page Component ---

const HRPolicyPage: React.FC = () => {
    const { policies, addPolicy, updatePolicy, deletePolicy } = useHRData();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageHRPolicies');

    const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [editingViolation, setEditingViolation] = useState<ViolationType | null>(null);
    const [policyForViolation, setPolicyForViolation] = useState<Policy | null>(null);

    const [itemToDelete, setItemToDelete] = useState<{ type: 'policy' | 'violation', policyId: string, violationId?: string } | null>(null);

    const handleSavePolicy = (policyData: Omit<Policy, 'id' | 'violationTypes'>) => {
        if (editingPolicy) {
            updatePolicy(editingPolicy.id, { ...editingPolicy, ...policyData });
        } else {
            // FIX: Add missing 'violationTypes' property to satisfy the 'addPolicy' function signature.
            addPolicy({ ...policyData, violationTypes: [] });
        }
    };

    const handleSaveViolation = (violationData: Omit<ViolationType, 'id'>) => {
        if (!policyForViolation) return;

        let updatedViolations: ViolationType[];
        if (editingViolation) {
            // Update existing
            updatedViolations = policyForViolation.violationTypes.map(v => v.id === editingViolation.id ? { ...editingViolation, ...violationData } : v);
        } else {
            // Add new
            const newViolation: ViolationType = { ...violationData, id: `vio${Date.now()}` };
            updatedViolations = [...policyForViolation.violationTypes, newViolation];
        }
        updatePolicy(policyForViolation.id, { ...policyForViolation, violationTypes: updatedViolations });
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        const { type, policyId, violationId } = itemToDelete;
        if (type === 'policy') {
            deletePolicy(policyId);
        } else if (type === 'violation' && violationId) {
            const policy = policies.find(p => p.id === policyId);
            if (policy) {
                const updatedViolations = policy.violationTypes.filter(v => v.id !== violationId);
                updatePolicy(policyId, { ...policy, violationTypes: updatedViolations });
            }
        }
        setItemToDelete(null);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">HR Policies</h1>
                    {/* FIX: Added children to Button component to resolve missing property error. */}
                    {canManage && <Button onClick={() => { setEditingPolicy(null); setIsPolicyModalOpen(true); }}><PlusIcon className="h-5 w-5 mr-1" /> New Policy</Button>}
                </div>
            </Card>
            
            <div className="space-y-4">
                {policies.map(policy => (
                    <Card key={policy.id}>
                        <div className="p-4 cursor-pointer" onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}>
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold">{policy.title}</h2>
                                {expandedPolicy === policy.id ? <ChevronUpIcon className="h-6 w-6"/> : <ChevronDownIcon className="h-6 w-6"/>}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{policy.description}</p>
                        </div>
                        
                        {expandedPolicy === policy.id && (
                            <div className="px-4 pb-4 border-t pt-4">
                                {canManage && (
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">Violation Types</h3>
                                    <div className="flex gap-2">
                                        {/* FIX: Added children to Button components to resolve missing property errors. */}
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingPolicy(policy); setIsPolicyModalOpen(true); }}><PencilIcon className="h-4 w-4 mr-1"/> Edit Policy</Button>
                                        <Button size="sm" variant="danger" onClick={() => setItemToDelete({ type: 'policy', policyId: policy.id })}><TrashIcon className="h-4 w-4 mr-1"/> Delete Policy</Button>
                                    </div>
                                </div>
                                )}
                                <div className="space-y-3">
                                    {policy.violationTypes.map(violation => (
                                        <div key={violation.id} className="p-3 border rounded-md">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{violation.name}</p>
                                                {canManage && <div className="flex gap-2">
                                                    {/* FIX: Added children to Button components to resolve missing property errors. */}
                                                    <Button size="sm" variant="secondary" onClick={() => { setPolicyForViolation(policy); setEditingViolation(violation); setIsViolationModalOpen(true); }}><PencilIcon className="h-4 w-4"/></Button>
                                                    <Button size="sm" variant="danger" onClick={() => setItemToDelete({ type: 'violation', policyId: policy.id, violationId: violation.id})}><TrashIcon className="h-4 w-4"/></Button>
                                                </div>}
                                            </div>
                                            <table className="mt-2 w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-xs uppercase">
                                                    <tr><th className="p-2">Offense</th><th className="p-2">Penalty</th><th className="p-2">Deduction</th></tr>
                                                </thead>
                                                <tbody>
                                                    {violation.penalties.map(p => (
                                                        <tr key={p.offenseNumber} className="border-b">
                                                            <td className="p-2">{p.offenseNumber}</td>
                                                            <td className="p-2">{p.penaltyType}</td>
                                                            <td className="p-2">{p.penaltyType === PenaltyType.DEDUCTION ? (p.deductionAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'AED' }) : 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                    {policy.violationTypes.length === 0 && <p className="text-sm text-gray-500">No violation types defined for this policy.</p>}

                                    {/* FIX: Added children to Button component to resolve missing property error. */}
                                    {canManage && <Button variant="secondary" className="w-full mt-4" onClick={() => { setPolicyForViolation(policy); setEditingViolation(null); setIsViolationModalOpen(true); }}>Add Violation Type</Button>}
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {canManage && <>
                <PolicyFormModal 
                    isOpen={isPolicyModalOpen}
                    onClose={() => setIsPolicyModalOpen(false)}
                    onSave={handleSavePolicy}
                    policy={editingPolicy}
                />
                <ViolationFormModal
                    isOpen={isViolationModalOpen}
                    onClose={() => setIsViolationModalOpen(false)}
                    onSave={handleSaveViolation}
                    violation={editingViolation}
                />
                <ConfirmationModal
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Delete ${itemToDelete?.type}`}
                    message={`Are you sure you want to delete this ${itemToDelete?.type}? This action cannot be undone.`}
                />
            </>}
        </div>
    );
};

export default HRPolicyPage;