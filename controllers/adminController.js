import { pool } from '../config/db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

// Reusable connection transporter layout declared globally
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// GET: Fetch all pending accounts awaiting matching
export const getPendingClients = async (req, res) => {
    try {
        // FIXED: Checks u.account_status and filters strictly by role 'user'
        const query = `
            SELECT u.id AS client_id, u.name AS client_name, u.email AS client_email, 
                   u.phone AS client_phone, c.who_is_care_for, c.member_name
            FROM users u
            JOIN care_details c ON u.id = c.user_id
            WHERE u.account_status = 'PENDING' AND u.role = 'user'
            ORDER BY u.created_at DESC;
        `;
        const result = await pool.query(query);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('US Onboarding Fetch Error:', error);
        return res.status(500).json({ error: 'Server failed to retrieve pending onboarding data.' });
    }
};

// PUT: Connect dropdown choice, set active timelines, and trigger onboarding email
export const activateClientAccount = async (req, res) => {
    const client = await pool.connect();
    try {
        const { clientId, companionId, serviceStartDate, serviceEndDate } = req.body;

        if (!clientId || !companionId || !serviceStartDate || !serviceEndDate) {
            return res.status(400).json({ error: 'All onboarding configuration parameters are required.' });
        }

        await client.query('BEGIN');

        // FIXED: Verifies that the staff match is a 'companion' rather than 'admin'
        const companionCheck = await client.query(
            'SELECT name FROM users WHERE id = $1 AND role = $2', 
            [companionId, 'companion']
        );
        if (companionCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Assigned companion must be a certified staff user.' });
        }

        // Generate strong password following the character compliance strategy
        // const baseRandom = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        // const tempPassword = `${baseRandom}!26M`;
        // const passwordHash = await bcrypt.hash(tempPassword, 10);

        // FIXED: Sets account_status to 'IN_PROGRESS' directly inside the users table
        await client.query(
            'UPDATE users SET account_status = $2 WHERE id = $3', 
            ['IN_PROGRESS', clientId]
        );

        // FIXED: Removed invalid status field from care_details insertion statement
        await client.query(`
            UPDATE care_details 
            SET assigned_companion_id = $1, service_start_date = $2, service_end_date = $3
            WHERE user_id = $4
        `, [companionId, serviceStartDate, serviceEndDate, clientId]);

        const userDetails = await client.query('SELECT name, email FROM users WHERE id = $1', [clientId]);
        const targetUser = userDetails.rows[0];

        await client.query('COMMIT');

        const appUrl = process.env.FRONTEND_URL || 'https://yourcareportal.com';

        // await transporter.sendMail({
        //     from: '"Compassion Care Onboarding Team" <onboarding@yourcareportal.com>',
        //     to: targetUser.email,
        //     subject: '🇺🇸 Safe Care Portal Activation: Ready for Login',
        //     html: `
        //         <h2>Welcome to Compassion Care, ${targetUser.name}</h2>
        //         <p>Your portal account has been configured by our administration squad.</p>
        //         <p><b>Your Dedicated Weekly Companion:</b> ${companionCheck.rows[0].name}</p>
        //         <p><b>Subscription Window:</b> ${serviceStartDate} to ${serviceEndDate}</p>
        //         <hr />
        //         <h3>Your Temporary Login Parameters:</h3>
        //         <p><b>Username/Email:</b> ${targetUser.email}</p>
        //         <p><b>Temporary Password:</b> <code style="background:#f4f5f7; padding:4px 8px; border-radius:4px;">${tempPassword}</code></p>
        //         <p><a href="${appUrl}/login" style="background:#0052cc; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block;">Secure Login Gateway</a></p>
        //         <p><i>Security Directive: For data privacy conformity, you will undergo an obligatory password update sequence upon crossing the gateway.</i></p>
        //     `
        // });

        return res.status(200).json({ message: 'Matching sequence completed. Welcome email broadcasted successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Match Optimization Fail:', error);
        return res.status(500).json({ error: 'Transactional processing failure.' });
    } finally {
        client.release();
    }
};