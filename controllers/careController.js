
import { pool } from "../config/db.js";
import { sendCallbackEmail } from "../utils/emailService.js";

export const requestCallback = async (req, res) => {
    try {
        const { name, email, phone, whoIsThisFor, bestTimeToCall, message } = req.body;

        // Matches table columns: name, email, phone, who_is_this_for, best_time_to_call, message
        const result = await pool.query(
            `INSERT INTO callback_requests (name, email, phone, who_is_this_for, best_time_to_call, message)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, email, phone, whoIsThisFor, bestTimeToCall, message]
        );

        await sendCallbackEmail({ name, email, phone, whoIsThisFor, bestTimeToCall, message });

        res.status(201).json({ message: 'Callback tracked and email sent!', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process lead.' });
    }
};