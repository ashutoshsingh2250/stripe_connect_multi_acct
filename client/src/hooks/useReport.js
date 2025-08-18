import { useState, useCallback } from 'react';
import { apiService } from '../services/api';

export const useReport = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [paginationLoading, setPaginationLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateReport = useCallback(
        async (formData, page = 1, limit = 10) => {
            try {
                // Set appropriate loading state based on whether it's a pagination change
                if (
                    report &&
                    (page !== report.pagination?.currentPage ||
                        limit !== report.pagination?.itemsPerPage)
                ) {
                    setPaginationLoading(true);
                } else {
                    setLoading(true);
                }
                setError(null);

                const params = new URLSearchParams({
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    timezone: formData.timezone,
                    period: formData.period,
                    page: page.toString(),
                    limit: limit.toString(),
                });

                // Always use multi-account endpoint for consistency
                const response = await apiService.getMultiAccountReport(
                    formData.connectedAccountId,
                    params
                );

                if (response.success) {
                    const transformedReport = {
                        transactions: response.data || [],
                        accounts: response.accounts || [],
                        pagination: {
                            currentPage: response.pagination?.currentPage || page,
                            itemsPerPage: response.pagination?.itemsPerPage || limit,
                            totalItems: response.pagination?.totalItems || 0,
                            totalPages: response.pagination?.totalPages || 0,
                            hasPrevPage: response.pagination?.hasPrevPage || false,
                            hasNextPage: response.pagination?.hasNextPage || false,
                        },
                        dateRange: {
                            start: formData.startDate,
                            end: formData.endDate,
                        },
                        timezone: formData.timezone,
                    };

                    setReport(transformedReport);
                    return transformedReport;
                } else {
                    throw new Error(response.error || 'Failed to generate report');
                }
            } catch (error) {
                console.error('Error generating report:', error);
                setError(error.message || 'Failed to generate report');
                throw error;
            } finally {
                setLoading(false);
                setPaginationLoading(false);
            }
        },
        [report]
    );

    const exportReport = useCallback(async (formData, format = 'csv', email = null) => {
        try {
            setExportLoading(true);
            setError(null);

            let response;
            if (format === 'csv') {
                response = await apiService.exportToCSV(formData.connectedAccountId, {
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    timezone: formData.timezone,
                    period: formData.period,
                });
            } else if (format === 'xls' || format === 'xlsx') {
                response = await apiService.exportToXLS(formData.connectedAccountId, {
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    timezone: formData.timezone,
                    period: formData.period,
                });
            } else if (format === 'sheets') {
                response = await apiService.exportToGoogleSheets(formData.connectedAccountId, {
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    timezone: formData.timezone,
                    period: formData.period,
                });
            } else if (format === 'email') {
                if (!email) {
                    throw new Error('Email address is required for email export');
                }

                response = await apiService.exportToEmail(formData.connectedAccountId, {
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    timezone: formData.timezone,
                    period: formData.period,
                    email: email,
                });
            } else {
                throw new Error(`Unsupported export format: ${format}`);
            }

            if (response.success) {
                // Handle file download
                if (format === 'csv') {
                    // Create blob from CSV content
                    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download =
                        response.filename ||
                        `stripe-report-${formData.startDate}-${formData.endDate}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else if (format === 'xls' || format === 'xlsx') {
                    // Handle base64-encoded Excel data from backend
                    if (response.data) {
                        // Convert base64 to binary array
                        const binaryString = atob(response.data);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }

                        // Create blob and download
                        const blob = new Blob([bytes], {
                            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download =
                            response.filename ||
                            `stripe-report-${formData.startDate}-${formData.endDate}.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    } else {
                        throw new Error('No Excel data received from server');
                    }
                } else if (format === 'sheets') {
                    // Handle Google Sheets export (CSV format for easy import)
                    if (response.data) {
                        // Create blob from CSV content
                        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download =
                            response.filename ||
                            `stripe-report-${formData.startDate}-${formData.endDate}-google-sheets.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                    } else {
                        throw new Error('No Google Sheets data received from server');
                    }
                } else if (format === 'email') {
                    // Handle email export response
                    if (response.success) {
                        // Show success message (you can enhance this with a toast notification)
                        // You could set a success state here to show a success message to the user
                    } else {
                        throw new Error(response.error || 'Failed to send email export');
                    }
                }
            } else {
                console.error('Export failed:', response.error);
                throw new Error(response.error || 'Failed to export report');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            setError(error.message || 'Failed to export report');
            throw error;
        } finally {
            setExportLoading(false);
        }
    }, []);

    return {
        report,
        setReport,
        loading,
        exportLoading,
        paginationLoading,
        error,
        generateReport,
        exportReport,
    };
};
