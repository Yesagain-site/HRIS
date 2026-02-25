import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreatePayrollPeriodDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNotEmpty()
  @IsNumber()
  year: number;
}