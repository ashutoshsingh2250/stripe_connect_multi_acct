import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

export class ExportRequestDto {
  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  period?: string = 'custom';

  @IsOptional()
  @IsEmail()
  email?: string;
}
