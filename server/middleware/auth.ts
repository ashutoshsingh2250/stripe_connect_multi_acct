import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

import { decryptApiKey, decryptPublicKey } from '../utils/encryption';

// Session-based authentication middleware (for authenticated users)
const validateSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check if user has a valid session with Stripe keys
        if (!req.session || !req.session.stripeSecretKey || !req.session.stripePublicKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No valid session found. Please authenticate first.',
            });
            return;
        }

        // Set user data from session
        req.user = {
            connectedAccountId: req.session.connectedAccountId || '',
            secretKey: req.session.stripeSecretKey,
            publicKey: req.session.stripePublicKey,
        };

        next();
    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to validate session',
        });
    }
};

// Initial authentication middleware (only for /accounts endpoint)
const validateApiKeyOnly = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const publicKey: string | undefined = req.headers['x-public-key'] as string;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid Authorization header',
            });
            return;
        }

        if (!publicKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing x-public-key header',
            });
            return;
        }

        // Decrypt the keys from frontend
        const encryptedSecretKey = authHeader.substring(7);
        const encryptedPublicKey = publicKey;

        const decryptedSecretKey = decryptApiKey(encryptedSecretKey);
        const decryptedPublicKey = decryptPublicKey(encryptedPublicKey);

        if (!decryptedSecretKey || !decryptedPublicKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Failed to decrypt API keys',
            });
            return;
        }

        // Validate that the decrypted keys match the server's expected keys
        const expectedSecretKey = process.env['STRIPE_SECRET_KEY'];
        const expectedPublicKey = process.env['STRIPE_PUBLISHABLE_KEY'];

        if (!expectedSecretKey || !expectedPublicKey) {
            res.status(500).json({
                error: 'Server Configuration Error',
                message: 'Stripe keys not configured on server',
            });
            return;
        }

        if (decryptedSecretKey !== expectedSecretKey || decryptedPublicKey !== expectedPublicKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API credentials',
            });
            return;
        }

        // Store the validated keys in session for future use
        if (req.session) {
            req.session.stripeSecretKey = expectedSecretKey;
            req.session.stripePublicKey = expectedPublicKey;
            req.session.authenticated = true;
        }

        // Use server's keys from .env for all Stripe API calls
        req.user = {
            connectedAccountId: '', // Empty for accounts endpoint
            secretKey: expectedSecretKey,
            publicKey: expectedPublicKey,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to validate credentials',
        });
    }
};

export { validateApiKeyOnly, validateSession };
