"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const user_1 = __importDefault(require("./routes/user"));
const interview_1 = __importDefault(require("./routes/interview"));
const express_2 = require("@clerk/express");
const websocketServer_1 = require("./websocketServer");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        "https://apti-view.vercel.app",
        "https://apti-view-seven.vercel.app", // Your actual Vercel URL
        "https://aptiview.onrender.com", // Your backend URL (for health checks)
        process.env.FRONTEND_URL || "http://localhost:3000"
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// Increase body size limits to handle base64-encoded resumes
app.use(express_1.default.json({ limit: process.env.JSON_BODY_LIMIT || '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '15mb' }));
// Configure Clerk middleware with proper environment variables
app.use((0, express_2.clerkMiddleware)({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
}));
// Legacy: serve static files from uploads directory (kept for backward compatibility)
// New media are uploaded to ImageKit and served via CDN URLs
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check endpoint for ping bots and monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'Aptiview Backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
// Detailed health check with database connectivity test
app.get('/health/detailed', async (req, res) => {
    try {
        // Test database connection
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'connected',
                websocket: 'running',
                server: 'running',
                prisma: 'connected'
            },
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0'
        });
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                database: 'disconnected',
                server: 'running'
            },
            error: 'Database connection failed',
            environment: process.env.NODE_ENV || 'development'
        });
    }
});
// Simple ping endpoint (minimal response for basic uptime monitoring)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});
// Environment check endpoint for debugging deployment issues
app.get('/env-check', (req, res) => {
    const requiredEnvs = {
        'DATABASE_URL': !!process.env.DATABASE_URL,
        'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
        'CLERK_SECRET_KEY': !!process.env.CLERK_SECRET_KEY,
        'CLERK_PUBLISHABLE_KEY': !!process.env.CLERK_PUBLISHABLE_KEY,
        'FRONTEND_URL': !!process.env.FRONTEND_URL,
        'IMAGEKIT_PUBLIC_KEY': !!process.env.IMAGEKIT_PUBLIC_KEY,
        'IMAGEKIT_PRIVATE_KEY': !!process.env.IMAGEKIT_PRIVATE_KEY,
        'IMAGEKIT_URL_ENDPOINT': !!process.env.IMAGEKIT_URL_ENDPOINT
    };
    const missingEnvs = Object.entries(requiredEnvs)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    res.json({
        status: missingEnvs.length === 0 ? 'OK' : 'MISSING_ENV_VARS',
        envStatus: requiredEnvs,
        missingEnvs,
        nodeEnv: process.env.NODE_ENV || 'not_set',
        port: process.env.PORT || 'not_set'
    });
});
app.use('/api/users', user_1.default);
app.use('/api/interviews', interview_1.default);
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Start WebSocket server on the same port as HTTP server
(0, websocketServer_1.setupWebSocketServer)(server);
console.log(`WebSocket server running on port ${PORT}`);
