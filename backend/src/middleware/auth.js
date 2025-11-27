const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Get user from database to ensure they're still active
            const result = await db.query(
                'SELECT id, username, full_name, role, unit_id, unit_confirmed, is_active FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length === 0 || !result.rows[0].is_active) {
                return res.status(403).json({
                    success: false,
                    message: 'User account is inactive'
                });
            }

            // Attach user to request
            req.user = result.rows[0];
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions for this operation'
            });
        }

        next();
    };
};

// Check if Station Commander has confirmed their unit
const requireUnitConfirmation = (req, res, next) => {
    if (req.user.role === 'STATION_COMMANDER' && !req.user.unit_confirmed) {
        return res.status(403).json({
            success: false,
            message: 'Please confirm your assigned unit before accessing this resource',
            requiresUnitConfirmation: true
        });
    }
    next();
};

// Audit logging middleware
const auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function
        res.send = function (data) {
            // Log the action
            if (req.user) {
                db.query(
                    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        req.user.id,
                        action,
                        resourceType,
                        req.params.id || null,
                        JSON.stringify({
                            method: req.method,
                            path: req.path,
                            body: req.body
                        }),
                        req.ip,
                        req.get('user-agent')
                    ]
                ).catch(err => console.error('Audit log error:', err));
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    requireUnitConfirmation,
    auditLog
};
