const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const unitRoutes = require('./routes/units');
const firearmRoutes = require('./routes/firearms');
const officerRoutes = require('./routes/officers');
const custodyRoutes = require('./routes/custody');
const lifecycleRoutes = require('./routes/lifecycle');
const anomalyRoutes = require('./routes/anomalies');
const auditRoutes = require('./routes/audit');
const forensicRoutes = require('./routes/forensic');
const { scheduleAnomalyDetection, runAnomalyDetectionOnStartup } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SafeArms API is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api';
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/units`, unitRoutes);
app.use(`${apiPrefix}/firearms`, firearmRoutes);
app.use(`${apiPrefix}/officers`, officerRoutes);
app.use(`${apiPrefix}/custody`, custodyRoutes);
app.use(`${apiPrefix}/lifecycle`, lifecycleRoutes);
app.use(`${apiPrefix}/anomalies`, anomalyRoutes);
app.use(`${apiPrefix}/audit`, auditRoutes);
app.use(`${apiPrefix}/forensic`, forensicRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =====================================================
// SERVER STARTUP
// =====================================================

const startServer = async () => {
    try 
        // Start server
        app.listen(PORT, async () => {
            console.log('========================================');
            console.log(`SafeArms Backend Server`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Port: ${PORT}`);
            console.log(`API Base: ${apiPrefix}`);
            console.log('========================================');

            // Initialize scheduled jobs
            scheduleAnomalyDetection();

            // Run anomaly detection on startup (development only)
            await runAnomalyDetectionOnStartup();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    db.pool.end(() => {
        console.log('Database connections closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    db.pool.end(() => {
        console.log('Database connections closed');
        process.exit(0);
    });
});

startServer();

module.exports = app;
