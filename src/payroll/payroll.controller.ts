import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'))
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // Get or create payroll for month/year
  @Get('month/:year/:month')
  async getPayrollByMonth(
    @Param('year') year: number,
    @Param('month') month: number,
    @Req() req
  ) {
    return this.payrollService.getOrCreatePayrollPeriod(month, year, req.user.userId);
  }

  // Update a single entry
  @Put('entry/:id')
  async updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollEntryDto
  ) {
    return this.payrollService.updateEntry(id, dto);
  }

  // Calculate a single entry
  @Post('entry/:id/calculate')
  async calculateEntry(@Param('id') id: string) {
    return this.payrollService.calculateEntry(id);
  }

  // Calculate all entries for a period
  @Post('period/:periodId/calculate-all')
  async calculateAllEntries(@Param('periodId') periodId: string) {
    return this.payrollService.calculateAllEntries(periodId);
  }

  // Generate payroll (finalize)
  @Post('period/:periodId/generate')
  async generatePayroll(
    @Param('periodId') periodId: string,
    @Req() req
  ) {
    return this.payrollService.generatePayroll(periodId, req.user.userId);
  }

  // Delete payroll period
  @Delete('period/:periodId')
  async deletePayrollPeriod(@Param('periodId') periodId: string) {
    return this.payrollService.deletePayrollPeriod(periodId);
  }

  // Delete by month/year
  @Delete('month/:year/:month')
  async deleteByMonthYear(
    @Param('year') year: number,
    @Param('month') month: number
  ) {
    const payroll = await this.payrollService.findByMonthYear(month, year);
    if (payroll && payroll.period) {
      await this.payrollService.deletePayrollPeriod(payroll.period._id);
    }
    return { message: 'Payroll deleted successfully' };
  }

  @Post('settings-period')
  async createSettingsPeriod(
    @Body() dto: any,
    @Req() req
  ) {
    return this.payrollService.createPeriodFromSettings(dto, req.user.userId);
  }

  @Get('settings-periods')
  async getSettingsPeriods() {
    return this.payrollService.getSettingsPeriods();
  }

  @Delete('settings-period/:id')
  async deleteSettingsPeriod(@Param('id') id: string) {
    await this.payrollService.deleteSettingsPeriod(id);
    return { message: 'Period deleted successfully' };
  }

  // Create a single payroll entry
  @Post('entry')
  async createEntry(@Body() dto: any, @Req() req) {
    return this.payrollService.createEntry(dto, req.user.userId);
  }

  // Get all entries for a period
  @Get('period/:periodId/entries')
  async getEntriesByPeriod(@Param('periodId') periodId: string) {
    return this.payrollService.getEntriesByPeriod(periodId);
  }

  @Get()
  async getAllPayrolls(@Query() query: any) {
    const { year, month, isGenerated } = query;
    return this.payrollService.getAllPayrolls({ year, month, isGenerated });
  }
}