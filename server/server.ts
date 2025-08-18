import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import routes
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';
import exportRoutes from './routes/export';

const app = express();
const PORT: string | number = process.env['PORT'] || 5000;

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: false, // No cookies needed with JWT in headers
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/export', exportRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env['NODE_ENV'] === 'development' ? err.message : 'Internal server error',
    });
});

// 404 handler
app.use('*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

const serverInstance = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Stripe Connect Reporting API ready`);
    console.log(`🌍 Environment: ${process.env['NODE_ENV']}`);
});

// Increase server timeouts for long-running requests (e.g., large date ranges)
serverInstance.setTimeout(600000); // 10 minutes for inactive socket timeout
// Ensure headers timeout is greater than request timeout
// @ts-ignore - headersTimeout is a Node.js HTTP server property
serverInstance.headersTimeout = 610000;
// Optional: keep-alive timeout for persistent connections
// @ts-ignore - keepAliveTimeout is a Node.js HTTP server property
serverInstance.keepAliveTimeout = 65000;
