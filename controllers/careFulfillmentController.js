import { pool } from '../config/db.js';

// GET: Fetch clean view roster assigned strictly to the logged-in companion
export const getMyAssignedRoster = async (req, res) => {
    try {
        // FIXED: Checks client account status from user authentication master tracking row
        const query = `
            SELECT u.id AS client_id, u.name AS client_name, u.phone AS client_phone, 
                   c.member_name, c.service_start_date, c.service_end_date
            FROM users u
            JOIN care_details c ON u.id = c.user_id
            WHERE c.assigned_companion_id = $1 AND u.account_status = 'IN_PROGRESS';
        `;
        const result = await pool.query(query, [req.user.id]); 
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Portfolio tracking mapping exception:', error);
        return res.status(500).json({ error: 'Failed to access companion portfolio roster.' });
    }
};

// POST: Companion creates a main "Bucket" and inserts nested checklist items
export const createBucketTask = async (req, res) => {
    const client = await pool.connect();
    try {
        const companionId = req.user.id; 
        const { clientId, bucketTitle, bucketDescription, items } = req.body; 

        if (!clientId || !bucketTitle || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Missing bucket or checklist data.' });
        }

        await client.query('BEGIN');

        const bucketQuery = `
            INSERT INTO tasks (client_id, companion_id, task_type, task_title, task_description, status)
            VALUES ($1, $2, 'BUCKET', $3, $4, 'PENDING_VERIFICATION')
            RETURNING id;
        `;
        const bucketResult = await client.query(bucketQuery, [clientId, companionId, bucketTitle, bucketDescription]);
        const newBucketId = bucketResult.rows[0].id;

        const itemQuery = `
            INSERT INTO task_items (task_id, item_title, scheduled_time, status, is_completed)
            VALUES ($1, $2, $3, 'PENDING', FALSE);
        `;
        for (const item of items) {
            await client.query(itemQuery, [newBucketId, item.item_title, item.scheduled_time]);
        }

        await client.query('COMMIT');
        return res.status(201).json({ message: 'Task Bucket and checklist successfully created!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating task bucket:', error);
        return res.status(500).json({ error: 'Failed to create task bucket.' });
    } finally {
        client.release();
    }
};

// PUT: Companion checks off an individual sub-task item inside a bucket
export const toggleTaskItemComplete = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { isCompleted } = req.body; 
        const companionId = req.user.id;

        const verifyQuery = `
            SELECT ti.id FROM task_items ti
            JOIN tasks t ON ti.task_id = t.id
            WHERE ti.id = $1 AND t.companion_id = $2;
        `;
        const verifyRes = await pool.query(verifyQuery, [itemId, companionId]);
        if (verifyRes.rowCount === 0) {
            return res.status(403).json({ error: 'Unauthorized. You do not manage this task item.' });
        }

        const statusText = isCompleted ? 'COMPLETED' : 'PENDING';
        const completedAtValue = isCompleted ? new Date() : null;

        const updateQuery = `
            UPDATE task_items 
            SET is_completed = $1, status = $2, completed_at = $3
            WHERE id = $4;
        `;
        await pool.query(updateQuery, [isCompleted, statusText, completedAtValue, itemId]);

        return res.status(200).json({ message: `Sub-task marked as ${statusText.toLowerCase()}.` });
    } catch (error) {
        console.error('Toggle task item error:', error);
        return res.status(500).json({ error: 'Failed to update item progress status.' });
    }
};

// GET: Pull companion details alongside all bucket hierarchies and their child items
export const getFamilyDashboardFeed = async (req, res) => {
    try {
        const clientId = req.user.id;

        const companionQuery = `
            SELECT u.name, u.email FROM users u
            JOIN care_details c ON u.id = c.assigned_companion_id
            WHERE c.user_id = $1;
        `;
        const companionRes = await pool.query(companionQuery, [clientId]);

        const historyQuery = `
            SELECT id, task_type, task_title, task_description, status, logged_at, verified_at
            FROM tasks WHERE client_id = $1 ORDER BY logged_at DESC;
        `;
        const historyRes = await pool.query(historyQuery, [clientId]);
        const buckets = historyRes.rows;

        for (let bucket of buckets) {
            const itemsQuery = `
                SELECT id, item_title, scheduled_time, status, is_completed, completed_at
                FROM task_items 
                WHERE task_id = $1 
                ORDER BY scheduled_time ASC;
            `;
            const itemsRes = await pool.query(itemsQuery, [bucket.id]);
            bucket.checklistItems = itemsRes.rows;
        }

        return res.status(200).json({
            companion: companionRes.rows[0] || null,
            careFeedLogs: buckets
        });
    } catch (error) {
        console.error('Family feed fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch tracking details.' });
    }
};

// PUT: Family signs off on an entire main Bucket task
export const verifyLoggedAction = async (req, res) => {
    try {
        const { taskId } = req.params;
        const clientId = req.user.id; 

        const updateQuery = `
            UPDATE tasks 
            SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND client_id = $2
            RETURNING id;
        `;
        const result = await pool.query(updateQuery, [taskId, clientId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Record profile not found or unauthorized signature access.' });
        }

        return res.status(200).json({ message: 'Activity verified. Thank you for maintaining transparency.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Verification confirmation error.' });
    }
};

// A. GET: Shared Feed (Used by Family & Companion)
export const getSharedBuckets = async (req, res) => {
    const { clientId } = req.params;
    try {
        const query = `
            SELECT 
                t.id AS bucket_id, 
                t.task_title AS bucket_title, 
                ti.id AS item_id, 
                ti.item_title, 
                ti.scheduled_time, 
                ti.is_completed,
                ti.status AS item_status
            FROM tasks t
            LEFT JOIN task_items ti ON t.id = ti.task_id
            WHERE t.client_id = $1
            ORDER BY t.logged_at DESC, ti.scheduled_time ASC;
        `;
        const result = await pool.query(query, [clientId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Failed to fetch care feed" });
    }
};

// B. POST: Add Items to Existing Bucket
export const addItemsToBucket = async (req, res) => {
    const { bucketId } = req.params; // This is the ID of the task (the bucket)
    const { item_title, scheduled_time } = req.body;
    
    try {
        // Corrected Table: task_items
        // Corrected Column: task_id (instead of bucket_id)
        const result = await pool.query(
            'INSERT INTO task_items (task_id, item_title, scheduled_time) VALUES ($1, $2, $3) RETURNING *',
            [bucketId, item_title, scheduled_time]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Insert Error:", err); // Log this to see the real DB error
        res.status(500).json({ error: "Failed to add task to database" });
    }
};
// C. GET: Companion's assigned clients
export const getMyClients = async (req, res) => {
    const companionId = req.user.id; 
    
    // Direct query on care_details is now enough!
    const query = `
        SELECT u.id, u.name, u.email 
        FROM users u
        JOIN care_details cd ON u.id = cd.user_id
        WHERE cd.assigned_companion_id = $1;
    `;
    
    const result = await pool.query(query, [companionId]);
    res.status(200).json(result.rows);
};