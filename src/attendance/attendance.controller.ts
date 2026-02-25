import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD in UAE time (Asia/Dubai / UTC+4).
 * This is the authoritative date used for clock-out matching so it is
 * consistent with the date the frontend sent at clock-in time.
 */
function getUAEDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('attendance')
@UseGuards(AuthGuard('jwt'))
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * POST /attendance/clock-in
   * Body includes: employeeId, date (UAE), inTime (UAE), checkInMethod, checkInLocation?
   * The service auto-calculates lateness from inTime.
   */
  @Post('clock-in')
  async clockIn(@Body() dto: CreateAttendanceDto, @Req() req) {
    try {
      return await this.attendanceService.clockIn(
        dto.employeeId,
        dto,
        req.user.userId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to clock in',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * PUT /attendance/clock-out/:employeeId
   * Body includes: outTime (UAE HH:MM)
   * The service re-calculates work hours, OT, and early-departure from the
   * stored inTime — the frontend does NOT need to compute these.
   */
  @Put('clock-out/:employeeId')
  async clockOut(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    try {
      // Use the UAE date as the authoritative date to find today's record.
      const date = getUAEDateString();
      return await this.attendanceService.clockOut(employeeId, date, dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to clock out',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * GET /attendance/today/:employeeId
   * Returns hasClockedIn, hasClockedOut, and the full record for today.
   */
  @Get('today/:employeeId')
  async getTodayStatus(@Param('employeeId') employeeId: string) {
    try {
      const date = getUAEDateString();
      return await this.attendanceService.getTodayStatus(employeeId, date);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get today status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /attendance/employee/:employeeId
   * Get attendance records for a specific employee with optional filters
   */
  @Get('employee/:employeeId')
  async getEmployeeAttendance(
    @Param('employeeId') employeeId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    try {
      return await this.attendanceService.getEmployeeAttendance(employeeId, {
        month,
        year,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get employee attendance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /attendance
   * Get all attendance records with optional filters
   */
  @Get()
  async getAllAttendance(
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      return await this.attendanceService.getAllAttendance({
        employeeId,
        month,
        year,
        startDate,
        endDate,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get attendance records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /attendance/import
   * Bulk import attendance records from Excel/CSV
   * Body: Array of CreateAttendanceDto
   */
  @Post('import')
  async importAttendance(
    @Body() records: CreateAttendanceDto[],
    @Req() req,
  ) {
    try {
      // Validate that records is an array
      if (!Array.isArray(records)) {
        throw new HttpException(
          'Request body must be an array of attendance records',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that array is not empty
      if (records.length === 0) {
        throw new HttpException(
          'Cannot import empty array of records',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate maximum batch size (optional security measure)
      if (records.length > 5000) {
        throw new HttpException(
          'Cannot import more than 5000 records at once. Please split into smaller batches.',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.attendanceService.importAttendance(
        records,
        req.user.userId,
      );

      return {
        success: true,
        imported: result.length,
        message: `Successfully imported ${result.length} attendance records`,
        records: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to import attendance records',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * DELETE /attendance/:id
   * Delete a specific attendance record (admin only)
   */
  @Delete(':id')
  async deleteAttendance(@Param('id') id: string, @Req() req) {
    try {
      // Optional: Add role check here
      // if (req.user.role !== 'admin') throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      
      return await this.attendanceService.deleteAttendance(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete attendance record',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * PUT /attendance/:id
   * Update a specific attendance record (admin only)
   */
  @Put(':id')
  async updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Req() req,
  ) {
    try {
      return await this.attendanceService.updateAttendance(id, dto, req.user.userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update attendance record',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * GET /attendance/stats/:employeeId
   * Get attendance statistics for an employee
   */
  @Get('stats/:employeeId')
  async getEmployeeStats(
    @Param('employeeId') employeeId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    try {
      return await this.attendanceService.getEmployeeStats(employeeId, {
        month,
        year,
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get employee statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


// import {
//   Controller,
//   Post,
//   Get,
//   Put,
//   Body,
//   Param,
//   Query,
//   UseGuards,
//   Req,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { AttendanceService } from './attendance.service';
// import { CreateAttendanceDto } from './dto/create-attendance.dto';
// import { UpdateAttendanceDto } from './dto/update-attendance.dto';

// // ─── Utility ─────────────────────────────────────────────────────────────────

// /**
//  * Returns today's date as YYYY-MM-DD in UAE time (Asia/Dubai / UTC+4).
//  * This is the authoritative date used for clock-out matching so it is
//  * consistent with the date the frontend sent at clock-in time.
//  */
// function getUAEDateString(): string {
//   return new Intl.DateTimeFormat('en-CA', {
//     timeZone : 'Asia/Dubai',
//     year     : 'numeric',
//     month    : '2-digit',
//     day      : '2-digit',
//   }).format(new Date());
// }

// // ─── Controller ──────────────────────────────────────────────────────────────

// @Controller('attendance')
// @UseGuards(AuthGuard('jwt'))
// export class AttendanceController {
//   constructor(private readonly attendanceService: AttendanceService) {}

//   /**
//    * POST /attendance/clock-in
//    * Body includes: employeeId, date (UAE), inTime (UAE), checkInMethod, checkInLocation?
//    * The service auto-calculates lateness from inTime.
//    */
//   @Post('clock-in')
//   async clockIn(@Body() dto: CreateAttendanceDto, @Req() req) {
//     return this.attendanceService.clockIn(dto.employeeId, dto, req.user.userId);
//   }

//   /**
//    * PUT /attendance/clock-out/:employeeId
//    * Body includes: outTime (UAE HH:MM)
//    * The service re-calculates work hours, OT, and early-departure from the
//    * stored inTime — the frontend does NOT need to compute these.
//    */
//   @Put('clock-out/:employeeId')
//   async clockOut(
//     @Param('employeeId') employeeId: string,
//     @Body() dto: UpdateAttendanceDto,
//   ) {
//     // Use the UAE date as the authoritative date to find today's record.
//     const date = getUAEDateString();
//     return this.attendanceService.clockOut(employeeId, date, dto);
//   }

//   /**
//    * GET /attendance/today/:employeeId
//    * Returns hasClockedIn, hasClockedOut, and the full record for today.
//    */
//   @Get('today/:employeeId')
//   async getTodayStatus(@Param('employeeId') employeeId: string) {
//     const date = getUAEDateString();
//     return this.attendanceService.getTodayStatus(employeeId, date);
//   }

//   @Get('employee/:employeeId')
//   async getEmployeeAttendance(
//     @Param('employeeId') employeeId: string,
//     @Query('month') month?: number,
//     @Query('year') year?: number,
//   ) {
//     return this.attendanceService.getEmployeeAttendance(employeeId, { month, year });
//   }

//   @Get()
//   async getAllAttendance(
//     @Query('employeeId') employeeId?: string,
//     @Query('month') month?: number,
//     @Query('year') year?: number,
//     @Query('startDate') startDate?: string,
//     @Query('endDate') endDate?: string,
//   ) {
//     return this.attendanceService.getAllAttendance({
//       employeeId,
//       month,
//       year,
//       startDate,
//       endDate,
//     });
//   }

//   @Post('import')
//   async importAttendance(@Body() records: CreateAttendanceDto[], @Req() req) {
//     return this.attendanceService.importAttendance(records, req.user.userId);
//   }
// }