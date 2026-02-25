

import React, { useState, useMemo, useEffect } from 'react';
import { Card, Button, Modal, Input, Textarea, Select, ConfirmationModal } from '../components/UI';
// FIX: Changed import to be a named import as useHRData is not a default export.
import { useHRData } from '../hooks/useHRData';
import { Task, TaskStatus, Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, TrashIcon, UserCircleIcon, PencilIcon } from '../components/Icons';

// --- Task Form Modal ---
const TaskFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Omit<Task, 'id'|'createdAt'|'createdBy'> | Task) => void;
    task: Task | null;
    employees: Employee[];
    currentUserId: string;
}> = ({ isOpen, onClose, onSave, task, employees, currentUserId }) => {
    const [formData, setFormData] = useState<Omit<Task, 'id' | 'createdAt' | 'createdBy'>>({
        title: '', description: '', status: TaskStatus.TODO, dueDate: '', assignedTo: ''
    });

    useEffect(() => {
        if (task) {
            setFormData(task);
        } else {
            setFormData({
                title: '', description: '', status: TaskStatus.TODO, 
                dueDate: new Date().toISOString().split('T')[0], 
                assignedTo: employees[0]?.id || ''
            });
        }
    }, [task, isOpen, employees]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(task ? { ...formData, id: task.id } : { ...formData, createdBy: currentUserId });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={task ? 'Edit Task' : 'Create New Task'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Title" name="title" value={formData.title} onChange={handleChange} required />
                <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} rows={4} />
                <Select label="Assigned To" name="assignedTo" value={formData.assignedTo} onChange={handleChange} required>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </Select>
                <Input label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} required />
                <Select label="Status" name="status" value={formData.status} onChange={handleChange}>
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
                {/* FIX: Added children to Button components to resolve missing property errors. */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Task</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- Task Card ---
const TaskCard: React.FC<{
    task: Task;
    assignee?: Employee;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    canManage: boolean;
}> = ({ task, assignee, onEdit, onDelete, canManage }) => {
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE;
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData("taskId", task.id);
    };

    const statusColors = {
        [TaskStatus.TODO]: "bg-gray-200 text-gray-800",
        [TaskStatus.IN_PROGRESS]: "bg-blue-200 text-blue-800",
        [TaskStatus.DONE]: "bg-green-200 text-green-800",
    };

    return (
        <div
            draggable={canManage}
            onDragStart={handleDragStart}
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${isOverdue ? 'border-red-500' : 'border-gray-300'} hover:shadow-md ${canManage ? 'cursor-grab' : 'cursor-default'} transition-shadow`}
        >
            <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-800 break-words pr-2">{task.title}</p>
                {canManage && (
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-gray-400 hover:text-indigo-600" aria-label={`Edit task ${task.title}`}>
                            <PencilIcon className="h-4 w-4"/>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-400 hover:text-red-600" aria-label={`Delete task ${task.title}`}>
                            <TrashIcon className="h-4 w-4"/>
                        </button>
                    </div>
                )}
            </div>
            {task.description && <p className="text-sm text-gray-500 mt-2 break-words">{task.description}</p>}
            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2 min-w-0">
                    {assignee?.photoUrl ? (
                        <img src={assignee.photoUrl} alt={assignee.name} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                        <UserCircleIcon className="h-6 w-6 text-gray-400 flex-shrink-0"/>
                    )}
                    <span className="text-xs text-gray-600 truncate" title={assignee?.name}>{assignee?.name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
                        {task.status}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                        {task.dueDate}
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- Main Tasks Page ---
const TasksPage: React.FC = () => {
    const { employees, tasks, addTask, updateTask, deleteTask } = useHRData();
    const { hasPermission, currentUser } = useAuth();
    const canManage = hasPermission('canManageTasks');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    // FIX: Add explicit type to resolve 'unknown' index type error.
    const taskColumns: Record<TaskStatus, Task[]> = useMemo(() => ({
        [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO),
        [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE),
    }), [tasks]);

    const handleOpenAddModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy'> | Task) => {
        if ('id' in taskData) {
            updateTask(taskData.id, taskData);
        } else if (currentUser?.employeeId) {
            addTask({ ...taskData, createdBy: currentUser.employeeId });
        }
    };
    
    const handleConfirmDelete = () => {
        if(taskToDelete) {
            deleteTask(taskToDelete);
            setTaskToDelete(null);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
        if (!canManage) return;
        const taskId = e.dataTransfer.getData("taskId");
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            updateTask(taskId, { ...task, status: newStatus });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Task Board</h1>
                    {/* FIX: Added children to Button component to resolve missing property error. */}
                    {canManage && <Button onClick={handleOpenAddModal}><PlusIcon className="h-5 w-5 mr-1" /> Create Task</Button>}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {Object.values(TaskStatus).map(status => (
                    <div 
                        key={status} 
                        className="bg-gray-100 rounded-lg p-4 h-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">{status} ({taskColumns[status].length})</h2>
                        <div className="space-y-4">
                            {taskColumns[status].map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    assignee={employeeMap.get(task.assignedTo)}
                                    onEdit={handleOpenEditModal}
                                    onDelete={setTaskToDelete}
                                    canManage={canManage}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {canManage && (
                <>
                    <TaskFormModal 
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveTask}
                        task={editingTask}
                        employees={employees}
                        currentUserId={currentUser!.employeeId}
                    />
                    <ConfirmationModal
                        isOpen={!!taskToDelete}
                        onClose={() => setTaskToDelete(null)}
                        onConfirm={handleConfirmDelete}
                        title="Delete Task"
                        message="Are you sure you want to delete this task? This action cannot be undone."
                    />
                </>
            )}
        </div>
    );
};

export default TasksPage;