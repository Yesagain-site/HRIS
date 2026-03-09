import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceRequestsController } from './employee-services.controller';
import { ServiceRequestsService } from './employee-services.service';
import { ServiceRequest, ServiceRequestSchema } from './schemas/service-request.schema';
import { EmployeesModule } from '../employees/employees.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceRequest.name, schema: ServiceRequestSchema }
    ]),
    forwardRef(() => EmployeesModule),
  ],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
  exports: [ServiceRequestsService]
})
export class ServiceRequestsModule {}