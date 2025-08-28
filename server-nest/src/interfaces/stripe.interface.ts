export interface TransactionData {
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

export interface AccountInfo {
  id: string;
  business_type: string;
  country: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  email: string;
  type: string;
}

export interface MultiAccountReportResponse {
  success: boolean;
  data: TransactionData[];
  accounts: AccountInfo[];
  pagination: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
}

export interface TimezoneResponse {
  success: boolean;
  timezones: string[];
  total: number;
  note: string;
}
