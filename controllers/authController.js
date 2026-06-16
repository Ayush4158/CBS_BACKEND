import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import "dotenv/config";
import { sendResetPasswordEmail } from '../utils/emailService.js';

export const register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, email, phone, whoIsCareFor, memberName, password, role } = req.body;

        // Email Availability Check
        const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        await client.query('BEGIN');

        // Admin decides the role, and the status is automatically APPROVED 
        // since an admin is creating the account.
        const userResult = await client.query(
            `INSERT INTO users (name, email, phone, password_hash, role, account_status) 
             VALUES ($1, $2, $3, $4, $5, 'PENDING') RETURNING id, name, email, role`,
            [name, email, phone, passwordHash, role || 'user']
        );
        const userId = userResult.rows[0].id;

        if (role === 'user') {
            await client.query(
                `INSERT INTO care_details (user_id, who_is_care_for, member_name, agree_to_share) 
                 VALUES ($1, $2, $3, $4)`,
                [userId, whoIsCareFor, memberName, true]
            );
        }

        await client.query('COMMIT');
        return res.status(201).json({ message: 'User created successfully.', user: userResult.rows[0] });
        
    } catch (error) {
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        console.log(email,password)
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        console.log(user)

        // Guard rule preventing access if the account profile has been archived
        if (user.account_status === 'SOFT_DELETED') {
            return res.status(403).json({ error: 'Access denied. This profile asset has been securely deactivated.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        console.log(password,isMatch)
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        // FIXED: Included user role value in JSON mapping configuration data feedback array
        return res.status(200).json({ 
            message: 'Login successful', 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(200).json({ message: 'If that email exists in our system, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); 

        await pool.query(
            `UPDATE users 
             SET reset_password_token = $1, reset_password_expires = $2 
             WHERE email = $3`,
            [resetToken, tokenExpiry, email]
        );

        await sendResetPasswordEmail(email, resetToken);
        return res.status(200).json({ message: 'If that email exists in our system, a reset link has been sent.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error processing password reset.' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await pool.query(
            `SELECT id FROM users 
             WHERE reset_password_token = $1 AND reset_password_expires > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        const userId = result.rows[0].id;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE users 
             SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
             WHERE id = $2`,
            [hashedPassword, userId]
        );

        return res.status(200).json({ message: 'Password has been updated successfully! You can now log in.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error executing password save.' });
    }
};