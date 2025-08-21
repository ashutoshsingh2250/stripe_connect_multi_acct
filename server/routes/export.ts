import { Router, Response } from 'express';
import { validateJWT, validateStripeKeys } from '../middleware/auth';
import stripeService from '../services/stripeService';
import emailService from '../services/emailService';
import XLSX from 'xlsx';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Helper function to create truly password-protected ZIP files using system zip command
async function createPasswordProtectedZip(
    fileBuffer: Buffer,
    filename: string,
    password: string
): Promise<Buffer> {
    const execAsync = promisify(exec);

    try {
        // Create temporary directory and files
        const tempDir = path.join(__dirname, '../temp');
        const tempFilePath = path.join(tempDir, filename);
        const tempZipPath = path.join(tempDir, 'temp_' + Date.now() + '.zip');

        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Write file to temp directory
        fs.writeFileSync(tempFilePath, fileBuffer);

        // Create password-protected ZIP using system zip command
        // Use -j flag to junk (ignore) directory paths and only zip the file
        const zipCommand = `zip -j -P "${password}" "${tempZipPath}" "${tempFilePath}"`;
        await execAsync(zipCommand);

        // Read the ZIP file
        const zipBuffer = fs.readFileSync(tempZipPath);

        // Clean up temporary files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(tempZipPath);

        return zipBuffer;
    } catch (error) {
        console.error('Error creating password-protected ZIP:', error);
        throw new Error('Failed to create password-protected ZIP file');
    }
}

// CSV Export endpoint
router.post(
    '/csv/:accountIds',
    validateJWT,
    validateStripeKeys,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { accountIds } = req.params;
            const { start_date, end_date, timezone = 'UTC', period = 'custom' } = req.body;

            let startDate: string, endDate: string;

            // Handle different period types
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
                    startDate = start_date as string;
                    endDate = end_date as string;
                    break;
                default:
                    return res.status(400).json({
                        error: 'Bad Request',
                        message: 'Invalid period. Use: daily, weekly, monthly, or custom',
                    });
            }

            // Validate dates
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

            // Parse account IDs (comma-separated)
            const accountIdList = accountIds.split(',').map(id => id.trim());
            if (accountIdList.length === 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'At least one account ID is required',
                });
            }

            // Get transactions for all accounts
            const { transactions } = await stripeService.getMultiAccountTransactions(
                req.user!.secretKey,
                accountIdList,
                startDate,
                endDate,
                timezone as string
            );

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

            const csvRows = transactions.map(tx => [
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
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            // Create password-protected ZIP file containing the CSV file
            const zipPassword = 'stripe2024!';
            const csvBuffer = Buffer.from(csvContent, 'utf-8');
            const zipBuffer = await createPasswordProtectedZip(
                csvBuffer,
                `stripe-report-${startDate}-${endDate}.csv`,
                zipPassword
            );

            // Send ZIP file directly as binary download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="stripe-report-${startDate}-${endDate}-PROTECTED.csv.zip"`
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
);

// Excel Export endpoint
router.post(
    '/xls/:accountIds',
    validateJWT,
    validateStripeKeys,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { accountIds } = req.params;
            const { start_date, end_date, timezone = 'UTC', period = 'custom' } = req.body;

            let startDate: string, endDate: string;

            // Handle different period types
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
                    startDate = start_date as string;
                    endDate = end_date as string;
                    break;
                default:
                    return res.status(400).json({
                        error: 'Bad Request',
                        message: 'Invalid period. Use: daily, weekly, monthly, or custom',
                    });
            }

            // Validate dates
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

            // Parse account IDs (comma-separated)
            const accountIdList = accountIds.split(',').map(id => id.trim());
            if (accountIdList.length === 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'At least one account ID is required',
                });
            }

            // Get transactions for all accounts
            const { transactions } = await stripeService.getMultiAccountTransactions(
                req.user!.secretKey,
                accountIdList,
                startDate,
                endDate,
                timezone as string
            );

            // Generate XLS data with account ID column
            const xlsData = transactions.map(tx => ({
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

            // Generate Excel file with XLSX - clean and simple data only
            const worksheet = XLSX.utils.json_to_sheet(xlsData);
            const workbook = XLSX.utils.book_new();

            // Define ZIP password for the ZIP file protection
            const zipPassword = 'stripe2024!';

            XLSX.utils.book_append_sheet(workbook, worksheet, 'Stripe Report');

            // Generate Excel buffer
            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'buffer',
            });

            // Create password-protected ZIP file containing the Excel file
            const zipBuffer = await createPasswordProtectedZip(
                excelBuffer,
                `stripe-report-${startDate}-${endDate}.xlsx`,
                zipPassword
            );

            // Send ZIP file directly as binary download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="stripe-report-${startDate}-${endDate}-PROTECTED.zip"`
            );
            res.setHeader('Content-Length', zipBuffer.length.toString());

            return res.send(zipBuffer);
        } catch (error) {
            console.error('Error exporting XLS:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to export XLS',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

// Email export endpoint
router.post(
    '/email/:accountIds',
    validateJWT,
    validateStripeKeys,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { accountIds } = req.params;
            const { start_date, end_date, timezone = 'UTC', period = 'custom', email } = req.body;

            if (!email) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Email address is required for email export',
                });
            }

            let startDate: string, endDate: string;

            // Handle different period types
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
                    startDate = start_date as string;
                    endDate = end_date as string;
                    break;
                default:
                    return res.status(400).json({
                        error: 'Bad Request',
                        message: 'Invalid period. Use: daily, weekly, monthly, or custom',
                    });
            }

            // Validate dates
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

            // Parse account IDs (comma-separated)
            const accountIdList = accountIds.split(',').map(id => id.trim());
            if (accountIdList.length === 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'At least one account ID is required',
                });
            }

            // Get transactions for all accounts
            const { transactions } = await stripeService.getMultiAccountTransactions(
                req.user!.secretKey,
                accountIdList,
                startDate,
                endDate,
                timezone as string
            );

            // Send email with report attachment
            const emailSent = await emailService.sendStripeReport(email, transactions, {
                startDate,
                endDate,
                timezone: timezone as string,
                accountCount: accountIdList.length,
            });

            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    error: 'Failed to send email',
                    message: 'Email service is not configured or failed to send the email',
                });
            }

            // Return success response
            return res.json({
                success: true,
                message: `Report with ${transactions.length} daily summaries has been sent to ${email}`,
                data: {
                    email,
                    dailySummaryCount: transactions.length,
                    dateRange: { startDate, endDate },
                    accountIds: accountIdList,
                    totalTransactions: transactions.reduce(
                        (sum, tx) => sum + (tx.totals_count || 0),
                        0
                    ),
                    totalAmount:
                        transactions.reduce((sum, tx) => sum + (tx.totals_amount || 0), 0) / 100,
                },
            });
        } catch (error) {
            console.error('Error exporting to email:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to export to email',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
);

// Google Sheets export endpoint
router.post(
    '/sheets/:accountIds',
    validateJWT,
    validateStripeKeys,
    async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const { accountIds } = req.params;
            const { start_date, end_date, timezone = 'UTC', period = 'custom' } = req.body;

            let startDate: string, endDate: string;

            // Handle different period types
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
                    startDate = start_date as string;
                    endDate = end_date as string;
                    break;
                default:
                    return res.status(400).json({
                        error: 'Bad Request',
                        message: 'Invalid period. Use: daily, weekly, monthly, or custom',
                    });
            }

            // Validate dates
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

            // Parse account IDs (comma-separated)
            const accountIdList = accountIds.split(',').map(id => id.trim());
            if (accountIdList.length === 0) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'At least one account ID is required',
                });
            }

            // Get transactions for all accounts
            const { transactions } = await stripeService.getMultiAccountTransactions(
                req.user!.secretKey,
                accountIdList,
                startDate,
                endDate,
                timezone as string
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

            const csvRows = transactions.map(tx => [
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
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            // Create password-protected ZIP file containing the CSV file for Google Sheets
            const zipPassword = 'stripe2024!';
            const csvBuffer = Buffer.from(csvContent, 'utf-8');
            const zipBuffer = await createPasswordProtectedZip(
                csvBuffer,
                `stripe-report-${startDate}-${endDate}-google-sheets.csv`,
                zipPassword
            );

            // Send ZIP file directly as binary download
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="stripe-report-${startDate}-${endDate}-google-sheets-PROTECTED.zip"`
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
);

export default router;
