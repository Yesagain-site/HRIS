// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🔥 INCREASE PAYLOAD SIZE LIMIT 🔥
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  
  // ✅ Use environment variable for CORS origin
  const frontendUrl = process.env.FRONTEND_URL || 'https://yespeople.netlify.app';
  
  app.enableCors({
    origin: [frontendUrl, 'https://yespeople.netlify.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // ✅ Use PORT from environment variable
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  
  console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();