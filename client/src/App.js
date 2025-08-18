import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    CssBaseline,
    ThemeProvider,
    createTheme,
    AppBar,
    Toolbar,
} from '@mui/material';
import { format } from 'date-fns';

// Custom hooks
import { useTimezones } from './hooks/useTimezones';
import { useReport } from './hooks/useReport';

// API service
import { apiService } from './services/api';

// Encryption utilities
import { encryptApiKey, encryptPublicKey } from './utils/encryption';

// Components
import ReportForm from './components/forms/ReportForm';
import ReportDisplay from './components/reports/ReportDisplay';
import ExportButtons from './components/export/ExportButtons';
import EmailExportModal from './components/export/EmailExportModal';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';

// Create theme
const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

function App() {
    // Form state
    const [formData, setFormData] = useState({
        connectedAccountId: '',
        apiKey: '',
        publicKey: '',
        startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        timezone: 'America/New_York',
        period: 'custom',
    });

    // Accounts state
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(false);

    // Email export modal state
    const [emailModalOpen, setEmailModalOpen] = useState(false);

    // Custom hooks
    const { timezones } = useTimezones();
    const {
        report,
        setReport,
        loading,
        exportLoading,
        paginationLoading,
        error,
        generateReport,
        exportReport,
    } = useReport();

    // Fetch accounts function
    const handleFetchAccounts = async () => {
        try {
            setAccountsLoading(true);
            const headers = {
                Authorization: `Bearer ${encryptApiKey(formData.apiKey)}`,
                'x-public-key': encryptPublicKey(formData.publicKey),
            };
            const response = await apiService.getAccounts(headers);
            if (response.success) {
                setAccounts(response.accounts || []);
            } else {
                console.error('Failed to fetch accounts:', response.error);
                setAccounts([]);
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
            setAccounts([]);
        } finally {
            setAccountsLoading(false);
        }
    };

    // Handle form changes
    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear the report when configuration changes (except for API keys and account selection)
        const configFields = ['startDate', 'endDate', 'timezone', 'period'];
        if (configFields.includes(field) && report) {
            // Clear the report to force regeneration
            setReport(null);
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        try {
            await generateReport(formData);
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    };

    // Handle export
    const handleExport = async format => {
        try {
            await exportReport(formData, format);
        } catch (error) {
            console.error('Failed to export report:', error);
        }
    };

    // Handle email export
    const handleEmailExport = () => {
        setEmailModalOpen(true);
    };

    // Handle email export submission
    const handleEmailExportSubmit = async email => {
        try {
            await exportReport(formData, 'email', email);
            setEmailModalOpen(false);
        } catch (error) {
            console.error('Failed to export report via email:', error);
        }
    };

    // Reset form when date/timezone changes
    useEffect(() => {
        if (report) {
            setFormData(prev => ({ ...prev }));
        }
    }, [report]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div">
                        Stripe Connect Reporting
                    </Typography>
                </Toolbar>
            </AppBar>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Transaction Reports
                </Typography>

                <ReportForm
                    formData={formData}
                    onFormChange={handleFormChange}
                    onGenerateReport={handleSubmit}
                    loading={loading}
                    timezones={timezones}
                    accounts={accounts}
                    accountsLoading={accountsLoading}
                    onFetchAccounts={handleFetchAccounts}
                />

                {/* Show Export Buttons even when no report exists */}
                <ExportButtons
                    onExportCSV={() => handleExport('csv')}
                    onExportXLS={() => handleExport('xls')}
                    onEmailExport={handleEmailExport}
                    onExportGoogleSheets={() => handleExport('sheets')}
                    loading={exportLoading}
                    hasReport={!!report}
                    hasCredentials={
                        !!formData.apiKey && !!formData.publicKey && !!formData.connectedAccountId
                    }
                />

                {/* Show Generate Report Loading Spinner below export options */}
                {loading && <LoadingSpinner />}
                {error && <ErrorMessage error={error} onClose={() => {}} />}

                {/* Show Report Display only when report exists */}
                {report && (
                    <ReportDisplay
                        report={report}
                        currentPage={report.pagination?.currentPage || 1}
                        itemsPerPage={report.pagination?.itemsPerPage || 10}
                        onPageChange={newPage =>
                            generateReport(formData, newPage, report.pagination?.itemsPerPage || 10)
                        }
                        onItemsPerPageChange={newLimit => generateReport(formData, 1, newLimit)}
                        paginationLoading={paginationLoading}
                    />
                )}

                {/* Email Export Modal */}
                <EmailExportModal
                    open={emailModalOpen}
                    onClose={() => setEmailModalOpen(false)}
                    onExport={handleEmailExportSubmit}
                    loading={exportLoading}
                    reportInfo={{
                        startDate: formData.startDate,
                        endDate: formData.endDate,
                        timezone: formData.timezone,
                        accountCount: formData.connectedAccountId.includes(',')
                            ? formData.connectedAccountId.split(',').length
                            : 1,
                    }}
                />
            </Container>
        </ThemeProvider>
    );
}

export default App;
