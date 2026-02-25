import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  // Create single employee (from Add New form)
  @Post()
  create(@Body() dto: CreateEmployeeDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  // ✅ NEW: Bulk import from Excel
  // IMPORTANT: This must come BEFORE @Get(':id') and @Put(':id') or NestJS
  // will try to match 'bulk-import' as an :id param.
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  bulkImport(@Body() body: { records: CreateEmployeeDto[] }, @Req() req) {
    return this.service.bulkImport(body.records, req.user.userId);
  }

  // Update (Save Changes per tab)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  // List all employees
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // Single employee
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Delete employee
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}