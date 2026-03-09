// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ensureUploadDirectory } from './utils/create-upload-dir';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  ensureUploadDirectory();
  
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    skipMissingProperties: true,
    validationError: { target: false, value: false },  
  }));
  
  const frontendUrl = process.env.FRONTEND_URL || 'https://hris-ya.vercel.app';
  app.enableCors({
    origin: [frontendUrl, 'https://hris-ya.vercel.app', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // ✅ Serve from both possible locations
  // 1. Regular uploads folder
  const regularUploadPath = join(__dirname, '..', 'uploads');
  if (fs.existsSync(regularUploadPath)) {
    app.useStaticAssets(regularUploadPath, {
      prefix: '/uploads/',
    });
    console.log(`📁 Serving static files from: ${regularUploadPath}`);
  }
  
  // 2. Render's /tmp folder
  const tmpUploadPath = '/tmp/uploads'; 
  if (fs.existsSync(tmpUploadPath)) {
    app.useStaticAssets(tmpUploadPath, {
      prefix: '/uploads/',
    });
    console.log(`📁 Serving static files from: ${tmpUploadPath}`);
  }
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend is running on port: ${port}`);

  // Log all upload directories
  console.log('📁 Checking upload directories:');
  const dirsToCheck = [
    join(__dirname, '..', 'uploads'),
    join(__dirname, '..', 'uploads', 'employee-photos'),
    '/tmp/uploads',
    '/tmp/uploads/employee-photos'
  ];
  
  dirsToCheck.forEach(dir => {
    const exists = fs.existsSync(dir);
    console.log(`   ${dir}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (exists) {
      try {
        const files = fs.readdirSync(dir);
        console.log(`   📄 Files in ${dir}:`, files.length ? files : 'empty');
      } catch (err) {
        console.log(`   ❌ Cannot read directory:`, err.message);
      }
    }
  });
}
bootstrap();