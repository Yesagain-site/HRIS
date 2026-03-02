import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export interface ImportError {
  row: number;
  staffId: string;
  reason: string;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private employeeModel: Model<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto, userId: string) {
    const employee = new this.employeeModel({
      ...dto,
      createdBy: userId,
      createdAt: new Date(),
    });

    const saved = await employee.save();
    const result = saved.toObject() as any;

    return { ...result, id: result._id.toString() };
  }

  async update(id: string, dto: UpdateEmployeeDto, userId: string) {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: userId, updatedAt: new Date() },
      { new: true, runValidators: false },
    );

    if (!employee) throw new NotFoundException('Employee not found');

    const result = employee.toObject() as any;
    return { ...result, id: result._id.toString() };
  }

  async findAll() {
    const employees = await this.employeeModel.find().sort({ createdAt: -1 });

    return employees.map(emp => {
      const result = emp.toObject() as any;
      return { ...result, id: result._id.toString() };
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeModel.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');

    const result = employee.toObject() as any;
    return { ...result, id: result._id.toString() };
  }

  async remove(id: string) {
    const deleted = await this.employeeModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Employee not found');

    return { message: 'Employee deleted successfully' };
  }

  // ✅ BULK IMPORT FIXED VERSION
  async bulkImport(records: any[], userId: string) {
    const results: {
      success: number;
      failed: number;
      errors: any[];
      created: any[];
    } = {
      success: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      try {
        const rawData = {
          ...record,
          createdBy: userId,
          createdAt: new Date(),
        };

        const inserted = await this.employeeModel.collection.insertOne(rawData);

        const savedDoc = await this.employeeModel.findById(inserted.insertedId);

        if (savedDoc) {
          results.created.push(savedDoc);
        }

        results.success++;

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          staffId: record.staffId || '—',
          reason: error.message,
        });
      }
    }

    return results;
  }
  // async bulkImport(
  //   records: CreateEmployeeDto[],
  //   userId: string,
  // ): Promise<{
  //   success: number;
  //   failed: number;
  //   errors: ImportError[];
  //   created: any[];
  // }> {
  //   const results = {
  //     success: 0,
  //     failed: 0,
  //     errors: [] as ImportError[],
  //     created: [] as any[],
  //   };

  //   for (let i = 0; i < records.length; i++) {
  //     const record = records[i];
  //     const rowNum = i + 2;

  //     try {
  //       // ✅ AUTO FIX STAFF ID
  //       let staffId = record.staffId || `EMP-${Date.now()}-${i}`;

  //       const existingStaff = await this.employeeModel.findOne({ staffId });
  //       if (existingStaff) {
  //         staffId = `${staffId}-${Date.now()}`;
  //       }

  //       // ✅ AUTO FIX EMAIL
  //       let email = record.email;
  //       if (!email) {
  //         email = `${staffId.replace(/[^a-zA-Z0-9]/g, '')}@company.com`;
  //       }

  //       const emailExists = await this.employeeModel.findOne({ email });
  //       if (emailExists) {
  //         email = `${staffId}-${Date.now()}@company.com`;
  //       }

  //       // ✅ FULL NAME SPLIT LOGIC (IMPORTANT FIX)
  //       let firstName = record.firstName || '';
  //       let middleName = record.middleName || '';
  //       let lastName = record.lastName || '';

  //       // If Excel sent full name in firstName column
  //       if (firstName && !lastName && firstName.includes(' ')) {
  //         const parts = firstName.trim().split(/\s+/);

  //         firstName = parts[0] || '';
  //         lastName = parts.length > 1 ? parts[parts.length - 1] : '';
  //         middleName =
  //           parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
  //       }

  //       if (!firstName) firstName = 'Employee';

  //       // ✅ BUILD EMPLOYEE DATA
  //       const employeeData: any = {
  //         staffId,
  //         firstName,
  //         middleName,
  //         lastName,
  //         email,
  //         phone: record.phone || '',
  //         gender: record.gender || '',
  //         dob: record.dob || '',
  //         nationality: record.nationality || '',
  //         maritalStatus: record.maritalStatus || '',
  //         address: record.address || '',
  //         workStatus: record.workStatus || 'Active',
  //         joiningDate:
  //           record.joiningDate ||
  //           new Date().toISOString().split('T')[0],
  //         designation: record.designation || '',
  //         department: record.department || '',
  //         reportingManagerId: record.reportingManagerId || '',
  //         remarks: record.remarks || '',
  //         previousSalary: record.previousSalary || 0,
  //         baseSalary: record.baseSalary || 0,
  //         presentGrossSalary:
  //           record.presentGrossSalary || record.baseSalary || 0,
  //         allowances: record.allowances || [],
  //         payrollCode: record.payrollCode || '',
  //         payFrequency: record.payFrequency || 'Monthly',
  //         targetRate: record.targetRate || 0,
  //         bankName: record.bankName || '',
  //         iban: record.iban || '',
  //         isTaxable: record.isTaxable === true,
  //         isOvertimeEligible:
  //           record.isOvertimeEligible === true,
  //         passportNo: record.passportNo || '',
  //         passportExp: record.passportExp || '',
  //         visaStatus: record.visaStatus || '',
  //         visaStartDate: record.visaStartDate || '',
  //         visaExpDate: record.visaExpDate || '',
  //         eidNumber: record.eidNumber || '',
  //         eidIssueDate: record.eidIssueDate || '',
  //         eidExpDate: record.eidExpDate || '',
  //         documents: record.documents || [],
  //         emergencyContact: record.emergencyContact || {},
  //         leaveBalances:
  //           record.leaveBalances || {
  //             Annual: { total: 24, taken: 0 },
  //             Sick: { total: 10, taken: 0 },
  //           },
  //         customFieldValues: record.customFieldValues || {},
  //         createdBy: userId,
  //         createdAt: new Date(),
  //       };

  //       // ✅ INSERT WITHOUT VALIDATION
  //       const saved = await this.employeeModel.collection.insertOne(employeeData);
  //       const savedDoc = await this.employeeModel.findById(saved.insertedId);

  //       const result = savedDoc?.toObject() as any;
  //       results.created.push({ ...result, id: result._id.toString() });

  //       results.success++;
  //     } catch (error: any) {
  //       results.failed++;
  //       results.errors.push({
  //         row: rowNum,
  //         staffId: record.staffId || '—',
  //         reason: error?.message || 'Unknown error',
  //       });
  //     }
  //   }

  //   return results;
  // }

  async updatePhoto(id: string, photoUrl: string, userId: string) {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      { photoUrl, updatedBy: userId, updatedAt: new Date() },
      { new: true, runValidators: false },
    );

    if (!employee) throw new NotFoundException('Employee not found');

    const result = employee.toObject() as any;
    return { ...result, id: result._id.toString() };
  }
}


// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { Employee } from './schemas/employee.schema';
// import { CreateEmployeeDto } from './dto/create-employee.dto';
// import { UpdateEmployeeDto } from './dto/update-employee.dto';

// @Injectable()
// export class EmployeesService {
//   constructor(
//     @InjectModel(Employee.name)
//     private employeeModel: Model<Employee>,
//   ) {}

//   async create(dto: CreateEmployeeDto, userId: string) {
//     try {
//       const employee = new this.employeeModel({
//         ...dto,
//         createdBy: userId,
//         createdAt: new Date(),
//       });

//       const validationError = employee.validateSync();
//       if (validationError) {
//         console.error('❌ VALIDATION ERROR:', validationError.errors);
//         throw validationError;
//       }

//       const saved = await employee.save();
//       const result = saved.toObject() as any;
//       return {
//         ...result,
//         id: result._id.toString()
//       };
//     } catch (error) {
//       console.error('❌ SAVE FAILED in hris-backend-db:', error);
//       throw error;
//     }
//   }

//   async update(id: string, dto: UpdateEmployeeDto, userId: string) {
//     const employee = await this.employeeModel.findByIdAndUpdate(
//       id,
//       {
//         ...dto,
//         updatedBy: userId,
//         updatedAt: new Date(),
//       },
//       { new: true },
//     );

//     if (!employee) {
//       throw new NotFoundException('Employee not found');
//     }

//     const result = employee.toObject() as any;
//     return {
//       ...result,
//       id: result._id.toString()
//     };
//   }

//   async findAll() {
//     const employees = await this.employeeModel.find().sort({ createdAt: -1 });

//     const results = employees.map(emp => {
//       const result = emp.toObject() as any;
//       return {
//         ...result,
//         id: result._id.toString()
//       };
//     });
    
//     // Only log once on first call, not repeatedly
//     if (results.length > 0 && results[0].photoUrl) {
//       console.log('📋 Employees with photoUrls found:', results.filter(e => e.photoUrl).length);
//     }
    
//     return results;
//   }

//   async findOne(id: string) {
//     const employee = await this.employeeModel.findById(id);
//     if (!employee) {
//       throw new NotFoundException('Employee not found');
//     }

//     const result = employee.toObject() as any;
//     return {
//       ...result,
//       id: result._id.toString()
//     };
//   }

//   async remove(id: string) {
//     const deleted = await this.employeeModel.findByIdAndDelete(id);

//     if (!deleted) {
//       throw new NotFoundException('Employee not found');
//     }

//     return { message: 'Employee deleted successfully' };
//   }

//   // ✅ NEW: Bulk import employees from Excel upload
//   async bulkImport(
//     records: CreateEmployeeDto[],
//     userId: string,
//   ): Promise<{
//     success: number;
//     failed: number;
//     errors: { row: number; staffId: string; reason: string }[];
//     created: any[];
//   }> {
//     if (!Array.isArray(records) || records.length === 0) {
//       throw new BadRequestException('No records provided');
//     }

//     const results = {
//       success: 0,
//       failed: 0,
//       errors: [] as { row: number; staffId: string; reason: string }[],
//       created: [] as any[],
//     };

//     for (let i = 0; i < records.length; i++) {
//       const dto = records[i];
//       const rowNum = i + 2; // Row 2 onward in Excel (row 1 = header)

//       try {
//         // Check for duplicate staffId or email before inserting
//         const existing = await this.employeeModel.findOne({
//           $or: [
//             { staffId: dto.staffId },
//             { email: dto.email },
//           ],
//         });

//         if (existing) {
//           results.failed++;
//           results.errors.push({
//             row: rowNum,
//             staffId: dto.staffId || '—',
//             reason:
//               existing.staffId === dto.staffId
//                 ? `Staff ID "${dto.staffId}" already exists`
//                 : `Email "${dto.email}" already exists`,
//           });
//           continue;
//         }

//         const employee = new this.employeeModel({
//           ...dto,
//           createdBy: userId,
//           createdAt: new Date(),
//         });

//         const saved = await employee.save();
//         const result = saved.toObject() as any;
//         results.created.push({ ...result, id: result._id.toString() });
//         results.success++;
//       } catch (error: any) {
//         results.failed++;
//         results.errors.push({
//           row: rowNum,
//           staffId: dto.staffId || '—',
//           reason: error?.message || 'Unknown error',
//         });
//       }
//     }

//     return results;
//   }

//   async updatePhoto(id: string, photoUrl: string, userId: string) {
//       console.log('🔧 updatePhoto called with:');
//       console.log('   id:', id);
//       console.log('   photoUrl:', photoUrl);
//       console.log('   userId:', userId);
      
//       const employee = await this.employeeModel.findByIdAndUpdate(
//           id,
//           {
//               photoUrl,
//               updatedBy: userId,
//               updatedAt: new Date(),
//           },
//           { new: true },
//       );

//       if (!employee) {
//           throw new NotFoundException('Employee not found');
//       }

//       const result = employee.toObject() as any;
//       const finalResult = {
//           ...result,
//           id: result._id.toString()
//       };
      
//       console.log('✅ updatePhoto returning:');
//       console.log('   photoUrl:', finalResult.photoUrl);
//       console.log('   Full result keys:', Object.keys(finalResult));
      
//       return finalResult;
//   }
// }