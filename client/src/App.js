import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    CssBaseline,
    ThemeProvider,
    createTheme,
    AppBar,
    Toolbar,
    Button,
    Box,
} from '@mui/material';
import { format } from 'date-fns';

// Custom hooks
import { useTimezones } from './hooks/useTimezones';
import { useReport } from './hooks/useReport';

// API service
import { apiService, logout, checkAuthStatus } from './services/api';

// Encryption utilities
import { encryptSecretKey, encryptPublicKey } from './utils/encryption';

// Components
import LoginForm from './components/auth/LoginForm';
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
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        connectedAccountId: '',
        secretKey: '',
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

    // Check authentication status on app load
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // First check if token exists in localStorage
                const token = localStorage.getItem('authToken');
                if (!token) {
                    setIsAuthenticated(false);
                    setUser(null);
                    return;
                }

                // Validate token with server
                const response = await checkAuthStatus();
                if (response.data.authenticated) {
                    setIsAuthenticated(true);
                    setUser(response.data.user);
                } else {
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                // Token is invalid or expired, or server error
                console.log('Authentication failed:', error.message);
                setIsAuthenticated(false);
                setUser(null);
                localStorage.removeItem('authToken'); // Clear invalid token
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Handle login success
    const handleLoginSuccess = userData => {
        setIsAuthenticated(true);
        setUser(userData);
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always update state regardless of server response
            setIsAuthenticated(false);
            setUser(null);
            setAccounts([]);
            setReport(null);
        }
    };

    // Fetch accounts function
    const handleFetchAccounts = async () => {
        try {
            setAccountsLoading(true);
            const headers = {
                'x-secret-key': encryptSecretKey(formData.secretKey),
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

    // Show loading spinner while checking authentication
    if (authLoading) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Container maxWidth="sm" sx={{ mt: 8 }}>
                    <LoadingSpinner />
                </Container>
            </ThemeProvider>
        );
    }

    // Show login form if not authenticated
    if (!isAuthenticated) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <LoginForm onLoginSuccess={handleLoginSuccess} />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Stripe Connect Reporting
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2">Welcome, {user?.username}</Typography>
                        <Button color="inherit" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Box>
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
                    onExportPDF={() => handleExport('pdf')}
                    onEmailExport={handleEmailExport}
                    onExportGoogleSheets={() => handleExport('sheets')}
                    loading={exportLoading}
                    hasReport={!!report}
                    hasCredentials={
                        !!formData.secretKey &&
                        !!formData.publicKey &&
                        !!formData.connectedAccountId
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
