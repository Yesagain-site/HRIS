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
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto } from './dto/create-payroll-period.dto';
import { UpdatePayrollEntryDto } from './dto/update-payroll-entry.dto';

@Controller('payroll')
@UseGuards(AuthGuard('jwt'))
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('fix/update-from-excel/:year/:month')
  async fixUpdateFromExcel(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.payrollService.fixUpdateFromExcel(month, year);
  }

  @Post('fix/sync-all-entries/:year/:month')
  async fixSyncAllEntries(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.payrollService.fixSyncAllEntries(month, year);
  }

  /**
   * GET /payroll/month/:year/:month
   * Get or create payroll for month/year
   */
  @Get('month/:year/:month')
  async getPayrollByMonth(
    @Param('year') year: number,
    @Param('month') month: number,
    @Req() req,
  ) {
    return this.payrollService.getOrCreatePayrollPeriod(
      month,
      year,
      req.user.userId,
    );
  }

  @Get('debug/check-data/:year/:month')
  async debugCheckData(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    return this.payrollService.debugCheckData(month, year);
  }

  /**
   * PUT /payroll/entry/:id
   * Update a single entry
   */
  @Put('entry/:id')
  async updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollEntryDto,
  ) {
    return this.payrollService.updateEntry(id, dto);
  }

  /**
   * POST /payroll/entry/:id/calculate
   * Calculate a single entry
   */
  @Post('entry/:id/calculate')
  async calculateEntry(@Param('id') id: string) {
    return this.payrollService.calculateEntry(id);
  }

  /**
   * POST /payroll/period/:periodId/calculate-all
   * Calculate all entries for a period
   */
  @Post('period/:periodId/calculate-all')
  async calculateAllEntries(@Param('periodId') periodId: string) {
    return this.payrollService.calculateAllEntries(periodId);
  }

  /**
   * POST /payroll/period/:periodId/generate
   * Generate payroll (finalize)
   */
  @Post('period/:periodId/generate')
  async generatePayroll(@Param('periodId') periodId: string, @Req() req) {
    return this.payrollService.generatePayroll(periodId, req.user.userId);
  }

  /**
   * DELETE /payroll/period/:periodId
   * Delete payroll period
   */
  @Delete('period/:periodId')
  async deletePayrollPeriod(@Param('periodId') periodId: string) {
    return this.payrollService.deletePayrollPeriod(periodId);
  }

  /**
   * DELETE /payroll/month/:year/:month
   * Delete by month/year
   */
  @Delete('month/:year/:month')
  async deleteByMonthYear(
    @Param('year') year: number,
    @Param('month') month: number,
  ) {
    const payroll = await this.payrollService.findByMonthYear(month, year);
    if (payroll && payroll.period) {
      await this.payrollService.deletePayrollPeriod(payroll.period._id);
    }
    return { message: 'Payroll deleted successfully' };
  }

  /**
   * POST /payroll/settings-period
   * Create period from settings
   */
  @Post('settings-period')
  async createSettingsPeriod(@Body() dto: any, @Req() req) {
    return this.payrollService.createPeriodFromSettings(dto, req.user.userId);
  }

  /**
   * GET /payroll/settings-periods
   * Get settings periods
   */
  @Get('settings-periods')
  async getSettingsPeriods() {
    return this.payrollService.getSettingsPeriods();
  }

  /**
   * DELETE /payroll/settings-period/:id
   * Delete settings period
   */
  @Delete('settings-period/:id')
  async deleteSettingsPeriod(@Param('id') id: string) {
    await this.payrollService.deleteSettingsPeriod(id);
    return { message: 'Period deleted successfully' };
  }

  /**
   * POST /payroll/entry
   * Create a single payroll entry
   */
  @Post('entry')
  async createEntry(@Body() dto: any, @Req() req) {
    return this.payrollService.createEntry(dto, req.user.userId);
  }

  /**
   * GET /payroll/period/:periodId/entries
   * Get all entries for a period
   */
  @Get('period/:periodId/entries')
  async getEntriesByPeriod(@Param('periodId') periodId: string) {
    return this.payrollService.getEntriesByPeriod(periodId);
  }

  /**
   * DELETE /payroll/entry/:id
   * Delete a single payroll entry
   */
  @Delete('entry/:id')
  async deleteEntry(@Param('id') id: string) {
    await this.payrollService.deleteEntry(id);
    return { message: 'Payroll entry deleted successfully' };
  }

  /**
   * GET /payroll
   * Get all payrolls
   */
  @Get()
  async getAllPayrolls(@Query() query: any) {
    const { year, month, isGenerated } = query;
    return this.payrollService.getAllPayrolls({ year, month, isGenerated });
  }

  /**
   * POST /payroll/period/:periodId/sync-attendance
   * Sync attendance data to payroll entries
   * This fetches the latest attendance data and updates payroll entries
   */
  @Post('period/:periodId/sync-attendance')
  async syncAttendanceToPayroll(
    @Param('periodId') periodId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    if (!month || !year) {
      throw new BadRequestException('Month and year are required');
    }

    return this.payrollService.syncAttendanceToPayroll(
      periodId,
      Number(month),
      Number(year),
    );
  }
}