import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StripeService } from '../services/stripe.service';
import { MultiAccountReportDto, TimezoneResponseDto } from '../dto/reports.dto';
import { decryptSecretKey } from '../utils/encryption';
import moment from 'moment-timezone';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('timezones')
  async getTimezones(): Promise<TimezoneResponseDto> {
    try {
      const allTimezones = moment.tz.names();
      const usaTimezones = allTimezones.filter(
        (tz) =>
          tz.startsWith('America/') ||
          tz.startsWith('US/') ||
          tz === 'UTC' ||
          tz === 'GMT',
      );

      usaTimezones.sort();

      return {
        success: true,
        timezones: usaTimezones,
        total: usaTimezones.length,
        note: 'Showing USA timezones only',
      };
    } catch (error) {
      console.error('Error in timezone endpoint:', error);
      throw new Error('Failed to fetch timezones');
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@Headers() headers: any) {
    try {
      const encryptedSecretKey = headers['x-secret-key'];
      if (!encryptedSecretKey) {
        throw new Error('Secret key is required');
      }

      const secretKey = decryptSecretKey(encryptedSecretKey);
      const accounts = await this.stripeService.getMultipleAccounts(secretKey);

      return {
        success: true,
        accounts,
        total: accounts.length,
      };
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }

  @Get('multi/:accountIds')
  @UseGuards(JwtAuthGuard)
  async getMultiAccountReport(
    @Param('accountIds') accountIds: string,
    @Query() query: MultiAccountReportDto,
    @Headers() headers: any,
  ) {
    try {
      const encryptedSecretKey = headers['x-secret-key'];
      if (!encryptedSecretKey) {
        throw new Error('Secret key is required');
      }

      const secretKey = decryptSecretKey(encryptedSecretKey);

      const {
        start_date,
        end_date,
        timezone = 'UTC',
        period = 'custom',
        page = 1,
        limit = 10,
      } = query;

      let startDate: string, endDate: string;

      switch (period) {
        case 'daily':
          startDate = moment().subtract(1, 'day').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD');
          break;
        case 'weekly':
          startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD');
          break;
        case 'monthly':
          startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD');
          break;
        case 'custom':
          if (!start_date || !end_date) {
            throw new Error(
              'Start date and end date are required for custom period',
            );
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          throw new Error('Invalid period type');
      }

      const accountIdArray = accountIds.split(',').map((id) => id.trim());

      const { transactions, accounts } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdArray,
          startDate,
          endDate,
          timezone,
        );

      const totalItems = transactions.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedTransactions = transactions.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedTransactions,
        accounts,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems,
          totalPages,
          hasPrevPage: page > 1,
          hasNextPage: page < totalPages,
        },
      };
    } catch (error) {
      console.error('Error generating multi-account report:', error);
      throw new Error('Failed to generate report');
    }
  }
}
