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
  BadRequestException,
  UsePipes,
  ValidationPipe
} from '@nestjs/common'; 
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
// ✅ Import the interface
import { ImportError } from './employees.service';

@UseGuards(AuthGuard('jwt'))
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  // ✅ 1. CREATE SINGLE EMPLOYEE
  @Post()
  create(@Body() dto: CreateEmployeeDto, @Req() req) {
    return this.service.create(dto, req.user.userId);
  }

  // ✅ 2. BULK IMPORT - with proper return type
  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  bulkImport(@Body() body: { records: CreateEmployeeDto[] }, @Req() req): Promise<{
    success: number;
    failed: number;
    errors: ImportError[];
    created: any[];
  }> {
    return this.service.bulkImport(body.records, req.user.userId);
  }

  // ✅ 3. PHOTO UPLOAD
  @Post(':id/photo')
    @UseInterceptors(FileInterceptor('photo', {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const path = require('path');
                const fs = require('fs');
                
                // Use /tmp directory on Render (persists between restarts)
                const uploadPath = process.env.RENDER 
                    ? '/tmp/uploads/employee-photos'  // Render's temporary storage
                    : path.join(process.cwd(), 'uploads', 'employee-photos');
                
                console.log('📁 Upload directory path:', uploadPath);
                
                // Create directory recursively
                if (!fs.existsSync(uploadPath)) {
                    console.log('📁 Creating upload directory:', uploadPath);
                    fs.mkdirSync(uploadPath, { recursive: true, mode: 0o755 });
                }
                
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const employeeId = req.params.id;
                const fileExt = require('path').extname(file.originalname);
                const fileName = `${employeeId}-${Date.now()}${fileExt}`;
                console.log('📸 Saving file as:', fileName);
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
            fileSize: 2 * 1024 * 1024
        }
    }))


  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req
  ) {
    console.log('🚀 Photo upload request received for employee:', id);
    
    if (!file) {
        console.error('❌ No file uploaded');
        throw new BadRequestException('No file uploaded');
    }

    console.log('📁 File saved at:', file.path);
    console.log('📁 File size:', file.size);
    console.log('📁 File mimetype:', file.mimetype);

    let backendUrl = process.env.BACKEND_URL;
    
    if (!backendUrl) {
        const port = process.env.PORT || 10000;
        if (process.env.RENDER) {
            backendUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'hris-50hb.onrender.com'}`;
        } else {
            backendUrl = `http://localhost:${port}`;
        }
    }
    
    // Construct the URL based on where the file was saved
    const filePath = process.env.RENDER 
        ? `/uploads/employee-photos/${file.filename}`  // Note: /tmp is not in URL
        : `/uploads/employee-photos/${file.filename}`;
    
    const photoUrl = `${backendUrl}${filePath}`;
    
    console.log('🔗 Generated photo URL:', photoUrl);
    
    try {
        const updated = await this.service.updatePhoto(id, photoUrl, req.user.userId);
        console.log('✅ Employee updated with photo URL');
        
        return { 
            photoUrl: updated.photoUrl,
            message: 'Photo uploaded successfully' 
        };
    } catch (error) {
        console.error('❌ Error updating employee photo:', error);
        throw error;
    }
  }

  // ✅ 4. UPDATE EMPLOYEE - BYPASS VALIDATION PIPE
  @Put(':id')
  @UsePipes(new ValidationPipe({
    whitelist: false,  // ⭐ CRITICAL: Don't strip properties
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    skipMissingProperties: true,
    validationError: { target: false, value: false },
  }))
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

  // ✅ 7. SINGLE EMPLOYEE
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

}

// import {
//   Controller,
//   Post,
//   Put,
//   Get,
//   Delete,
//   Param,
//   Body,
//   Req,
//   UseGuards,
//   HttpCode,
//   HttpStatus,
//   UploadedFile,
//   UseInterceptors,
//   BadRequestException,
//   UsePipes,
//   ValidationPipe
// } from '@nestjs/common'; 
// import { EmployeesService } from './employees.service';
// import { CreateEmployeeDto } from './dto/create-employee.dto';
// import { UpdateEmployeeDto } from './dto/update-employee.dto';
// import { AuthGuard } from '@nestjs/passport';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { diskStorage } from 'multer';
// import { extname } from 'path';
// // ✅ Import the interface
// import { ImportError } from './employees.service';

// @UseGuards(AuthGuard('jwt'))
// @Controller('employees')
// export class EmployeesController {
//   constructor(private readonly service: EmployeesService) {}

//   // ✅ 1. CREATE SINGLE EMPLOYEE
//   @Post()
//   create(@Body() dto: CreateEmployeeDto, @Req() req) {
//     return this.service.create(dto, req.user.userId);
//   }

//   // ✅ 2. BULK IMPORT - with proper return type
//   @Post('bulk-import')
//   @HttpCode(HttpStatus.OK)
//   bulkImport(@Body() body: { records: CreateEmployeeDto[] }, @Req() req): Promise<{
//     success: number;
//     failed: number;
//     errors: ImportError[];
//     created: any[];
//   }> {
//     return this.service.bulkImport(body.records, req.user.userId);
//   }

//   // ✅ 3. PHOTO UPLOAD
//   @Post(':id/photo')
//   @UseInterceptors(FileInterceptor('photo', {
//       storage: diskStorage({
//           destination: (req, file, cb) => {
//               const path = require('path');
//               const fs = require('fs');
//               const uploadPath = path.join(process.cwd(), 'uploads', 'employee-photos');
              
//               if (!fs.existsSync(uploadPath)) {
//                   console.log('📁 Creating upload directory:', uploadPath);
//                   fs.mkdirSync(uploadPath, { recursive: true });
//               }
              
//               cb(null, uploadPath);
//           },
//           filename: (req, file, cb) => {
//               const employeeId = req.params.id;
//               const fileExt = require('path').extname(file.originalname);
//               const fileName = `${employeeId}-${Date.now()}${fileExt}`;
//               cb(null, fileName); 
//           }
//       }),
//       fileFilter: (req, file, cb) => {
//           if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
//               return cb(new Error('Only image files are allowed!'), false);
//           }
//           cb(null, true);
//       },
//       limits: {
//           fileSize: 2 * 1024 * 1024
//       }
//   }))


//   async uploadPhoto(
//       @Param('id') id: string,
//       @UploadedFile() file: Express.Multer.File,
//       @Req() req
//   ) {
      
//       if (!file) {
//           throw new BadRequestException('No file uploaded');
//       }

//       let backendUrl = process.env.BACKEND_URL;
      
//       if (!backendUrl) {
//           const port = process.env.PORT || 10000;
//           if (process.env.RENDER) {
//               backendUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'hris-50hb.onrender.com'}`;
//           } else {
//               backendUrl = `http://localhost:${port}`;
//           }
//       }
      
//       const photoUrl = `${backendUrl}/uploads/employee-photos/${file.filename}`;
      
//       try {
//           const updated = await this.service.updatePhoto(id, photoUrl, req.user.userId);
//           const response = { 
//               photoUrl: updated.photoUrl,
//               message: 'Photo uploaded successfully' 
//           };
          
//           return response;
//       } catch (error) {
//           console.error('❌ Error updating employee photo:', error);
//           throw error;
//       }
//   }

//   // ✅ 4. UPDATE EMPLOYEE - BYPASS VALIDATION PIPE
//   @Put(':id')
//   @UsePipes(new ValidationPipe({
//     whitelist: false,  // ⭐ CRITICAL: Don't strip properties
//     forbidNonWhitelisted: false,
//     transform: true,
//     transformOptions: { enableImplicitConversion: true },
//     skipMissingProperties: true,
//     validationError: { target: false, value: false },
//   }))
//   update(
//     @Param('id') id: string,
//     @Body() dto: UpdateEmployeeDto,
//     @Req() req,
//   ) {
//     return this.service.update(id, dto, req.user.userId);
//   }

//   // ✅ 5. DELETE EMPLOYEE
//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.service.remove(id);
//   }

//   // ✅ 6. LIST ALL EMPLOYEES
//   @Get()
//   findAll() {
//     return this.service.findAll();
//   }

//   // ✅ 7. SINGLE EMPLOYEE
//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.service.findOne(id);
//   }

// }