import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth() {
    return { 
      status: 'OK', 
      service: 'HRIS Backend',
      timestamp: new Date().toISOString()
    };
  }
  
  @Get('test')
  test() {
    return { message: 'Test endpoint working' };
  }
}