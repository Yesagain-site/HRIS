// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { PayrollModule } from './payroll/payroll.module';
import { AttendanceModule } from './attendance/attendance.module';
import * as dotenv from 'dotenv';

// Load .env manually for debugging
dotenv.config();
console.log('🔍 Direct process.env.MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Try multiple ways to get the URI
        const uriFromConfig = config.get<string>('MONGODB_URI');
        const uriFromEnv = process.env.MONGODB_URI;
        
        console.log('📦 From ConfigService:', uriFromConfig ? 'Found' : 'Not found');
        console.log('📦 From process.env:', uriFromEnv ? 'Found' : 'Not found');
        
        const uri = uriFromConfig || uriFromEnv || 'mongodb://localhost:27017/hris-backend-db';
        console.log('📦 Using URI:', uri.replace(/:[^:@]*@/, ':****@'));
        
        return {
          uri: uri,
        };
      },
    }),
    AuthModule,
    EmployeesModule,
    PayrollModule, 
    AttendanceModule
  ],
})
export class AppModule {}