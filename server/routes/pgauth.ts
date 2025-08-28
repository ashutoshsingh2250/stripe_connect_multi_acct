import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { findUserByUsername, validatePassword } from '../services/userService';


const router = express.Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            res.status(400).json({
                error: 'Bad Request',
                message: 'Username and password are required',
            });
            return;
        }

        const user = await findUserByUsername(username);

        if (!user || !user.passwordHash) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid username or password',
            });
            return;
        }

        const isValid = await validatePassword(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid username or password',
            });
            return;
        }

        const jwtSecret = process.env['JWT_SECRET'] || 'stripe-connect-jwt-secret-2025';
        const isMaster = !user.stripeId; // if no stripeId, treat as master
        const token = jwt.sign(
            {
                id: user.id,
                stripeId: user.stripeId,
                username: user.username,
                isMaster,
                authenticated: true,
                iat: Math.floor(Date.now() / 1000), // explicit issued-at time
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                stripeId: user.stripeId,
                username: user.username,
                email: user.email,
                name: user.name,
                isMaster,
            },
            token,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login failed',
        });
    }
});

export default router;
