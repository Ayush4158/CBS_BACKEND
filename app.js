import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import careRoutes from './routes/careRoutes.js';

const app = express();

// FIXED: Browsers block credentials: true when origin is '*'
app.use(cors({
    // origin: "*",
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Wire Up Router Pipelines
app.use('/api/auth', authRoutes);
app.use('/api/care', careRoutes);

// Fallback Route Handler for missing links
app.use((req, res) => {
    res.status(404).json({ error: 'Requested API endpoint resource does not exist.' });
});

export default app;