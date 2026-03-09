import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Input, Modal, Select, Textarea, ConfirmationModal } from '../components/UI';
import { useHRData } from '../hooks/useHRData';
import { TrainingProgram, TrainingSession, Employee, EnrollmentStatus, TrainingProgramStatus } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

// --- Employee View Component (NEW) - Shows only their enrolled trainings ---
const EmployeeTrainingView: React.FC = () => {
    const { employeeDetails } = useAuth();
    const { trainingSessions, trainingPrograms, enrollments } = useHRData();
    const navigate = useNavigate();

    const myEnrollments = useMemo(() => {
        return enrollments
            .filter(e => e.employeeId === employeeDetails?.id)
            .map(en => {
                const session = trainingSessions.find(s => s.id === en.sessionId);
                const program = session ? trainingPrograms.find(p => p.id === session.programId) : null;
                return {
                    ...en,
                    session,
                    program
                };
            })
            .filter(e => e.session && e.program); // Only show valid enrollments
    }, [enrollments, trainingSessions, trainingPrograms, employeeDetails]);

    if (myEnrollments.length === 0) {
        return (
            <Card>
                <div className="p-12 text-center">
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">No Training Enrollments</h2>
                    <p className="text-gray-500">You are not enrolled in any training programs yet.</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">My Training Programs</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEnrollments.map((enrollment) => (
                    <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{enrollment.program?.title}</h3>
                            <p className="text-sm text-gray-600 mb-4">{enrollment.program?.description}</p>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status:</span>
                                    <span className={`font-medium ${
                                        enrollment.status === EnrollmentStatus.COMPLETED ? 'text-green-600' :
                                        enrollment.status === EnrollmentStatus.ENROLLED ? 'text-blue-600' :
                                        enrollment.status === EnrollmentStatus.DROPPED_OUT ? 'text-red-600' :
                                        'text-gray-600'
                                    }`}>
                                        {enrollment.status}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Dates:</span>
                                    <span className="font-medium">{enrollment.session?.startDate} to {enrollment.session?.endDate}</span>
                                </div>
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Instructor:</span>
                                    <span className="font-medium">{enrollment.session?.instructor}</span>
                                </div>
                                
                                {enrollment.score !== undefined && enrollment.score > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Score:</span>
                                        <span className="font-medium">{enrollment.score}%</span>
                                    </div>
                                )}
                                
                                {enrollment.completionDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Completed:</span>
                                        <span className="font-medium">{enrollment.completionDate}</span>
                                    </div>
                                )}
                            </div>
                            
                            <Button 
                                variant="secondary" 
                                className="w-full mt-4"
                                onClick={() => navigate(`/employee/training/sessions/${enrollment.sessionId}`)}
                            >
                                View Details
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

// --- MODALS (Keep existing, but add permission checks) ---
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
        if (program) {
            setFormData(program);
        } else {
            setFormData({ title: '', description: '', category: 'Technical', durationHours: 0, provider: '' });
        }
    }, [program, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'durationHours' ? parseInt(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(program ? { ...formData, id: program.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={program ? 'Edit Program' : 'New Program'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Title" name="title" value={formData.title} onChange={handleChange} required />
                <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} required rows={3} />
                <Select label="Category" name="category" value={formData.category} onChange={handleChange}>
                    <option>Technical</option><option>Soft Skills</option><option>Compliance</option><option>Leadership</option>
                </Select>
                <Input label="Duration (Hours)" name="durationHours" type="number" value={formData.durationHours} onChange={handleChange} required />
                <Input label="Provider" name="provider" value={formData.provider} onChange={handleChange} required />
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
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
        programId: programs[0]?.id || '',
        startDate: '',
        endDate: '',
        instructor: '',
        location: '',
        status: TrainingProgramStatus.UPCOMING
    });

    React.useEffect(() => {
        if (session) {
            setFormData(session);
        } else if (programs.length > 0) {
            setFormData({
                programId: programs[0].id,
                startDate: '',
                endDate: '',
                instructor: '',
                location: '',
                status: TrainingProgramStatus.UPCOMING
            });
        }
    }, [session, programs, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(session ? { ...formData, id: session.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={session ? 'Edit Session' : 'New Session'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Select label="Program" name="programId" value={formData.programId} onChange={handleChange} required>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                    <Input label="End Date" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required />
                </div>
                <Input label="Instructor" name="instructor" value={formData.instructor} onChange={handleChange} required />
                <Input label="Location/URL" name="location" value={formData.location} onChange={handleChange} required />
                <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    {Object.values(TrainingProgramStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </Modal>
    );
};

// --- Admin/Manager Views (Keep existing but with permission checks) ---
const SessionEnrollmentView: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { employees, trainingSessions, trainingPrograms, enrollments, enrollEmployee, updateEnrollment, unenrollEmployee } = useHRData();
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

    const [employeeToEnroll, setEmployeeToEnroll] = useState<string>('');

    React.useEffect(() => {
        if (availableEmployees.length > 0) {
            setEmployeeToEnroll(availableEmployees[0].id);
        }
    }, [availableEmployees]);

    if (!session || !program) {
        return <Card><p className="text-center p-4">Session not found.</p></Card>;
    }
    
    const handleEnroll = () => {
        if (employeeToEnroll && canManage) {
            enrollEmployee(session.id, employeeToEnroll);
        }
    };

    const handleUpdateEnrollment = (employeeId: string, updatedData: Partial<any>) => {
        const current = enrollments.find(e => e.sessionId === session.id && e.employeeId === employeeId);
        if (current && canManage) {
            const newEnrollmentData = { ...current, ...updatedData };
            if (updatedData.status === EnrollmentStatus.COMPLETED && !newEnrollmentData.completionDate) {
                newEnrollmentData.completionDate = new Date().toISOString().split('T')[0];
            }
            updateEnrollment(session.id, employeeId, newEnrollmentData);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <Button variant="secondary" onClick={() => navigate('/admin/training')}>
                    &larr; Back to Training
                </Button>
            </div>
            
            <Card>
                <div className="p-4">
                    <h2 className="text-xl font-bold text-gray-900">{program.title}</h2>
                    <p className="text-gray-600 mt-1">{session.startDate} to {session.endDate} • {session.instructor} • {session.location}</p>
                </div>
            </Card>

            {canManage && (
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Enroll New Employee</h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-grow">
                            <Select 
                                label="Select Employee" 
                                value={employeeToEnroll} 
                                onChange={e => setEmployeeToEnroll(e.target.value)}
                            >
                                {availableEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                                ))}
                            </Select>
                        </div>
                        <Button onClick={handleEnroll} disabled={!employeeToEnroll}>Enroll</Button>
                    </div>
                </Card>
            )}

            <Card title="Current Enrollments">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                                {canManage && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {enrolledEmployees.map(en => en.employee && (
                                <tr key={en.employeeId}>
                                    <td className="px-4 py-3">{en.employee.firstName} {en.employee.lastName}</td>
                                    <td className="px-4 py-3">
                                        {canManage ? (
                                            <Select 
                                                value={en.status} 
                                                onChange={e => handleUpdateEnrollment(en.employeeId, { status: e.target.value as EnrollmentStatus })}
                                            >
                                                {Object.values(EnrollmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                            </Select>
                                        ) : (
                                            <span>{en.status}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {canManage ? (
                                            <Input 
                                                type="number" 
                                                value={en.score || ''} 
                                                onChange={e => handleUpdateEnrollment(en.employeeId, { score: parseInt(e.target.value) || undefined })}
                                                className="w-20"
                                            />
                                        ) : (
                                            <span>{en.score || '-'}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {canManage ? (
                                            <Input 
                                                type="date" 
                                                value={en.completionDate || ''} 
                                                onChange={e => handleUpdateEnrollment(en.employeeId, { completionDate: e.target.value })}
                                            />
                                        ) : (
                                            <span>{en.completionDate || '-'}</span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3">
                                            <button 
                                                onClick={() => unenrollEmployee(session.id, en.employeeId)} 
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const AdminTrainingHub: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'programs' | 'sessions'>('programs');
    const { trainingPrograms, trainingSessions, addTrainingProgram, updateTrainingProgram, deleteTrainingProgram, addTrainingSession, updateTrainingSession, deleteTrainingSession } = useHRData();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('canManageTraining');

    const [programModalOpen, setProgramModalOpen] = useState(false);
    const [sessionModalOpen, setSessionModalOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
    const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'program' | 'session', id: string } | null>(null);

    const handleSaveProgram = (program: Omit<TrainingProgram, 'id'> | TrainingProgram) => {
        if ('id' in program) {
            updateTrainingProgram(program.id, program);
        } else {
            addTrainingProgram(program);
        }
    };

    const handleSaveSession = (session: Omit<TrainingSession, 'id'> | TrainingSession) => {
        if ('id' in session) {
            updateTrainingSession(session.id, session);
        } else {
            addTrainingSession(session);
        }
    };
    
    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        if (itemToDelete.type === 'program') {
            deleteTrainingProgram(itemToDelete.id);
        } else {
            deleteTrainingSession(itemToDelete.id);
        }
        setItemToDelete(null);
    };

    const handleSessionClick = (sessionId: string) => {
        navigate(`/admin/training/sessions/${sessionId}`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button 
                            onClick={() => setActiveTab('programs')} 
                            className={`${activeTab === 'programs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Programs
                        </button>
                        <button 
                            onClick={() => setActiveTab('sessions')} 
                            className={`${activeTab === 'sessions' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Sessions
                        </button>
                    </nav>
                </div>

                {activeTab === 'programs' && (
                    <div className="p-4">
                        {canManage && (
                            <Button onClick={() => { setEditingProgram(null); setProgramModalOpen(true); }}>
                                <PlusIcon className="h-5 w-5 mr-1"/> New Program
                            </Button>
                        )}
                        <div className="mt-4 space-y-3">
                            {trainingPrograms.map(p => (
                                <div key={p.id} className="p-4 border rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{p.title}</p>
                                        <p className="text-sm text-gray-600">{p.category} • {p.durationHours} hours • {p.provider}</p>
                                        <p className="text-sm text-gray-500 mt-1">{p.description}</p>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <Button variant="secondary" size="sm" onClick={() => { setEditingProgram(p); setProgramModalOpen(true); }}>
                                                <PencilIcon className="h-4 w-4"/>
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => setItemToDelete({ type: 'program', id: p.id })}>
                                                <TrashIcon className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'sessions' && (
                    <div className="p-4">
                        {canManage && (
                            <Button onClick={() => { setEditingSession(null); setSessionModalOpen(true); }}>
                                <PlusIcon className="h-5 w-5 mr-1"/> New Session
                            </Button>
                        )}
                        <div className="mt-4 space-y-3">
                            {trainingSessions.map(s => {
                                const program = trainingPrograms.find(p => p.id === s.programId);
                                return (
                                    <div key={s.id} className="p-4 border rounded-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{program?.title || 'Unknown Program'}</p>
                                                <p className="text-sm text-gray-600">{s.startDate} to {s.endDate}</p>
                                                <p className="text-sm text-gray-500">{s.instructor} • {s.location}</p>
                                                <p className="text-sm text-gray-500">Status: {s.status}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleSessionClick(s.id)}>
                                                    Manage
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button variant="secondary" size="sm" onClick={() => { setEditingSession(s); setSessionModalOpen(true); }}>
                                                            <PencilIcon className="h-4 w-4"/>
                                                        </Button>
                                                        <Button variant="danger" size="sm" onClick={() => setItemToDelete({ type: 'session', id: s.id })}>
                                                            <TrashIcon className="h-4 w-4"/>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card>

            <ProgramFormModal 
                isOpen={programModalOpen} 
                onClose={() => setProgramModalOpen(false)} 
                onSave={handleSaveProgram} 
                program={editingProgram} 
            />
            
            <SessionFormModal 
                isOpen={sessionModalOpen} 
                onClose={() => setSessionModalOpen(false)} 
                onSave={handleSaveSession} 
                session={editingSession} 
                programs={trainingPrograms} 
            />
            
            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete"
                message={`Are you sure you want to delete this ${itemToDelete?.type}?`}
            />
        </div>
    );
};

// --- Main Page Component ---
const TrainingPage: React.FC = () => {
    const { isAdmin, isManager, isEmployee, hasPermission } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const canView = hasPermission('canViewTraining');

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!loading && !canView && !isAdmin && !isManager) {
            navigate('/employee/dashboard');
        }
    }, [canView, loading, isAdmin, isManager, navigate]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // For employees - show only their enrolled trainings
    if (isEmployee) {
        return (
            <Routes>
                <Route path="/" element={<EmployeeTrainingView />} />
                <Route path="/sessions/:sessionId" element={<SessionEnrollmentView />} />
            </Routes>
        );
    }

    // For admins/managers - show full management interface
    if (isAdmin || isManager) {
        return (
            <Routes>
                <Route path="/" element={<AdminTrainingHub />} />
                <Route path="/sessions/:sessionId" element={<SessionEnrollmentView />} />
            </Routes>
        );
    }

    return null;
};

export default TrainingPage;