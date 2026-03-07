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
        // Create employee without any validation
        const employeeData = {
          ...record,
          createdBy: userId,
          createdAt: new Date(),
        };

        // Insert directly using collection to bypass all Mongoose validation
        const inserted = await this.employeeModel.collection.insertOne(employeeData);
        
        // Fetch the saved document
        const savedDoc = await this.employeeModel.findById(inserted.insertedId);
        
        if (savedDoc) {
          const result = savedDoc.toObject() as any;
          results.created.push({ ...result, id: result._id.toString() });
        }
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 2,
          staffId: record.staffId || '—',
          reason: error?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

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





