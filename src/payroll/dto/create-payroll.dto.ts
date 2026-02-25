// backend/src/payroll/dto/create-payroll.dto.ts
export class CreatePayrollDto {
  year: number;
  month: number;
  data: any[];
  headers: string[];
  isGenerated: boolean;
  fileName?: string;
}

// backend/src/payroll/dto/update-payroll.dto.ts
export class UpdatePayrollDto {
  data?: any[];
  isGenerated?: boolean;
  headers?: string[];
}

// backend/src/payroll/dto/filter-payroll.dto.ts
export class FilterPayrollDto {
  year?: number;
  month?: number;
  isGenerated?: boolean;
}