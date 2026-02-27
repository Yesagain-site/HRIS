import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private employeeModel: Model<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto, userId: string) {
    try {
      const employee = new this.employeeModel({
        ...dto,
        createdBy: userId,
        createdAt: new Date(),
      });

      const validationError = employee.validateSync();
      if (validationError) {
        console.error('❌ VALIDATION ERROR:', validationError.errors);
        throw validationError;
      }

      const saved = await employee.save();
      const result = saved.toObject() as any;
      return {
        ...result,
        id: result._id.toString()
      };
    } catch (error) {
      console.error('❌ SAVE FAILED in hris-backend-db:', error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, userId: string) {
    const employee = await this.employeeModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const result = employee.toObject() as any;
    return {
      ...result,
      id: result._id.toString()
    };
  }

  async findAll() {
    const employees = await this.employeeModel.find().sort({ createdAt: -1 });

    const results = employees.map(emp => {
      const result = emp.toObject() as any;
      return {
        ...result,
        id: result._id.toString()
      };
    });
    
    // Only log once on first call, not repeatedly
    if (results.length > 0 && results[0].photoUrl) {
      console.log('📋 Employees with photoUrls found:', results.filter(e => e.photoUrl).length);
    }
    
    return results;
  }

  async findOne(id: string) {
    const employee = await this.employeeModel.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const result = employee.toObject() as any;
    return {
      ...result,
      id: result._id.toString()
    };
  }

  async remove(id: string) {
    const deleted = await this.employeeModel.findByIdAndDelete(id);

    if (!deleted) {
      throw new NotFoundException('Employee not found');
    }

    return { message: 'Employee deleted successfully' };
  }

  // ✅ NEW: Bulk import employees from Excel upload
  async bulkImport(
    records: CreateEmployeeDto[],
    userId: string,
  ): Promise<{
    success: number;
    failed: number;
    errors: { row: number; staffId: string; reason: string }[];
    created: any[];
  }> {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('No records provided');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; staffId: string; reason: string }[],
      created: [] as any[],
    };

    for (let i = 0; i < records.length; i++) {
      const dto = records[i];
      const rowNum = i + 2; // Row 2 onward in Excel (row 1 = header)

      try {
        // Check for duplicate staffId or email before inserting
        const existing = await this.employeeModel.findOne({
          $or: [
            { staffId: dto.staffId },
            { email: dto.email },
          ],
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            staffId: dto.staffId || '—',
            reason:
              existing.staffId === dto.staffId
                ? `Staff ID "${dto.staffId}" already exists`
                : `Email "${dto.email}" already exists`,
          });
          continue;
        }

        const employee = new this.employeeModel({
          ...dto,
          createdBy: userId,
          createdAt: new Date(),
        });

        const saved = await employee.save();
        const result = saved.toObject() as any;
        results.created.push({ ...result, id: result._id.toString() });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          staffId: dto.staffId || '—',
          reason: error?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  async updatePhoto(id: string, photoUrl: string, userId: string) {
      console.log('🔧 updatePhoto called with:');
      console.log('   id:', id);
      console.log('   photoUrl:', photoUrl);
      console.log('   userId:', userId);
      
      const employee = await this.employeeModel.findByIdAndUpdate(
          id,
          {
              photoUrl,
              updatedBy: userId,
              updatedAt: new Date(),
          },
          { new: true },
      );

      if (!employee) {
          throw new NotFoundException('Employee not found');
      }

      const result = employee.toObject() as any;
      const finalResult = {
          ...result,
          id: result._id.toString()
      };
      
      console.log('✅ updatePhoto returning:');
      console.log('   photoUrl:', finalResult.photoUrl);
      console.log('   Full result keys:', Object.keys(finalResult));
      
      return finalResult;
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

//     return employees.map(emp => {
//       const result = emp.toObject() as any;
//       return {
//         ...result,
//         id: result._id.toString()
//       };
//     });
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
//       return {
//           ...result,
//           id: result._id.toString()
//       };
//   }
// }