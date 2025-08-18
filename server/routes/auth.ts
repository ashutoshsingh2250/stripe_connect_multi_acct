import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validateJWT } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Simple in-memory user store (in production, use a database)
const users = [
    { username: 'admin', password: 'admin123' },
    { username: 'user', password: 'password' },
];

// Login endpoint
router.post('/login', (req: Request, res: Response): Response => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Username and password are required',
        });
    }

    // Find user
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid username or password',
        });
    }

    // Generate JWT token
    const jwtSecret = process.env['JWT_SECRET'] || 'stripe-connect-jwt-secret-2025';
    const token = jwt.sign(
        {
            username: username,
            authenticated: true,
            iat: Math.floor(Date.now() / 1000),
        },
        jwtSecret,
        { expiresIn: '24h' }
    );

    // Return JWT token in response for client to store and use in Authorization header
    return res.json({
        message: 'Login successful',
        user: { username },
        token: token, // JWT token to be used in Authorization Bearer header
    });
});

// Logout endpoint
router.post('/logout', (_req: Request, res: Response) => {
    // With JWT in Authorization headers, logout is handled client-side by removing the token
    // Server just confirms the logout action
    return res.json({ message: 'Logout successful' });
});

// Check authentication status
router.get('/me', validateJWT, (req: AuthenticatedRequest, res: Response): Response => {
    return res.json({
        authenticated: true,
        user: { username: req.user?.username },
    });
});

export default router;
