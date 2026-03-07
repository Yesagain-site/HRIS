import { IsNotEmpty, IsString, IsEmail, IsOptional, IsBoolean, IsMongoId, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional() // ✅ Changed: Made optional
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsMongoId()
  roleId: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}