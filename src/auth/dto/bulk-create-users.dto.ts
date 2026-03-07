// bulk-create-users.dto.ts
import { IsArray, ValidateNested, IsOptional, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateUserItemDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class BulkCreateUsersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateUserItemDto)
  users: BulkCreateUserItemDto[];

  @IsOptional()
  @IsString()
  roleId?: string;
}