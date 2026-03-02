// dto/update-employee.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}


// import { PartialType } from '@nestjs/mapped-types';
// import { CreateEmployeeDto } from './create-employee.dto';

// export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
