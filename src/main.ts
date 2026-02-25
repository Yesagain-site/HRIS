// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Increase payload size limit
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'https://yespeople.netlify.app';
  app.enableCors({
    origin: [frontendUrl, 'https://yespeople.netlify.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // ⭐ CRITICAL: Use PORT from environment (Render sets this to 10000 by default)
  const port = process.env.PORT || 3000;
  
  // ⭐ CRITICAL: Listen on 0.0.0.0 to accept external connections
  await app.listen(port, '0.0.0.0');
  
  // Log the actual port being used
  console.log(`🚀 Backend is running on port: ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();