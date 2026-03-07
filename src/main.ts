// main.ts - COMPLETE FIX
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ensureUploadDirectory } from './utils/create-upload-dir';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  ensureUploadDirectory();
  
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // ✅ CRITICAL - Add ValidationPipe with proper configuration
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
  
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Backend is running on port: ${port}`);
  console.log(`📁 Serving static files from: ${join(__dirname, '..', 'uploads')}`);
}
bootstrap();