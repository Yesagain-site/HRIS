import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { ServiceRequestsModule } from '../employee-services/employee-services.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    forwardRef(() => ServiceRequestsModule),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [MongooseModule, EmployeesService], // ⭐ This is important! Export MongooseModule
})
export class EmployeesModule {}