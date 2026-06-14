import jwt from 'jsonwebtoken';
import "dotenv/config";

// 1. Authenticate Token Middleware
export const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    try {
        // Decodes { id: user.id, role: user.role } from the JWT cookie
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; 
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// 2. Role Authorization Middleware (Crucial for guarding Admin/Companion/User tabs)
export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // Ensures authenticateToken ran first and populated req.user
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Unauthorized access. You do not possess the required clearance level.' 
            });
        }
        next();
    };
};

// 3. Request Body Zod Schema Validation Middleware
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        // Safe access: use optional chaining and provide fallback empty array
        const errorDetails = err?.errors?.map(e => ({ 
            field: e.path?.[0] || 'unknown', 
            message: e.message 
        })) || [{ field: 'request', message: err.message || 'Invalid request body' }];

        return res.status(400).json({
            error: "Validation failed",
            details: errorDetails
        });
    }
}; 