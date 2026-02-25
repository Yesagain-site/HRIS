


import React, { useState, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Modal, Select, Textarea, ConfirmationModal } from '../components/UI';
// FIX: Changed import to be a named import as useHRData is not a default export.
import { useHRData } from '../hooks/useHRData';
import { TrainingProgram, TrainingSession, Employee, EmployeeEnrollment, EnrollmentStatus, TrainingProgramStatus } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

// --- MODALS ---

const ProgramFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (program: Omit<TrainingProgram, 'id'> | TrainingProgram) => void;
    program: TrainingProgram | null;
}> = ({ isOpen, onClose, onSave, program }) => {
    const [formData, setFormData] = useState<Omit<TrainingProgram, 'id'>>({
        title: '', description: '', category: 'Technical', durationHours: 0, provider: ''
    });

    React.useEffect(() => {
        setFormData(program || { title: '', description: '', category: 'Technical', durationHours: 0, provider: '' });
    }, [program, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'durationHours' ? parseInt(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(program ? { ...formData, id: program.id } : formData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={program ? 'Edit Training Program' : 'Add New Training Program'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Program Title" name="title" value={formData.title} onChange={handleChange} required />
                <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} required />
                <Select label="Category" name="category" value={formData.category} onChange={handleChange}>
                    <option>Technical</option><option>Soft Skills</option><option>Compliance</option><option>Leadership</option>
                </Select>
                <Input label="Duration (Hours)" name="durationHours" type="number" value={formData.durationHours} onChange={handleChange} required />
                <Input label="Provider" name="provider" value={formData.provider} onChange={handleChange} required />
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Program</Button>
                </div>
            </form>
        </Modal>
    );
};

const SessionFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (session: Omit<TrainingSession, 'id'> | TrainingSession) => void;
    session: TrainingSession | null;
    programs: TrainingProgram[];
}> = ({ isOpen, onClose, onSave, session, programs }) => {
    const [formData, setFormData] = useState<Omit<TrainingSession, 'id'>>({
        programId: '', startDate: '', endDate: '', instructor: '', location: '', status: TrainingProgramStatus.UPCOMING
    });

    React.useEffect(() => {
        if(session) setFormData(session);
        else setFormData({ programId: programs[0]?.id || '', startDate: '', endDate: '', instructor: '', location: '', status: TrainingProgramStatus.UPCOMING });
    }, [session, isOpen, programs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(session ? { ...formData, id: session.id } : formData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={session ? 'Edit Session' : 'Schedule New Session'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Training Program" name="programId" value={formData.programId} onChange={handleChange} required>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
                <Input label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                <Input label="End Date" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required />
                <Input label="Instructor" name="instructor" value={formData.instructor} onChange={handleChange} required />
                <Input label="Location / URL" name="location" value={formData.location} onChange={handleChange} required />
                <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    {Object.values(TrainingProgramStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                 <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Session</Button>
                </div>
            </form>
        </Modal>
    );
}

// --- VIEWS ---

const SessionEnrollmentView: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const {
        employees, trainingSessions, trainingPrograms, enrollments,
        enrollEmployee, updateEnrollment, unenrollEmployee
    } = useHRData();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageTraining');

    const session = useMemo(() => trainingSessions.find(s => s.id === sessionId), [trainingSessions, sessionId]);
    const program = useMemo(() => trainingPrograms.find(p => p.id === session?.programId), [trainingPrograms, session]);
    
    const enrolledEmployees = useMemo(() => {
        return enrollments.filter(e => e.sessionId === sessionId)
            .map(en => ({
                ...en,
                employee: employees.find(emp => emp.id === en.employeeId)
            }));
    }, [enrollments, employees, sessionId]);

    const availableEmployees = useMemo(() => {
        const enrolledIds = new Set(enrolledEmployees.map(e => e.employeeId));
        return employees.filter(e => !enrolledIds.has(e.id));
    }, [employees, enrolledEmployees]);

    const [employeeToEnroll, setEmployeeToEnroll] = useState<string>(availableEmployees[0]?.id || '');
    
    React.useEffect(() => {
      setEmployeeToEnroll(availableEmployees[0]?.id || '');
    }, [availableEmployees])

    if (!session || !program) return <Card><p>Session not found.</p></Card>;
    
    const handleEnroll = () => {
        if(employeeToEnroll && canManage) enrollEmployee(session.id, employeeToEnroll);
    };

    const handleUpdateEnrollment = (employeeId: string, updatedData: Partial<EmployeeEnrollment>) => {
        const current = enrollments.find(e => e.sessionId === session.id && e.employeeId === employeeId);
        if (current && canManage) {
            const newEnrollmentData = { ...current, ...updatedData };

            // If status is changed to 'Completed' and there's no completion date, set it to today.
            if (updatedData.status === EnrollmentStatus.COMPLETED && !newEnrollmentData.completionDate) {
                newEnrollmentData.completionDate = new Date().toISOString().split('T')[0];
            }
            
            updateEnrollment(session.id, employeeId, newEnrollmentData);
        }
    };

    return (
        <div className="space-y-6">
            <div><Button variant="secondary" onClick={() => navigate('/training')}>&larr; Back to Training Hub</Button></div>
            <Card title={`Enrollments for: ${program.title}`}>
                <p><span className="font-semibold">Dates:</span> {session.startDate} to {session.endDate}</p>
                <p><span className="font-semibold">Instructor:</span> {session.instructor}</p>
            </Card>

            {canManage && <Card>
                <h3 className="text-lg font-semibold mb-2">Enroll New Employee</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-grow">
                        <Select label="Select Employee" id="enroll-employee" value={employeeToEnroll} onChange={e => setEmployeeToEnroll(e.target.value)}>
                            {availableEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                        </Select>
                    </div>
                    <Button onClick={handleEnroll} disabled={!employeeToEnroll}>Enroll Employee</Button>
                </div>
            </Card>}

            <Card title="Current Enrollments">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th>Employee</th><th>Status</th><th>Score</th><th>Completion Date</th>{canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-center">
                            {enrolledEmployees.map(en => en.employee && (
                                <tr key={en.employeeId}>
                                    <td className="py-2 px-4 text-left">{en.employee.name}</td>
                                    <td className="py-2 px-4">
                                        <Select label="" id={`status-${en.employeeId}`} value={en.status} onChange={e => handleUpdateEnrollment(en.employeeId, { status: e.target.value as EnrollmentStatus })} disabled={!canManage}>
                                            {Object.values(EnrollmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </Select>
                                    </td>
                                    <td className="py-2 px-4">
                                        <Input label="" id={`score-${en.employeeId}`} type="number" value={en.score || ''} onChange={e => handleUpdateEnrollment(en.employeeId, { score: parseInt(e.target.value) || undefined })} disabled={!canManage}/>
                                    </td>
                                    <td className="py-2 px-4">
                                        <Input label="" id={`comp-date-${en.employeeId}`} type="date" value={en.completionDate || ''} onChange={e => handleUpdateEnrollment(en.employeeId, { completionDate: e.target.value })} disabled={!canManage}/>
                                    </td>
                                    {canManage && <td className="py-2 px-4">
                                        <button onClick={() => unenrollEmployee(session.id, en.employeeId)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5"/></button>
                                    </td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};


const TrainingHub: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'programs' | 'sessions'>('programs');
    const { 
        trainingPrograms, trainingSessions,
        addTrainingProgram, updateTrainingProgram, deleteTrainingProgram,
        addTrainingSession, updateTrainingSession, deleteTrainingSession,
     } = useHRData();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageTraining');

    const [programModalOpen, setProgramModalOpen] = useState(false);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
    const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'program' | 'session', id: string } | null>(null);

    const handleSaveProgram = (program: Omit<TrainingProgram, 'id'> | TrainingProgram) => {
        if('id' in program) updateTrainingProgram(program.id, program);
        else addTrainingProgram(program);
    };
    const handleSaveSession = (session: Omit<TrainingSession, 'id'> | TrainingSession) => {
        if('id' in session) updateTrainingSession(session.id, session);
        else addTrainingSession(session);
    };
    
    const handleConfirmDelete = () => {
        if(!itemToDelete) return;
        if(itemToDelete.type === 'program') deleteTrainingProgram(itemToDelete.id);
        else deleteTrainingSession(itemToDelete.id);
        setItemToDelete(null);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button onClick={() => setActiveTab('programs')} className={`${activeTab === 'programs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Training Programs</button>
                        <button onClick={() => setActiveTab('sessions')} className={`${activeTab === 'sessions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Scheduled Sessions</button>
                    </nav>
                </div>

                {activeTab === 'programs' && <div className="p-4">
                    {canManage && <Button onClick={() => { setEditingProgram(null); setProgramModalOpen(true); }}><PlusIcon className="h-5 w-5 mr-1"/> Add New Program</Button>}
                    <ul className="mt-4 space-y-3">
                        {trainingPrograms.map(p => (
                            <li key={p.id} className="p-4 border rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{p.title} <span className="text-sm font-normal text-gray-500">({p.category})</span></p>
                                    <p className="text-sm text-gray-600">{p.durationHours} hours - by {p.provider}</p>
                                </div>
                                {canManage && <div className="flex gap-3">
                                    <Button variant="secondary" size="sm" onClick={() => { setEditingProgram(p); setProgramModalOpen(true); }}><PencilIcon className="h-4 w-4"/></Button>
                                    <Button variant="danger" size="sm" onClick={() => setItemToDelete({ type: 'program', id: p.id })}><TrashIcon className="h-4 w-4"/></Button>
                                </div>}
                            </li>
                        ))}
                    </ul>
                </div>}

                {activeTab === 'sessions' && <div className="p-4">
                    {canManage && <Button onClick={() => { setEditingSession(null); setSessionModalOpen(true); }}><PlusIcon className="h-5 w-5 mr-1"/> Schedule New Session</Button>}
                    <ul className="mt-4 space-y-3">
                        {trainingSessions.map(s => {
                            const program = trainingPrograms.find(p => p.id === s.programId);
                            return (
                                <li key={s.id} className="p-4 border rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{program?.title || 'Unknown Program'}</p>
                                            <p className="text-sm text-gray-600">{s.startDate} to {s.endDate} &bull; {s.instructor} &bull; {s.location}</p>
                                        </div>
                                         {canManage && <div className="flex gap-3">
                                            <Button size="sm" onClick={() => navigate(`/training/sessions/${s.id}`)}>Manage Enrollments</Button>
                                            <Button variant="secondary" size="sm" onClick={() => { setEditingSession(s); setSessionModalOpen(true); }}><PencilIcon className="h-4 w-4"/></Button>
                                            <Button variant="danger" size="sm" onClick={() => setItemToDelete({ type: 'session', id: s.id })}><TrashIcon className="h-4 w-4"/></Button>
                                        </div>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>}
            </Card>

            {canManage && (
                <>
                    <ProgramFormModal isOpen={programModalOpen} onClose={() => setProgramModalOpen(false)} onSave={handleSaveProgram} program={editingProgram} />
                    <SessionFormModal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} onSave={handleSaveSession} session={editingSession} programs={trainingPrograms} />
                    <ConfirmationModal
                        isOpen={!!itemToDelete}
                        onClose={() => setItemToDelete(null)}
                        onConfirm={handleConfirmDelete}
                        title={`Delete ${itemToDelete?.type}`}
                        message={`Are you sure you want to delete this ${itemToDelete?.type}? This may affect enrolled employees.`}
                    />
                </>
            )}
        </div>
    );
};

// --- Main Page Component ---
const TrainingPage: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<TrainingHub />} />
            <Route path="/sessions/:sessionId" element={<SessionEnrollmentView />} />
        </Routes>
    );
};

export default TrainingPage;