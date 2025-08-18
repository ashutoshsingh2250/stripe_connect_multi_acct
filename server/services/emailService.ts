import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import { TransactionData } from '../types';

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    private createTransporter(): nodemailer.Transporter {
        // Create transporter using environment variables
        return nodemailer.createTransport({
            host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
            port: parseInt(process.env['SMTP_PORT'] || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env['SMTP_USER']?.trim(),
                pass: process.env['SMTP_PASS']?.trim(),
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
    }

    private getTransporter(): nodemailer.Transporter {
        if (!this.transporter) {
            this.transporter = this.createTransporter();
        }
        return this.transporter;
    }

    private generateExcelBuffer(transactions: TransactionData[]): Buffer {
        // Generate Excel data with account ID column
        const excelData = transactions.map(tx => ({
            'Account ID': tx.account_id || 'N/A',
            Date: tx.date,
            'Charges Count': tx.charges_count || 0,
            'Charges Amount': (tx.charges_amount / 100).toFixed(2),
            'Refunds Count': tx.refunds_count || 0,
            'Refunds Amount': (tx.refunds_amount / 100).toFixed(2),
            'Chargebacks Count': tx.chargebacks_count || 0,
            'Chargebacks Amount': (tx.chargebacks_amount / 100).toFixed(2),
            'Declines Count': tx.declines_count || 0,
            'Approval %': tx.aprvl_pct ? `${tx.aprvl_pct.toFixed(2)}%` : 'N/A',
            'Total Count': tx.totals_count || 0,
            'Total Amount': (tx.totals_amount / 100).toFixed(2),
        }));

        // Create workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stripe Report');

        // Generate Excel buffer
        return XLSX.write(workbook, {
            bookType: 'xlsx',
            type: 'buffer',
        });
    }

    private generateEmailHTML(reportInfo: {
        startDate: string;
        endDate: string;
        timezone: string;
        accountCount: number;
    }): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Stripe Connect Report</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .header { background: #6772e5; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Stripe Connect Report</h1>
                </div>

                <div class="content">
                    <p>Hello,</p>

                    <p>Your Stripe Connect report has been generated and is attached to this email.</p>

                    <div class="summary">
                        <h3>Report Summary:</h3>
                        <ul>
                            <li><strong>Date Range:</strong> ${reportInfo.startDate} to ${reportInfo.endDate}</li>
                            <li><strong>Timezone:</strong> ${reportInfo.timezone}</li>
                            <li><strong>Accounts:</strong> ${reportInfo.accountCount}</li>
                        </ul>
                    </div>

                    <p>The report is attached as an Excel file (.xlsx) for your convenience.</p>

                    <p>If you have any questions about this report, please don't hesitate to contact us.</p>

                    <p>Best regards,<br>Stripe Connect Reporting Team</p>
                </div>

                <div class="footer">
                    <p>This is an automated report from your Stripe Connect Reporting system.</p>
                </div>
            </body>
            </html>
        `;
    }

    async sendStripeReport(
        toEmail: string,
        transactions: TransactionData[],
        reportInfo: {
            startDate: string;
            endDate: string;
            timezone: string;
            accountCount: number;
        }
    ): Promise<boolean> {
        try {
            // Generate Excel file as attachment
            const excelBuffer = this.generateExcelBuffer(transactions);

            // Create email content
            const subject = `Stripe Connect Report - ${reportInfo.startDate} to ${reportInfo.endDate}`;
            const htmlContent = this.generateEmailHTML(reportInfo);

            // Send email with attachment
            const mailOptions = {
                from: process.env['SMTP_USER'],
                to: toEmail,
                subject: subject,
                html: htmlContent,
                attachments: [
                    {
                        filename: `stripe-report-${reportInfo.startDate}-${reportInfo.endDate}.xlsx`,
                        content: excelBuffer,
                        contentType:
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    },
                ],
            };

            await this.getTransporter().sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            return false;
        }
    }
}

export default new EmailService();
