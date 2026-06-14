import nodemailer from "nodemailer";
import 'dotenv/config';

export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10), // OPTIMIZATION: Always parse port strings into numbers for SMTP clients
    secure: process.env.EMAIL_PORT == 465, // OPTIMIZATION: Automatically handles SSL vs STARTTLS based on port config
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendCallbackEmail = async (data) => {
    const adminRecipient = process.env.TO_EMAIL || 'admin@compassioncare.com'; // OPTIMIZATION: Core fallback address guard
    
    const mailOptions = {
        from: '"Compassion Care Intake" <noreply@compassioncare.com>', 
        to: adminRecipient,
        subject: '🔔 New Callback Request Received',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e1e4e8; border-radius: 8px;">
                <h2 style="color: #0052cc; margin-top: 0;">New Lead: "Let's Talk" Request</h2>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p><b>Prospect Name:</b> ${data.name}</p>
                <p><b>Email Address:</b> <a href="mailto:${data.email}">${data.email}</a></p>
                <p><b>Phone Number:</b> ${data.phone}</p>
                <p><b>Who is this for:</b> ${data.whoIsThisFor}</p>
                <p><b>Best Time To Call:</b> ${data.bestTimeToCall}</p>
                ${data.message ? `<p><b>Message/Notes:</b></p><blockquote style="background: #f4f5f7; padding: 10px 15px; border-left: 4px solid #0052cc; margin: 10px 0;">${data.message}</blockquote>` : ''}
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #777; margin-bottom: 0;">This inquiry has been logged securely to your admin dashboard database table.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

export const sendResetPasswordEmail = async (email, token) => {
    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'; // OPTIMIZATION: Default to Vite port
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${token}`;
    
    const mailOptions = {
        from: '"Compassion Care Security" <security@compassioncare.com>', 
        to: email, 
        subject: '🔒 Urgent: Account Password Reset Window',
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e1e4e8; border-radius: 8px;">
                <h2 style="color: #de350b; margin-top: 0;">Password Reset Request</h2>
                <p>We received an optimization command requesting a credential update for this portal login profile.</p>
                <p>If you did not initiate this strategy update, please ignore this notification—your data assets remain secure.</p>
                <div style="margin: 25px 0;">
                    <a href="${resetUrl}" style="background: #de350b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;"> Reset My Account Password</a>
                </div>
                <p style="font-size: 13px; color: #555;">Or copy and paste this authorization URL directly into your secure browser link field:</p>
                <p style="font-size: 13px; background: #f4f5f7; padding: 10px; border-radius: 4px; word-break: break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p style="font-size: 11px; color: #999; margin-bottom: 0;">Security Constraint: This validation token signature will decay and automatically expire in 60 minutes.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};