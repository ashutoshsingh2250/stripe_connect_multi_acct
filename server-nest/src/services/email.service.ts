import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { TransactionData } from '../interfaces/stripe.interface';
import { ExportService } from './export.service';

@Injectable()
export class EmailService {
  private transporter: any;

  constructor(private readonly exportService: ExportService) {
    // Initialize nodemailer transporter
    this.transporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password',
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    attachments?: any[],
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER || 'your-email@gmail.com',
        to,
        subject,
        text,
        attachments,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendReportEmail(
    to: string,
    reportData: Buffer,
    filename: string,
    startDate: string,
    endDate: string,
    accountCount: number,
  ): Promise<void> {
    const subject = `Stripe Connect Report - ${startDate} to ${endDate}`;
    const text = `Please find attached your Stripe Connect report for ${startDate} to ${endDate}.

This report covers ${accountCount} connected account(s).

IMPORTANT: The attached ZIP file is password-protected.
Password: stripe2024!

Best regards,
Stripe Connect Reporting System`;

    const attachments = [
      {
        filename,
        content: reportData,
      },
    ];

    await this.sendEmail(to, subject, text, attachments);
  }

  async sendStripeReport(
    email: string,
    transactions: TransactionData[],
    options: {
      startDate: string;
      endDate: string;
      timezone: string;
      accountCount: number;
    },
  ): Promise<boolean> {
    try {
      // Generate CSV content for the report
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

      const csvBuffer = Buffer.from(csvContent, 'utf-8');
      const csvFilename = `stripe-report-${options.startDate}-${options.endDate}.csv`;

      // Create password-protected ZIP file containing the CSV
      const zipPassword = 'stripe2024!';
      const zipBuffer = await this.exportService.createPasswordProtectedZip(
        csvBuffer,
        csvFilename,
        zipPassword,
      );

      const zipFilename = `stripe-report-${options.startDate}-${options.endDate}-PROTECTED.csv.zip`;

      // Send email with password-protected ZIP attachment
      await this.sendReportEmail(
        email,
        zipBuffer,
        zipFilename,
        options.startDate,
        options.endDate,
        options.accountCount,
      );

      return true;
    } catch (error) {
      console.error('Error sending Stripe report email:', error);
      return false;
    }
  }
}
