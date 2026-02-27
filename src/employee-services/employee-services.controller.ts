import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServiceRequestsService } from './employee-services.service';
import { CreateServiceRequestDto } from './dto/create-service.dto';
import { UpdateServiceRequestStatusDto } from './dto/update-service-request-status.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly service: ServiceRequestsService) {}

  @Post()
  create(@Body() dto: CreateServiceRequestDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateServiceRequestStatusDto,
    @Req() req,
  ) {
    return this.service.updateStatus(id, dto, req.user.userId, req.user.name);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}