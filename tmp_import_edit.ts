import { db } from '../services/firebase';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc } from 'firebase/firestore';
// hooks/useHRData.ts
import React, { useState, createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { 
    mockUsers, mockRoles, mockEmployees, mockSystemSettings, mockAttendanceRecords, 
    mockTasks, mockLeaveRequests, mockPermissionRequests, mockCashAdvanceRequests, 
    mockResignationRequests, mockTrainingPrograms, mockTrainingSessions, mockEnrollments,
    mockPolicies, mockShifts, mockEmployeeShifts, mockPublicHolidays
} from './mockData';
import { 
    User, Role, Employee, SystemSettings, AttendanceRecord, Task, LeaveRequest, 
    PermissionRequest, CashAdvanceRequest, ResignationRequest, TrainingProgram, 
    TrainingSession, EmployeeEnrollment, Policy, Shift, EmployeeShift, PublicHoliday, 
    RequestStatus, Payslip, EnrollmentStatus, CheckInMethod, WorkStatus, WorkLocation,
    MaritalStatus, SalaryRecord, TrainingProgramStatus, ShiftLocationType
} from '../types';
