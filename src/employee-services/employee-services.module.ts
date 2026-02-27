import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceRequestsController } from './employee-services.controller';
import { ServiceRequestsService } from './employee-services.service';
import { ServiceRequest, ServiceRequestSchema } from './schemas/service-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceRequest.name, schema: ServiceRequestSchema }
    ])
  ],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
  exports: [ServiceRequestsService]
})
export class ServiceRequestsModule {}