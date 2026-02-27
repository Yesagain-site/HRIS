import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; // Add Types import
import { ServiceRequest } from './schemas/service-request.schema';
import { CreateServiceRequestDto } from './dto/create-service.dto';
import { UpdateServiceRequestStatusDto } from './dto/update-service-request-status.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectModel(ServiceRequest.name)
    private serviceRequestModel: Model<ServiceRequest>,
  ) {}

  async create(dto: CreateServiceRequestDto, userId: string) {
    // Convert string IDs to ObjectIds
    const serviceRequest = new this.serviceRequestModel({
      ...dto,
      employeeId: new Types.ObjectId(dto.employeeId), // Convert to ObjectId
      createdBy: new Types.ObjectId(userId), // Convert to ObjectId
      createdAt: new Date(),
      status: 'Pending',
    });

    const saved = await serviceRequest.save();
    const result = saved.toObject() as any;
    return {
      ...result,
      id: result._id.toString(),
      employeeId: result.employeeId.toString(), // Convert back to string for frontend
      createdBy: result.createdBy?.toString(),
    };
  }

  async findAll(query: any) {
    const filter: any = {};
    
    if (query.employeeId) {
      filter.employeeId = new Types.ObjectId(query.employeeId); // Convert to ObjectId
    }
    
    if (query.requestType) {
      filter.requestType = query.requestType;
    }
    
    if (query.status) {
      filter.status = query.status;
    }

    const requests = await this.serviceRequestModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();

    return requests.map(req => {
      const result = req.toObject() as any;
      return {
        ...result,
        id: result._id.toString(),
        employeeId: result.employeeId?.toString(), // Convert ObjectId to string
        approverId: result.approverId?.toString(),
        createdBy: result.createdBy?.toString(),
        updatedBy: result.updatedBy?.toString(),
      };
    });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid request ID');
    }

    const request = await this.serviceRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException('Service request not found');
    }
    
    const result = request.toObject() as any;
    return {
      ...result,
      id: result._id.toString(),
      employeeId: result.employeeId?.toString(),
      approverId: result.approverId?.toString(),
      createdBy: result.createdBy?.toString(),
      updatedBy: result.updatedBy?.toString(),
    };
  }

  async updateStatus(id: string, dto: UpdateServiceRequestStatusDto, userId: string, userName: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid request ID');
    }

    const request = await this.serviceRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    request.status = dto.status;
    request.approverId = new Types.ObjectId(userId); // Convert to ObjectId
    request.approverName = userName;
    request.approvalDate = new Date();
    request.managerNotes = dto.managerNotes || '';

    const updated = await request.save();
    const result = updated.toObject() as any;
    return {
      ...result,
      id: result._id.toString(),
      employeeId: result.employeeId?.toString(),
      approverId: result.approverId?.toString(),
      createdBy: result.createdBy?.toString(),
      updatedBy: result.updatedBy?.toString(),
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid request ID');
    }

    const deleted = await this.serviceRequestModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new NotFoundException('Service request not found');
    }
    return { message: 'Service request deleted successfully' };
  }
}