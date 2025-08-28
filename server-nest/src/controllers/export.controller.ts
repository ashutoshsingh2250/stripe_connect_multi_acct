import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StripeService } from '../services/stripe.service';
import { EmailService } from '../services/email.service';
import { ExportService } from '../services/export.service';
import { ExportRequestDto } from '../dto/export.dto';
import { decryptSecretKey } from '../utils/encryption';
import moment from 'moment-timezone';

@Controller('api/export')
export class ExportController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
    private readonly exportService: ExportService,
  ) {}

  @Post('csv/:accountIds')
  @UseGuards(JwtAuthGuard)
  async exportCsv(
    @Param('accountIds') accountIds: string,
    @Body() body: ExportRequestDto,
    @Headers() headers: any,
    @Res() res: Response,
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
      } = body;

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
            return res.status(400).json({
              error: 'Bad Request',
              message: 'start_date and end_date are required for custom period',
            });
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid period. Use: daily, weekly, monthly, or custom',
          });
      }

      if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'start_date cannot be after end_date',
        });
      }

      const accountIdList = accountIds.split(',').map((id) => id.trim());
      if (accountIdList.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one account ID is required',
        });
      }

      // Get transactions for all accounts
      const { transactions } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdList,
          startDate,
          endDate,
          timezone,
        );

      console.log('CSV export - Transactions fetched:', transactions.length);
      console.log('CSV export - First transaction sample:', transactions[0]);

      // Generate CSV with account ID column
      const csvHeaders = [
        'Account ID',
        'Date',
        'Charges Count',
        'Charges Amount',
        'Refunds Count',
        'Refunds Amount',
        'Chargebacks Count',
        'Chargebacks Amount',
        'Declines Count',
        'Approval %',
        'Total Count',
        'Total Amount',
      ];

      const csvRows = transactions.map((tx) => [
        tx.account_id || 'N/A',
        tx.date,
        tx.charges_count || 0,
        (tx.charges_amount / 100).toFixed(2),
        tx.refunds_count || 0,
        (tx.refunds_amount / 100).toFixed(2),
        tx.chargebacks_count || 0,
        (tx.chargebacks_amount / 100).toFixed(2),
        tx.declines_count || 0,
        tx.aprvl_pct ? `${tx.aprvl_pct.toFixed(2)}%` : 'N/A',
        tx.totals_count || 0,
        (tx.totals_amount / 100).toFixed(2),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Create password-protected ZIP file containing the CSV file
      const zipPassword = 'stripe2024!';
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      const zipBuffer = await this.exportService.createPasswordProtectedZip(
        csvBuffer,
        `stripe-report-${startDate}-${endDate}.csv`,
        zipPassword,
      );

      // Send ZIP file directly as binary download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="stripe-report-${startDate}-${endDate}-PROTECTED.csv.zip"`,
      );
      res.setHeader('Content-Length', zipBuffer.length.toString());

      return res.send(zipBuffer);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export CSV',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('xls/:accountIds')
  @UseGuards(JwtAuthGuard)
  async exportExcel(
    @Param('accountIds') accountIds: string,
    @Body() body: ExportRequestDto,
    @Headers() headers: any,
    @Res() res: Response,
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
      } = body;

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
            return res.status(400).json({
              error: 'Bad Request',
              message: 'start_date and end_date are required for custom period',
            });
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid period. Use: daily, weekly, monthly, or custom',
          });
      }

      if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'start_date cannot be after end_date',
        });
      }

      const accountIdList = accountIds.split(',').map((id) => id.trim());
      if (accountIdList.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one account ID is required',
        });
      }

      // Get transactions for all accounts
      const { transactions } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdList,
          startDate,
          endDate,
          timezone,
        );

      console.log('Excel export - Transactions fetched:', transactions.length);
      console.log('Excel export - First transaction sample:', transactions[0]);

      // Generate Excel file
      const excelBuffer =
        await this.exportService.createExcelFile(transactions);

      // Create password-protected ZIP file containing the Excel file
      const zipPassword = 'stripe2024!';
      const zipBuffer = await this.exportService.createPasswordProtectedZip(
        excelBuffer,
        `stripe-report-${startDate}-${endDate}.xlsx`,
        zipPassword,
      );

      // Send ZIP file directly as binary download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="stripe-report-${startDate}-${endDate}-PROTECTED.zip"`,
      );
      res.setHeader('Content-Length', zipBuffer.length.toString());

      return res.send(zipBuffer);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export Excel',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('email/:accountIds')
  @UseGuards(JwtAuthGuard)
  async exportEmail(
    @Param('accountIds') accountIds: string,
    @Body() body: ExportRequestDto,
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
        email,
      } = body;

      if (!email) {
        throw new Error('Email address is required for email export');
      }

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
              'start_date and end_date are required for custom period',
            );
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          throw new Error(
            'Invalid period. Use: daily, weekly, monthly, or custom',
          );
      }

      if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      if (moment(startDate).isAfter(moment(endDate))) {
        throw new Error('start_date cannot be after end_date');
      }

      const accountIdList = accountIds.split(',').map((id) => id.trim());
      if (accountIdList.length === 0) {
        throw new Error('At least one account ID is required');
      }

      // Get transactions for all accounts
      const { transactions } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdList,
          startDate,
          endDate,
          timezone,
        );

      console.log('Email export - Transactions fetched:', transactions.length);
      console.log('Email export - First transaction sample:', transactions[0]);

      // Send email with report attachment
      const emailSent = await this.emailService.sendStripeReport(
        email,
        transactions,
        {
          startDate,
          endDate,
          timezone,
          accountCount: accountIdList.length,
        },
      );

      if (!emailSent) {
        throw new Error(
          'Email service is not configured or failed to send the email',
        );
      }

      // Return success response
      return {
        success: true,
        message: `Report with ${transactions.length} daily summaries has been sent to ${email}`,
        data: {
          email,
          dailySummaryCount: transactions.length,
          dateRange: { startDate, endDate },
          accountIds: accountIdList,
          totalTransactions: transactions.reduce(
            (sum, tx) => sum + (tx.totals_count || 0),
            0,
          ),
          totalAmount:
            transactions.reduce((sum, tx) => sum + (tx.totals_amount || 0), 0) /
            100,
        },
      };
    } catch (error) {
      console.error('Error exporting to email:', error);
      throw new Error(`Failed to export to email: ${error.message}`);
    }
  }

  @Post('sheets/:accountIds')
  @UseGuards(JwtAuthGuard)
  async exportGoogleSheets(
    @Param('accountIds') accountIds: string,
    @Body() body: ExportRequestDto,
    @Headers() headers: any,
    @Res() res: Response,
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
      } = body;

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
            return res.status(400).json({
              error: 'Bad Request',
              message: 'start_date and end_date are required for custom period',
            });
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid period. Use: daily, weekly, monthly, or custom',
          });
      }

      if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'start_date cannot be after end_date',
        });
      }

      const accountIdList = accountIds.split(',').map((id) => id.trim());
      if (accountIdList.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one account ID is required',
        });
      }

      // Get transactions for all accounts
      const { transactions } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdList,
          startDate,
          endDate,
          timezone,
        );

      // Generate CSV data for Google Sheets import
      const csvHeaders = [
        'Account ID',
        'Date',
        'Charges Count',
        'Charges Amount',
        'Refunds Count',
        'Refunds Amount',
        'Chargebacks Count',
        'Chargebacks Amount',
        'Declines Count',
        'Approval %',
        'Total Count',
        'Total Amount',
      ];

      const csvRows = transactions.map((tx) => [
        tx.account_id || 'N/A',
        tx.date,
        tx.charges_count || 0,
        (tx.charges_amount / 100).toFixed(2),
        tx.refunds_count || 0,
        (tx.refunds_amount / 100).toFixed(2),
        tx.chargebacks_count || 0,
        (tx.chargebacks_amount / 100).toFixed(2),
        tx.declines_count || 0,
        tx.aprvl_pct ? `${tx.aprvl_pct.toFixed(2)}%` : 'N/A',
        tx.totals_count || 0,
        (tx.totals_amount / 100).toFixed(2),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Create password-protected ZIP file containing the CSV file for Google Sheets
      const zipPassword = 'stripe2024!';
      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      const zipBuffer = await this.exportService.createPasswordProtectedZip(
        csvBuffer,
        `stripe-report-${startDate}-${endDate}-google-sheets.csv`,
        zipPassword,
      );

      // Send ZIP file directly as binary download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="stripe-report-${startDate}-${endDate}-google-sheets-PROTECTED.zip"`,
      );
      res.setHeader('Content-Length', zipBuffer.length.toString());

      return res.send(zipBuffer);
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export to Google Sheets',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Post('pdf/:accountIds')
  @UseGuards(JwtAuthGuard)
  async exportPdf(
    @Param('accountIds') accountIds: string,
    @Body() body: ExportRequestDto,
    @Headers() headers: any,
    @Res() res: Response,
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
      } = body;

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
            return res.status(400).json({
              error: 'Bad Request',
              message: 'start_date and end_date are required for custom period',
            });
          }
          startDate = start_date;
          endDate = end_date;
          break;
        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid period. Use: daily, weekly, monthly, or custom',
          });
      }

      if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid date format. Use YYYY-MM-DD',
        });
      }

      if (moment(startDate).isAfter(moment(endDate))) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'start_date cannot be after end_date',
        });
      }

      const accountIdList = accountIds.split(',').map((id) => id.trim());
      if (accountIdList.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one account ID is required',
        });
      }

      // Get transactions for all accounts
      const { transactions } =
        await this.stripeService.getMultiAccountTransactions(
          secretKey,
          accountIdList,
          startDate,
          endDate,
          timezone,
        );

      // Generate password-protected PDF report
      const pdfPassword = 'stripe2024!';
      const pdfBuffer = await this.exportService.createPdfReport(
        transactions,
        startDate,
        endDate,
        pdfPassword,
      );

      // Send password-protected PDF directly as binary download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="stripe-report-${startDate}-${endDate}-PROTECTED.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export PDF',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
