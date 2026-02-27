import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateServiceRequestStatusDto {
  @IsString()
  @IsNotEmpty()
  status: 'Approved' | 'Rejected';

  @IsString()
  @IsOptional()
  managerNotes?: string;
}