import React, { useState, useEffect } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Components
import StripeKeysForm from './components/auth/StripeKeysForm';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import LoadingSpinner from './components/common/LoadingSpinner';

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
    // App state
    const [currentStep, setCurrentStep] = useState('stripe-keys'); // 'stripe-keys', 'login', 'dashboard'
    const [stripeKeys, setStripeKeys] = useState(null);
    const [user, setUser] = useState(null);
    const [isCheckingSetup, setIsCheckingSetup] = useState(true);

    // Check if user has already completed setup
    useEffect(() => {
        const checkSetupStatus = () => {
            const storedPublicKey = localStorage.getItem('stripePublicKey');
            const storedSecretKey = localStorage.getItem('stripeSecretKey');
            const authToken = localStorage.getItem('authToken');

            if (storedPublicKey && storedSecretKey && authToken) {
                // User has completed setup, check if token is still valid
                setStripeKeys({ publicKey: storedPublicKey, secretKey: storedSecretKey });
                setCurrentStep('login');
            } else if (storedPublicKey && storedSecretKey) {
                // User has keys but no auth token
                setStripeKeys({ publicKey: storedPublicKey, secretKey: storedSecretKey });
                setCurrentStep('login');
            } else {
                // User needs to start from beginning
                setCurrentStep('stripe-keys');
            }
            setIsCheckingSetup(false);
        };

        checkSetupStatus();
    }, []);

    // Handle Stripe keys validation success
    const handleKeysValidated = (publicKey, secretKey) => {
        setStripeKeys({ publicKey, secretKey });
        setCurrentStep('login');
    };

    // Handle login success
    const handleLoginSuccess = userData => {
        setUser(userData);
        setCurrentStep('dashboard');
    };

    // Handle logout
    const handleLogout = () => {
        setUser(null);
        setStripeKeys(null);
        setCurrentStep('stripe-keys');
    };

    // Show loading spinner while checking setup status
    if (isCheckingSetup) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Container maxWidth="sm" sx={{ mt: 8 }}>
                    <LoadingSpinner />
                </Container>
            </ThemeProvider>
        );
    }

    // Render appropriate component based on current step
    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'stripe-keys':
                return <StripeKeysForm onKeysValidated={handleKeysValidated} />;

            case 'login':
                return <LoginForm onLoginSuccess={handleLoginSuccess} stripeKeys={stripeKeys} />;

            case 'dashboard':
                return <Dashboard user={user} onLogout={handleLogout} />;

            default:
                return <StripeKeysForm onKeysValidated={handleKeysValidated} />;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {renderCurrentStep()}
        </ThemeProvider>
    );
}

export default App;
