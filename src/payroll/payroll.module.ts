import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollPeriod, PayrollPeriodSchema } from './schemas/payroll-period.schema';
import { PayrollEntry, PayrollEntrySchema } from './schemas/payroll-entry.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Attendance, AttendanceSchema } from '../attendance/schemas/attendance.schema';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollPeriod.name, schema: PayrollPeriodSchema },
      { name: PayrollEntry.name, schema: PayrollEntrySchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    AttendanceModule,

  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollCalculationService],
  exports: [PayrollService]
})
export class PayrollModule {}