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
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(AuthGuard('jwt'))
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  // ========================================================================
  // IMPORTANT: ROUTE ORDER MATTERS IN NESTJS!
  // Specific routes (like 'bulk-import', ':id/photo') MUST come before
  // generic routes (like ':id') to avoid route conflicts
  // ========================================================================

  // ✅ 1. CREATE SINGLE EMPLOYEE
  @Post()
  create(@Body() dto: CreateEmployeeDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  // ✅ 2. BULK IMPORT - MUST come BEFORE @Get(':id')
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  bulkImport(@Body() body: { records: CreateEmployeeDto[] }, @Req() req) {
    return this.service.bulkImport(body.records, req.user.userId);
  }

  // ✅ 3. PHOTO UPLOAD - MUST come BEFORE @Get(':id')
  // This route MUST be registered before @Get(':id') otherwise NestJS will
  // match /employees/123/photo to @Get(':id') with id="123/photo"
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', {
      storage: diskStorage({
          destination: (req, file, cb) => {
              const path = require('path');
              const fs = require('fs');
              const uploadPath = path.join(process.cwd(), 'uploads', 'employee-photos');
              
              // Create directory if it doesn't exist
              if (!fs.existsSync(uploadPath)) {
                  console.log('📁 Creating upload directory:', uploadPath);
                  fs.mkdirSync(uploadPath, { recursive: true });
              }
              
              cb(null, uploadPath);
          },
          filename: (req, file, cb) => {
              const employeeId = req.params.id;
              const fileExt = require('path').extname(file.originalname);
              const fileName = `${employeeId}-${Date.now()}${fileExt}`;
              cb(null, fileName);
          }
      }),
      fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
              return cb(new Error('Only image files are allowed!'), false);
          }
          cb(null, true);
      },
      limits: {
          fileSize: 2 * 1024 * 1024 // 2MB
      }
  }))
  async uploadPhoto(
      @Param('id') id: string,
      @UploadedFile() file: Express.Multer.File,
      @Req() req
  ) {
      console.log('========================================');
      console.log('📸 PHOTO UPLOAD ENDPOINT HIT');
      console.log('========================================');
      console.log('📦 Employee ID:', id);
      console.log('📦 User ID:', req.user?.userId);
      
      if (!file) {
          console.log('❌ No file received');
          throw new BadRequestException('No file uploaded');
      }

      console.log('📦 File name:', file.filename);
      console.log('📦 File size:', file.size, 'bytes');
      console.log('📦 File type:', file.mimetype);
      console.log('📦 File path:', file.path);

      // ✅ Construct proper backend URL
      // Priority: BACKEND_URL env var > construct from PORT > fallback to Render URL
      let backendUrl = process.env.BACKEND_URL;
      
      if (!backendUrl) {
          const port = process.env.PORT || 10000;
          // Check if we're on Render (Render sets RENDER env var)
          if (process.env.RENDER) {
              // On Render, use the service URL format
              backendUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'hris-50hb.onrender.com'}`;
          } else {
              // Local development
              backendUrl = `http://localhost:${port}`;
          }
      }
      
      const photoUrl = `${backendUrl}/uploads/employee-photos/${file.filename}`;
      
      console.log('🔗 Generated photo URL:', photoUrl);
      console.log('🌐 Backend URL used:', backendUrl);
      
      try {
          const updated = await this.service.updatePhoto(id, photoUrl, req.user.userId);
          console.log('✅ Photo uploaded successfully');
          console.log('📦 Service returned:', JSON.stringify(updated, null, 2));
          console.log('📸 updated.photoUrl:', updated.photoUrl);
          
          const response = { 
              photoUrl: updated.photoUrl,
              message: 'Photo uploaded successfully' 
          };
          
          console.log('📤 Sending response to client:', JSON.stringify(response, null, 2));
          console.log('========================================');
          
          return response;
      } catch (error) {
          console.error('❌ Error updating employee photo:', error);
          throw error;
      }
  }

  // ✅ 4. UPDATE EMPLOYEE
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  // ✅ 5. DELETE EMPLOYEE
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ✅ 6. LIST ALL EMPLOYEES
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // ✅ 7. SINGLE EMPLOYEE - MUST be LAST!
  // This MUST come after all other :id routes because it's a catch-all
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}