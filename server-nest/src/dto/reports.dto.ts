import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class MultiAccountReportDto {
  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

export class TransactionDataDto {
  date: string;
  charges_count: number;
  charges_amount: number;
  refunds_count: number;
  refunds_amount: number;
  chargebacks_count: number;
  chargebacks_amount: number;
  declines_count: number;
  aprvl_pct: number;
  totals_count: number;
  totals_amount: number;
  account_id: string;
}

export class AccountInfoDto {
  id: string;
  business_type: string;
  country: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  email: string;
  type: string;
}

export class MultiAccountReportResponseDto {
  success: boolean;
  data: TransactionDataDto[];
  accounts: AccountInfoDto[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}

export class TimezoneResponseDto {
  success: boolean;
  timezones: string[];
  total: number;
  note: string;
}
