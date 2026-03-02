import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema'; // Import Employee schema
import { EmployeesModule } from '../employees/employees.module'; // Import EmployeesModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Employee.name, schema: EmployeeSchema }, // Add Employee schema here
    ]),
    EmployeesModule, // Also import EmployeesModule to get its providers
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [MongooseModule], // Export MongooseModule so other modules can use AttendanceModel
})
export class AttendanceModule {}