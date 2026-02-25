// services/api.ts - Complete API Service with All Endpoints

// Base API service
class APIService {
  private baseURL: string = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || localStorage.getItem('yespeople_jwt_token');
    const headers: any = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Generic GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // Generic POST request
  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Generic PATCH request
  async patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Generic PUT request
  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Generic DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized
    if (response.status === 401) {
      localStorage.removeItem('yespeople_jwt_token');
      localStorage.removeItem('yespeople_current_user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    // If no content (DELETE sometimes returns 204)
    if (response.status === 204) {
      return {} as T;
    }

    // If error status
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Error ${response.status}`);
    }

    // Always safely parse JSON
    try {
      return await response.json();
    } catch {
      return {} as T;
    }
  }
}

// HR specific API service
export class HRAPI extends APIService {

  // ============================================================================
  // EMPLOYEE ENDPOINTS
  // ============================================================================

  async getEmployees() {
    try {
      console.log('📡 Fetching employees from /employees');
      const response = await this.get<any>('/employees');
      console.log('📦 API Response:', response);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch employees:', error);
      return [];
    }
  }

  async getEmployee(id: string) {
    return this.get<any>(`/employees/${id}`);
  }

  async createEmployee(employeeData: any) {
    return this.post<any>('/employees', employeeData);
  }

  async updateEmployee(id: string, employeeData: any) {
    return this.put<any>(`/employees/${id}`, employeeData);
  }

  async deleteEmployee(id: string) {
    return this.delete<any>(`/employees/${id}`);
  }

  async bulkImportEmployees(records: any[]): Promise<{
    success: number;
    failed: number;
    errors: { row: number; staffId: string; reason: string }[];
    created: any[];
  }> {
    return this.post<any>('/employees/bulk-import', { records });
  }

  // ============================================================================
  // AUTH ENDPOINTS
  // ============================================================================

  async login(username: string, password: string) {
    try {
      const response = await this.post<any>('/auth/login', { username, password });
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // ============================================================================
  // ROLE ENDPOINTS
  // ============================================================================

  async getRoles() {
    try {
      const response = await this.get<any>('/roles');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch roles:', error);
      return [];
    }
  }

  async getRole(id: string) {
    return this.get<any>(`/roles/${id}`);
  }

  async createRole(roleData: any) {
    return this.post<any>('/roles', roleData);
  }

  async updateRole(id: string, roleData: any) {
    return this.put<any>(`/roles/${id}`, roleData);
  }

  async deleteRole(id: string) {
    return this.delete<any>(`/roles/${id}`);
  }

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  async getUsers() {
    try {
      const response = await this.get<any>('/users');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      return [];
    }
  }

  async getUser(id: string) {
    return this.get<any>(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.post<any>('/users', userData);
  }

  async updateUser(id: string, userData: any) {
    return this.put<any>(`/users/${id}`, userData);
  }

  async deleteUser(id: string) {
    return this.delete<any>(`/users/${id}`);
  }

  // ============================================================================
  // ATTENDANCE ENDPOINTS ⭐
  // ============================================================================

  /**
   * Clock in for an employee
   */
  async clockIn(data: {
    employeeId: string;
    date: string;
    inTime: string;
    checkInMethod: string;
    checkInLocation?: { latitude: number; longitude: number };
  }): Promise<any> {
    return this.post<any>('/attendance/clock-in', data);
  }

  /**
   * Clock out for an employee
   */
  async clockOut(employeeId: string, data: {
    outTime: string;
    workHours?: number;
    overtimeHours?: number;
  }): Promise<any> {
    return this.put<any>(`/attendance/clock-out/${employeeId}`, data);
  }

  /**
   * Get today's attendance status for an employee
   */
  async getTodayAttendanceStatus(employeeId: string): Promise<any> {
    return this.get<any>(`/attendance/today/${employeeId}`);
  }

  /**
   * Get attendance records for a specific employee
   */
  async getEmployeeAttendance(
    employeeId: string,
    filters?: { month?: number; year?: number }
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.month) queryParams.append('month', filters.month.toString());
    if (filters?.year) queryParams.append('year', filters.year.toString());

    const queryString = queryParams.toString();
    const url = queryString
      ? `/attendance/employee/${employeeId}?${queryString}`
      : `/attendance/employee/${employeeId}`;

    return this.get<any>(url);
  }

  /**
   * Get all attendance records with filters
   */
  async getAllAttendance(filters?: {
    employeeId?: string;
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
    if (filters?.month) queryParams.append('month', filters.month.toString());
    if (filters?.year) queryParams.append('year', filters.year.toString());
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const queryString = queryParams.toString();
    const url = queryString ? `/attendance?${queryString}` : '/attendance';

    return this.get<any>(url);
  }

  /**
   * Bulk import attendance records ⭐ KEY METHOD for biometric upload
   */
  async importAttendance(records: any[]): Promise<any> {
    console.log('📤 Importing attendance records:', records.length);
    return this.post<any>('/attendance/import', records);
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendance(id: string): Promise<any> {
    return this.delete<any>(`/attendance/${id}`);
  }

  /**
   * Update an attendance record
   */
  async updateAttendance(id: string, data: any): Promise<any> {
    return this.put<any>(`/attendance/${id}`, data);
  }

  /**
   * Get attendance statistics for an employee
   */
  async getEmployeeStats(
    employeeId: string,
    filters?: { month?: number; year?: number }
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.month) queryParams.append('month', filters.month.toString());
    if (filters?.year) queryParams.append('year', filters.year.toString());

    const queryString = queryParams.toString();
    const url = queryString
      ? `/attendance/stats/${employeeId}?${queryString}`
      : `/attendance/stats/${employeeId}`;

    return this.get<any>(url);
  }

  // ============================================================================
  // PAYROLL ENDPOINTS
  // ============================================================================

  async savePayroll(payrollData: {
    year: number;
    month: number;
    data: any[];
    headers: string[];
    isGenerated: boolean;
    fileName?: string;
  }): Promise<any> {
    return this.post<any>('/payroll', payrollData);
  }

  async getPayrollByMonth(year: number, month: number): Promise<any> {
    try {
      const response = await this.get(`/payroll/month/${year}/${month}`);
      return response;
    } catch (error: any) {
      if (error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updatePayrollEntry(entryId: string, data: any): Promise<any> {
    console.log('📤 Sending update for entry:', entryId, 'with isEditable:', data.isEditable);
    return this.put(`/payroll/entry/${entryId}`, data);
  }

  async calculateAllPayrollEntries(periodId: string): Promise<any> {
    return this.post(`/payroll/period/${periodId}/calculate-all`, {});
  }

  async generatePayroll(periodId: string): Promise<any> {
    return this.post(`/payroll/period/${periodId}/generate`, {});
  }

  async updatePayroll(id: string, updates: any): Promise<any> {
    return this.patch<any>(`/payroll/${id}`, updates);
  }

  async deletePayroll(id: string): Promise<any> {
    return this.delete<any>(`/payroll/${id}`);
  }

  async deletePayrollByMonth(year: number, month: number): Promise<any> {
    return this.delete<any>(`/payroll/month/${year}/${month}`);
  }

  async getAllPayrolls(filters?: {
    year?: number;
    month?: number;
    isGenerated?: boolean;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (filters?.year) queryParams.append('year', filters.year.toString());
    if (filters?.month) queryParams.append('month', filters.month.toString());
    if (filters?.isGenerated !== undefined)
      queryParams.append('isGenerated', filters.isGenerated.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/payroll?${queryString}` : '/payroll';

    return this.get<any>(url);
  }

  async getSettingsPeriods(): Promise<any> {
    try {
      const response = await this.get('/payroll/settings-periods');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch settings periods:', error);
      return [];
    }
  }

  async createSettingsPeriod(data: any): Promise<any> {
    return this.post('/payroll/settings-period', data);
  }

  async deleteSettingsPeriod(id: string): Promise<any> {
    return this.delete(`/payroll/settings-period/${id}`);
  }

  async createPayrollEntry(entryData: any): Promise<any> {
    return this.post<any>('/payroll/entry', entryData);
  }

  async getPayrollEntriesByPeriod(periodId: string): Promise<any> {
    return this.get<any>(`/payroll/period/${periodId}/entries`);
  }

  async getEmployeePayslips(employeeId: string): Promise<any> {
    try {
      const response = await this.get(`/payroll/employee/${employeeId}/payslips`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch employee payslips:', error);
      return [];
    }
  }
}

// Create singleton instance
export const api = new HRAPI();


// // Base API service
// class APIService {
//   private baseURL: string = 'http://localhost:5000'; // ✅ NO /api here

//   private getAuthHeaders() {
//     const token = localStorage.getItem('access_token') || localStorage.getItem('yespeople_jwt_token');
//     const headers: any = {
//       'Content-Type': 'application/json',
//     };
    
//     if (token) {
//       headers['Authorization'] = `Bearer ${token}`;
//     }
    
//     return headers;
//   }

//   // Generic GET request
//   async get<T>(endpoint: string): Promise<T> {
//     return this.request<T>(endpoint, { method: 'GET' });
//   }

//   // Generic POST request
//   async post<T>(endpoint: string, data: any): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: 'POST',
//       body: JSON.stringify(data),
//     });
//   }

//   // Generic PATCH request
//   async patch<T>(endpoint: string, data: any): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: 'PATCH',
//       body: JSON.stringify(data),
//     });
//   }

//   // Generic PUT request
//   async put<T>(endpoint: string, data: any): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: 'PUT',
//       body: JSON.stringify(data),
//     });
//   }

//   // Generic DELETE request
//   async delete<T>(endpoint: string): Promise<T> {
//     return this.request<T>(endpoint, { method: 'DELETE' });
//   }

//   private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
//     const url = `${this.baseURL}${endpoint}`;
//     const headers = {
//       ...this.getAuthHeaders(),
//       ...options.headers,
//     };

//     const response = await fetch(url, {
//       ...options,
//       headers,
//     });

//     // If unauthorized
//     if (response.status === 401) {
//       localStorage.removeItem('yespeople_jwt_token');
//       localStorage.removeItem('yespeople_current_user');
//       window.location.href = '/login';
//       throw new Error('Unauthorized');
//     }

//     // If no content (DELETE sometimes returns 204)
//     if (response.status === 204) {
//       return {} as T;
//     }

//     // If error status
//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(errorText || `Error ${response.status}`);
//     }

//     // Always safely parse JSON
//     try {
//       return await response.json();
//     } catch {
//       return {} as T;
//     }
//   }

// }

// // HR specific API service
// export class HRAPI extends APIService {

//   // Employee endpoints
//   async getEmployees() {
//     try {
//       console.log('📡 Fetching employees from /employees');
//       const response = await this.get<any>('/employees');
//       console.log('📦 API Response:', response);

//       return Array.isArray(response) ? response : [];
//     } catch (error) {
//       console.error('❌ Failed to fetch employees:', error);
//       return [];
//     }
//   }

//   async getEmployee(id: string) {
//     return this.get<any>(`/employees/${id}`);
//   }

//   async createEmployee(employeeData: any) {
//     return this.post<any>('/employees', employeeData);
//   }

//   async updateEmployee(id: string, employeeData: any) {
//     return this.put<any>(`/employees/${id}`, employeeData);
//   }

//   async deleteEmployee(id: string) {
//     return this.delete<any>(`/employees/${id}`);
//   }

//   // ✅ NEW: Bulk import employees from Excel
//   async bulkImportEmployees(records: any[]): Promise<{
//     success: number;
//     failed: number;
//     errors: { row: number; staffId: string; reason: string }[];
//     created: any[];
//   }> {
//     return this.post<any>('/employees/bulk-import', { records });
//   }

//   // Payroll API methods
//   async savePayroll(payrollData: {
//     year: number;
//     month: number;
//     data: any[];
//     headers: string[];
//     isGenerated: boolean;
//     fileName?: string;
//   }): Promise<any> {
//     return this.post<any>('/payroll', payrollData);
//   }

//   async getPayrollByMonth(year: number, month: number): Promise<any> {
//     try {
//       const response = await this.get(`/payroll/month/${year}/${month}`);
//       return response;
//     } catch (error: any) {
//       if (error.message?.includes('404')) {
//         return null;
//       }
//       throw error;
//     }
//   }

//   async updatePayrollEntry(entryId: string, data: any): Promise<any> {
//     console.log('📤 Sending update for entry:', entryId, 'with isEditable:', data.isEditable);
//     return this.put(`/payroll/entry/${entryId}`, data);
//   }

//   async calculateAllPayrollEntries(periodId: string): Promise<any> {
//     return this.post(`/payroll/period/${periodId}/calculate-all`, {});
//   }

//   async generatePayroll(periodId: string): Promise<any> {
//     return this.post(`/payroll/period/${periodId}/generate`, {});
//   }

//   async updatePayroll(id: string, updates: any): Promise<any> {
//     return this.patch<any>(`/payroll/${id}`, updates);
//   }

//   async deletePayroll(id: string): Promise<any> {
//     return this.delete<any>(`/payroll/${id}`);
//   }

//   async deletePayrollByMonth(year: number, month: number): Promise<any> {
//     return this.delete<any>(`/payroll/month/${year}/${month}`);
//   }

//   async getAllPayrolls(filters?: {
//     year?: number;
//     month?: number;
//     isGenerated?: boolean;
//   }): Promise<any> {
//     const queryParams = new URLSearchParams();
//     if (filters?.year) queryParams.append('year', filters.year.toString());
//     if (filters?.month) queryParams.append('month', filters.month.toString());
//     if (filters?.isGenerated !== undefined)
//       queryParams.append('isGenerated', filters.isGenerated.toString());

//     const queryString = queryParams.toString();
//     const url = queryString ? `/payroll?${queryString}` : '/payroll';

//     return this.get<any>(url);
//   }

//   // ============ AUTH ENDPOINTS ============
//   async login(username: string, password: string) {
//     try {
//       const response = await this.post<any>('/auth/login', { username, password });
//       return response;
//     } catch (error) {
//       console.error('❌ Login error:', error);
//       throw error;
//     }
//   }

//   // ============ ROLE ENDPOINTS ============
//   async getRoles() {
//     try {
//       const response = await this.get<any>('/roles');
//       return Array.isArray(response) ? response : [];
//     } catch (error) {
//       console.error('❌ Failed to fetch roles:', error);
//       return [];
//     }
//   }

//   async getRole(id: string) {
//     return this.get<any>(`/roles/${id}`);
//   }

//   async createRole(roleData: any) {
//     return this.post<any>('/roles', roleData);
//   }

//   async updateRole(id: string, roleData: any) {
//     return this.put<any>(`/roles/${id}`, roleData);
//   }

//   async deleteRole(id: string) {
//     return this.delete<any>(`/roles/${id}`);
//   }

//   // ============ USER ENDPOINTS ============
//   async getUsers() {
//     try {
//       const response = await this.get<any>('/users');
//       return Array.isArray(response) ? response : [];
//     } catch (error) {
//       console.error('❌ Failed to fetch users:', error);
//       return [];
//     }
//   }

//   async getUser(id: string) {
//     return this.get<any>(`/users/${id}`);
//   }

//   async createUser(userData: any) {
//     return this.post<any>('/users', userData);
//   }

//   async updateUser(id: string, userData: any) {
//     return this.put<any>(`/users/${id}`, userData);
//   }

//   async deleteUser(id: string) {
//     return this.delete<any>(`/users/${id}`);
//   }

//   async getSettingsPeriods(): Promise<any> {
//     try {
//       const response = await this.get('/payroll/settings-periods');
//       return Array.isArray(response) ? response : [];
//     } catch (error) {
//       console.error('❌ Failed to fetch settings periods:', error);
//       return [];
//     }
//   }

//   async createSettingsPeriod(data: any): Promise<any> {
//     return this.post('/payroll/settings-period', data);
//   }

//   async deleteSettingsPeriod(id: string): Promise<any> {
//     return this.delete(`/payroll/settings-period/${id}`);
//   }

//   async createPayrollEntry(entryData: any): Promise<any> {
//     return this.post<any>('/payroll/entry', entryData);
//   }

//   async getPayrollEntriesByPeriod(periodId: string): Promise<any> {
//     return this.get<any>(`/payroll/period/${periodId}/entries`);
//   }

//   // Attendance API methods
//   async clockIn(data: {
//     employeeId: string;
//     date: string;
//     inTime: string;
//     checkInMethod: string;
//     checkInLocation?: { latitude: number; longitude: number };
//   }): Promise<any> {
//     return this.post<any>('/attendance/clock-in', data);
//   }

//   async clockOut(employeeId: string, data: {
//     outTime: string;
//     workHours: number;
//     overtimeHours?: number;
//   }): Promise<any> {
//     return this.put<any>(`/attendance/clock-out/${employeeId}`, data);
//   }

//   async getTodayAttendanceStatus(employeeId: string): Promise<any> {
//     return this.get<any>(`/attendance/today/${employeeId}`);
//   }

//   async getEmployeeAttendance(
//     employeeId: string,
//     filters?: { month?: number; year?: number }
//   ): Promise<any> {
//     const queryParams = new URLSearchParams();
//     if (filters?.month) queryParams.append('month', filters.month.toString());
//     if (filters?.year) queryParams.append('year', filters.year.toString());

//     const queryString = queryParams.toString();
//     const url = queryString
//       ? `/attendance/employee/${employeeId}?${queryString}`
//       : `/attendance/employee/${employeeId}`;

//     return this.get<any>(url);
//   }

//   async getAllAttendance(filters?: {
//     employeeId?: string;
//     month?: number;
//     year?: number;
//     startDate?: string;
//     endDate?: string;
//   }): Promise<any> {
//     const queryParams = new URLSearchParams();
//     if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
//     if (filters?.month) queryParams.append('month', filters.month.toString());
//     if (filters?.year) queryParams.append('year', filters.year.toString());
//     if (filters?.startDate) queryParams.append('startDate', filters.startDate);
//     if (filters?.endDate) queryParams.append('endDate', filters.endDate);

//     const queryString = queryParams.toString();
//     const url = queryString ? `/attendance?${queryString}` : '/attendance';

//     return this.get<any>(url);
//   }

//   async importAttendance(records: any[]): Promise<any> {
//     return this.post<any>('/attendance/import', records);
//   }

//   async getEmployeePayslips(employeeId: string): Promise<any> {
//     try {
//       const response = await this.get(`/payroll/employee/${employeeId}/payslips`);
//       return Array.isArray(response) ? response : [];
//     } catch (error) {
//       console.error('❌ Failed to fetch employee payslips:', error);
//       return [];
//     }
//   }

// }

// // Create singleton instance
// export const api = new HRAPI();


// // // Base API service
// // class APIService {
// //   private baseURL: string = 'http://localhost:5000'; // ✅ NO /api here

// //   private getAuthHeaders() {
// //     const token = localStorage.getItem('access_token') || localStorage.getItem('yespeople_jwt_token');
// //     const headers: any = {
// //       'Content-Type': 'application/json',
// //     };
    
// //     if (token) {
// //       headers['Authorization'] = `Bearer ${token}`;
// //     }
    
// //     return headers;
// //   }

// //   // Generic GET request
// //   async get<T>(endpoint: string): Promise<T> {
// //     return this.request<T>(endpoint, { method: 'GET' });
// //   }

// //   // Generic POST request
// //   async post<T>(endpoint: string, data: any): Promise<T> {
// //     return this.request<T>(endpoint, {
// //       method: 'POST',
// //       body: JSON.stringify(data),
// //     });
// //   }

// //   // Generic PATCH request
// //   async patch<T>(endpoint: string, data: any): Promise<T> {
// //     return this.request<T>(endpoint, {
// //       method: 'PATCH',
// //       body: JSON.stringify(data),
// //     });
// //   }

// //   // Generic PUT request
// //   async put<T>(endpoint: string, data: any): Promise<T> {
// //     return this.request<T>(endpoint, {
// //       method: 'PUT',
// //       body: JSON.stringify(data),
// //     });
// //   }

// //   // Generic DELETE request
// //   async delete<T>(endpoint: string): Promise<T> {
// //     return this.request<T>(endpoint, { method: 'DELETE' });
// //   }

// //   private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
// //     const url = `${this.baseURL}${endpoint}`;
// //     const headers = {
// //       ...this.getAuthHeaders(),
// //       ...options.headers,
// //     };

// //     const response = await fetch(url, {
// //       ...options,
// //       headers,
// //     });

// //     // If unauthorized
// //     if (response.status === 401) {
// //       localStorage.removeItem('yespeople_jwt_token');
// //       localStorage.removeItem('yespeople_current_user');
// //       window.location.href = '/login';
// //       throw new Error('Unauthorized');
// //     }

// //     // If no content (DELETE sometimes returns 204)
// //     if (response.status === 204) {
// //       return {} as T;
// //     }

// //     // If error status
// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       throw new Error(errorText || `Error ${response.status}`);
// //     }

// //     // Always safely parse JSON
// //     try {
// //       return await response.json();
// //     } catch {
// //       return {} as T;
// //     }
// //   }

// // }

// // // HR specific API service
// // export class HRAPI extends APIService {

// //   // Employee endpoints
// //   async getEmployees() {
// //     try {
// //       console.log('📡 Fetching employees from /employees');
// //       const response = await this.get<any>('/employees');
// //       console.log('📦 API Response:', response);

// //       return Array.isArray(response) ? response : [];
// //     } catch (error) {
// //       console.error('❌ Failed to fetch employees:', error);
// //       return [];
// //     }
// //   }


// //   async getEmployee(id: string) {
// //     return this.get<any>(`/employees/${id}`);
// //   }

// //   async createEmployee(employeeData: any) {
// //     return this.post<any>('/employees', employeeData);
// //   }

// //   async updateEmployee(id: string, employeeData: any) {
// //     return this.put<any>(`/employees/${id}`, employeeData);
// //   }

// //   async deleteEmployee(id: string) {
// //     return this.delete<any>(`/employees/${id}`);
// //   }

// //   // Payroll API methods
// //   async savePayroll(payrollData: {
// //     year: number;
// //     month: number;
// //     data: any[];
// //     headers: string[];
// //     isGenerated: boolean;
// //     fileName?: string;
// //   }): Promise<any> {
// //     return this.post<any>('/payroll', payrollData);
// //   }

  
// //   async getPayrollByMonth(year: number, month: number): Promise<any> {
// //     try {
// //       const response = await this.get(`/payroll/month/${year}/${month}`);
// //       return response;
// //     } catch (error: any) {
// //       if (error.message?.includes('404')) {
// //         return null;
// //       }
// //       throw error;
// //     }
// //   } 

// //   async updatePayrollEntry(entryId: string, data: any): Promise<any> {
// //     // ✅ IMPORTANT: Send ALL data including isEditable
// //     // The backend needs to know if this entry should be editable or not
// //     console.log('📤 Sending update for entry:', entryId, 'with isEditable:', data.isEditable);
// //     return this.put(`/payroll/entry/${entryId}`, data);
// //   }

// //   async calculateAllPayrollEntries(periodId: string): Promise<any> {
// //     return this.post(`/payroll/period/${periodId}/calculate-all`, {});
// //   }

// //   async generatePayroll(periodId: string): Promise<any> {
// //     return this.post(`/payroll/period/${periodId}/generate`, {});
// //   }

// //   async updatePayroll(id: string, updates: any): Promise<any> {
// //     return this.patch<any>(`/payroll/${id}`, updates);
// //   }

// //   async deletePayroll(id: string): Promise<any> {
// //     return this.delete<any>(`/payroll/${id}`);
// //   }

// //   async deletePayrollByMonth(year: number, month: number): Promise<any> {
// //     return this.delete<any>(`/payroll/month/${year}/${month}`);
// //   }

// //   async getAllPayrolls(filters?: {
// //     year?: number;
// //     month?: number;
// //     isGenerated?: boolean;
// //   }): Promise<any> {
// //     const queryParams = new URLSearchParams();
// //     if (filters?.year) queryParams.append('year', filters.year.toString());
// //     if (filters?.month) queryParams.append('month', filters.month.toString());
// //     if (filters?.isGenerated !== undefined) 
// //       queryParams.append('isGenerated', filters.isGenerated.toString());
    
// //     const queryString = queryParams.toString();
// //     const url = queryString ? `/payroll?${queryString}` : '/payroll';
    
// //     return this.get<any>(url);
// //   }

// //   // ============ AUTH ENDPOINTS ============
// //   async login(username: string, password: string) {
// //     try {
// //       const response = await this.post<any>('/auth/login', { username, password });
// //       return response;
// //     } catch (error) {
// //       console.error('❌ Login error:', error);
// //       throw error;
// //     }
// //   }

// //   // ============ ROLE ENDPOINTS ============
// //   async getRoles() {
// //     try {
// //       const response = await this.get<any>('/roles');
// //       return Array.isArray(response) ? response : [];
// //     } catch (error) {
// //       console.error('❌ Failed to fetch roles:', error);
// //       return [];
// //     }
// //   }

// //   async getRole(id: string) {
// //     return this.get<any>(`/roles/${id}`);
// //   }

// //   async createRole(roleData: any) {
// //     return this.post<any>('/roles', roleData);
// //   }

// //   async updateRole(id: string, roleData: any) {
// //     return this.put<any>(`/roles/${id}`, roleData);
// //   }

// //   async deleteRole(id: string) {
// //     return this.delete<any>(`/roles/${id}`);
// //   }

// //   // ============ USER ENDPOINTS ============
// //   async getUsers() {
// //     try {
// //       const response = await this.get<any>('/users');
// //       return Array.isArray(response) ? response : [];
// //     } catch (error) {
// //       console.error('❌ Failed to fetch users:', error);
// //       return [];
// //     }
// //   }

// //   async getUser(id: string) {
// //     return this.get<any>(`/users/${id}`);
// //   }

// //   async createUser(userData: any) {
// //     return this.post<any>('/users', userData);
// //   }

// //   async updateUser(id: string, userData: any) {
// //     return this.put<any>(`/users/${id}`, userData);
// //   }

// //   async deleteUser(id: string) {
// //     return this.delete<any>(`/users/${id}`);
// //   }

// //   async getSettingsPeriods(): Promise<any> {
// //     try {
// //       const response = await this.get('/payroll/settings-periods');
// //       return Array.isArray(response) ? response : [];
// //     } catch (error) {
// //       console.error('❌ Failed to fetch settings periods:', error);
// //       return [];
// //     }
// //   }

// //   async createSettingsPeriod(data: any): Promise<any> {
// //     return this.post('/payroll/settings-period', data);
// //   }

// //   async deleteSettingsPeriod(id: string): Promise<any> {
// //     return this.delete(`/payroll/settings-period/${id}`);
// //   }

// //   async createPayrollEntry(entryData: any): Promise<any> {
// //     return this.post<any>('/payroll/entry', entryData);
// //   }

// //   async getPayrollEntriesByPeriod(periodId: string): Promise<any> {
// //     return this.get<any>(`/payroll/period/${periodId}/entries`);
// //   }

// //   // Attendance API methods
// //   async clockIn(data: {
// //     employeeId: string;
// //     date: string;
// //     inTime: string;
// //     checkInMethod: string;
// //     checkInLocation?: { latitude: number; longitude: number };
// //   }): Promise<any> {
// //     return this.post<any>('/attendance/clock-in', data);
// //   }

// //   async clockOut(employeeId: string, data: {
// //     outTime: string;
// //     workHours: number;
// //     overtimeHours?: number;
// //   }): Promise<any> {
// //     return this.put<any>(`/attendance/clock-out/${employeeId}`, data);
// //   }

// //   async getTodayAttendanceStatus(employeeId: string): Promise<any> {
// //     return this.get<any>(`/attendance/today/${employeeId}`);
// //   }

// //   async getEmployeeAttendance(
// //     employeeId: string, 
// //     filters?: { month?: number; year?: number }
// //   ): Promise<any> {
// //     const queryParams = new URLSearchParams();
// //     if (filters?.month) queryParams.append('month', filters.month.toString());
// //     if (filters?.year) queryParams.append('year', filters.year.toString());
    
// //     const queryString = queryParams.toString();
// //     const url = queryString 
// //       ? `/attendance/employee/${employeeId}?${queryString}`
// //       : `/attendance/employee/${employeeId}`;
    
// //     return this.get<any>(url);
// //   }

// //   async getAllAttendance(filters?: {
// //     employeeId?: string;
// //     month?: number;
// //     year?: number;
// //     startDate?: string;
// //     endDate?: string;
// //   }): Promise<any> {
// //     const queryParams = new URLSearchParams();
// //     if (filters?.employeeId) queryParams.append('employeeId', filters.employeeId);
// //     if (filters?.month) queryParams.append('month', filters.month.toString());
// //     if (filters?.year) queryParams.append('year', filters.year.toString());
// //     if (filters?.startDate) queryParams.append('startDate', filters.startDate);
// //     if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    
// //     const queryString = queryParams.toString();
// //     const url = queryString ? `/attendance?${queryString}` : '/attendance';
    
// //     return this.get<any>(url);
// //   }

// //   async importAttendance(records: any[]): Promise<any> {
// //     return this.post<any>('/attendance/import', records);
// //   }

// //   async getEmployeePayslips(employeeId: string): Promise<any> {
// //     try {
// //       const response = await this.get(`/payroll/employee/${employeeId}/payslips`);
// //       return Array.isArray(response) ? response : [];
// //     } catch (error) {
// //       console.error('❌ Failed to fetch employee payslips:', error);
// //       return [];
// //     }
// //   }

// // }

// // // Create singleton instance
// // export const api = new HRAPI();