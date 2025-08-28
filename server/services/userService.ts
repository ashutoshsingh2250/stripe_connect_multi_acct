import bcrypt from 'bcryptjs';
import { pool } from '../utils/dbconfig';
import { User } from '../types';

export async function createUser(user: User): Promise<User> {
    const hash = await bcrypt.hash(user.passwordHash || '', 10);

    const query = `
    INSERT INTO users (stripe_id, username, email, name, password_hash, raw_data)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (stripe_id)
    DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      raw_data = EXCLUDED.raw_data
    RETURNING id, stripe_id as "stripeId", username, email, name, password_hash as "passwordHash", raw_data as "rawData", created_at as "createdAt", updated_at as "updatedAt";
  `;

    const values = [
        user.stripeId,
        user.username,
        user.email || null,
        user.name || null,
        hash,
        user.rawData || {},
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function findUserByUsername(username: string): Promise<User | null> {
    const query = `SELECT id, stripe_id as "stripeId", username, email, name, password_hash as "passwordHash", raw_data as "rawData", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE username=$1`;
    const res = await pool.query(query, [username]);
    return res.rows[0] || null;
}

export async function validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}
