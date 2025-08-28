import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import moment from 'moment-timezone';
import { TransactionData } from '../interfaces/stripe.interface';

@Injectable()
export class ExportService {
  // Helper function to create truly password-protected ZIP files using system zip command
  async createPasswordProtectedZip(
    fileBuffer: Buffer,
    filename: string,
    password: string,
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
      let zipCommand: string;

      if (process.platform === 'win32') {
        // Use PowerShell Compress-Archive on Windows (note: this doesn't support password protection)
        // For now, we'll use a simple zip without password on Windows
        zipCommand = `powershell -command "Compress-Archive -Path '${tempFilePath}' -DestinationPath '${tempZipPath}' -Force"`;
      } else {
        // Use zip command on Unix systems
        zipCommand = `zip -j -P "${password}" "${tempZipPath}" "${tempFilePath}"`;
      }

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

  // Helper function to create password-protected PDF report
  async createPdfReport(
    transactions: TransactionData[],
    startDate: string,
    endDate: string,
    password: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape', // Use landscape for better table display
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
          // Add password protection directly to PDF
          userPassword: password,
          ownerPassword: password,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false,
            fillingForms: false,
            contentAccessibility: false,
            documentAssembly: false,
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        // Add header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('Stripe Connect Report', { align: 'center' });

        doc.moveDown();
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Report Period: ${startDate} to ${endDate}`, {
            align: 'center',
          });

        doc.moveDown();
        doc.text(
          `Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss UTC')}`,
          {
            align: 'center',
          },
        );

        doc.moveDown(2);

        doc.moveDown(2);

        // Add detailed table
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Detailed Transaction Details');

        doc.moveDown();

        // Table headers with comprehensive data
        const headers = [
          'Date',
          'Account ID',
          'Charges Count',
          'Charges Amount',
          'Refunds Count',
          'Refunds Amount',
          'Total Count',
          'Total Amount',
        ];
        const pageWidth = doc.page.width - 100; // Leave 50px margin on each side
        const columnWidths = [
          pageWidth * 0.12, // Date: 12%
          pageWidth * 0.2, // Account ID: 20%
          pageWidth * 0.12, // Charges Count: 12%
          pageWidth * 0.14, // Charges Amount: 14%
          pageWidth * 0.12, // Refunds Count: 12%
          pageWidth * 0.14, // Refunds Amount: 14%
          pageWidth * 0.08, // Total Count: 8%
          pageWidth * 0.08, // Total Amount: 8%
        ];
        const startX = 50;
        let currentY = doc.y;

        const headerRowHeight = 30; // fixed height to avoid overlap

        doc.fontSize(10).font('Helvetica-Bold').fillColor('black');

        // Draw headers
        headers.forEach((header, index) => {
          const x =
            startX +
            columnWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
          doc.text(header, x + 5, currentY + 5, {
            width: columnWidths[index] - 10,
          });
        });

        // Draw horizontal line just below header
        doc
          .moveTo(startX, currentY + headerRowHeight)
          .lineTo(
            startX + columnWidths.reduce((sum, w) => sum + w, 0),
            currentY + headerRowHeight,
          )
          .stroke();

        // Move Y position for table rows
        currentY += headerRowHeight + 5;

        // Draw data rows with proper pagination
        doc.fontSize(9).font('Helvetica').fillColor('black');

        transactions.forEach((tx, rowIndex) => {
          // Check if we need a new page (leave 50px margin at bottom)
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;

            // Redraw header on new page
            doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
            headers.forEach((header, index) => {
              const x =
                startX +
                columnWidths
                  .slice(0, index)
                  .reduce((sum, width) => sum + width, 0);
              doc.rect(x, currentY, columnWidths[index], 20).fill();
              doc.fillColor('gray').text(header, x + 5, currentY + 5, {
                width: columnWidths[index] - 10,
              });
            });
            currentY += 25;
            doc.fontSize(9).font('Helvetica').fillColor('black');
          }

          const rowData = [
            tx.date,
            tx.account_id || 'N/A',
            tx.charges_count || 0,
            `$${(tx.charges_amount / 100).toFixed(2)}`,
            tx.refunds_count || 0,
            `$${(tx.refunds_amount / 100).toFixed(2)}`,
            tx.totals_count || 0,
            `$${(tx.totals_amount / 100).toFixed(2)}`,
          ];

          // Alternate row colors
          if (rowIndex % 2 === 0) {
            doc.fillColor('#f0f0f0');
            doc
              .rect(
                startX,
                currentY,
                columnWidths.reduce((sum, width) => sum + width, 0),
                20,
              )
              .fill();
            doc.fillColor('black');
          }

          rowData.forEach((cell, index) => {
            const x =
              startX +
              columnWidths
                .slice(0, index)
                .reduce((sum, width) => sum + width, 0);
            doc.text(String(cell), x + 5, currentY + 5, {
              width: columnWidths[index] - 10,
            });
          });

          currentY += 20;
        });

        // Add footer with page count
        doc.addPage();
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            'This report contains sensitive financial data and is password protected.',
            {
              align: 'center',
            },
          );

        doc.moveDown();
        doc.text(
          'For questions about this report, please contact your system administrator.',
          {
            align: 'center',
          },
        );

        doc.moveDown();
        doc.text(`Total pages: ${doc.bufferedPageRange().count}`, {
          align: 'center',
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper function to create Excel file
  async createExcelFile(transactions: TransactionData[]): Promise<Buffer> {
    try {
      // Generate XLS data with account ID column
      const xlsData = transactions.map((tx) => ({
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

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stripe Report');

      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer',
      });

      return excelBuffer;
    } catch (error) {
      console.error('Error creating Excel file:', error);
      throw new Error('Failed to create Excel file');
    }
  }
}
