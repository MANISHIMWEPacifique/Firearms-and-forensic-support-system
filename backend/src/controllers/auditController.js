const db = require('../config/database');

// Get all audit logs with filtering
const getAllAuditLogs = async (req, res) => {
    try {
        const { userId, action, resourceType, startDate, endDate } = req.query;

        let query = `
      SELECT al.*,
             u.username,
             u.full_name as user_name,
             u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (userId) {
            query += ` AND al.user_id = $${paramCount}`;
            params.push(userId);
            paramCount++;
        }

        if (action) {
            query += ` AND al.action ILIKE $${paramCount}`;
            params.push(`%${action}%`);
            paramCount++;
        }

        if (resourceType) {
            query += ` AND al.resource_type = $${paramCount}`;
            params.push(resourceType);
            paramCount++;
        }

        if (startDate) {
            query += ` AND al.timestamp >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            query += ` AND al.timestamp <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }

        query += ' ORDER BY al.timestamp DESC LIMIT 1000';

        const result = await db.query(query, params);

        res.json({
            success: true,
            logs: result.rows
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit logs'
        });
    }
};

// Get audit statistics
const getAuditStatistics = async (req, res) => {
    try {
        // Actions by type
        const actionStats = await db.query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `);

        // Activity by user
        const userActivity = await db.query(`
      SELECT u.username,
             u.full_name,
             u.role,
             COUNT(*) as action_count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.username, u.full_name, u.role
      ORDER BY action_count DESC
      LIMIT 10
    `);

        // Activity by resource type
        const resourceStats = await db.query(`
      SELECT resource_type, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= NOW() - INTERVAL '30 days'
        AND resource_type IS NOT NULL
      GROUP BY resource_type
      ORDER BY count DESC
    `);

        // Activity trend (last 7 days)
        const trend = await db.query(`
      SELECT DATE(timestamp) as date,
             COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);

        // Failed login attempts
        const failedLogins = await db.query(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= NOW() - INTERVAL '24 hours'
    `);

        res.json({
            success: true,
            statistics: {
                actionsByType: actionStats.rows,
                topUsers: userActivity.rows,
                byResourceType: resourceStats.rows,
                weeklyTrend: trend.rows,
                failedLoginsLast24h: failedLogins.rows[0].count
            }
        });

    } catch (error) {
        console.error('Get audit statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit statistics'
        });
    }
};

// Generate compliance report
const generateComplianceReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Total users
        const usersCount = await db.query('SELECT COUNT(*) FROM users WHERE is_active = TRUE');

        // Total firearms
        const firearmsCount = await db.query('SELECT COUNT(*) FROM firearms');

        // Active custody assignments
        const activeCustody = await db.query('SELECT COUNT(*) FROM custody_assignments WHERE is_active = TRUE');

        // Pending lifecycle events
        const pendingEvents = await db.query('SELECT COUNT(*) FROM lifecycle_events WHERE status = $1', ['PENDING']);

        // Detected anomalies
        const detectedAnomalies = await db.query('SELECT COUNT(*) FROM anomalies WHERE status = $1', ['DETECTED']);

        // Firearms by status
        const firearmsByStatus = await db.query(`
      SELECT status, COUNT(*) as count
      FROM firearms
      GROUP BY status
      ORDER BY count DESC
    `);

        // Recent critical actions
        const criticalActions = await db.query(`
      SELECT al.*, u.username, u.full_name
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.action IN ('REGISTER_FIREARM_HQ', 'REPORT_LOSS', 'REQUEST_DESTRUCTION', 'REVIEW_LIFECYCLE_EVENT')
        AND al.timestamp >= $1
        AND al.timestamp <= $2
      ORDER BY al.timestamp DESC
      LIMIT 50
    `, [startDate || '1970-01-01', endDate || '2099-12-31']);

        res.json({
            success: true,
            report: {
                summary: {
                    totalUsers: parseInt(usersCount.rows[0].count),
                    totalFirearms: parseInt(firearmsCount.rows[0].count),
                    activeCustodyAssignments: parseInt(activeCustody.rows[0].count),
                    pendingApprovals: parseInt(pendingEvents.rows[0].count),
                    unreviewed Anomalies: parseInt(detectedAnomalies.rows[0].count)
                },
                firearmsByStatus: firearmsByStatus.rows,
                criticalActions: criticalActions.rows,
                generatedAt: new Date(),
                period: {
                    start: startDate || 'All time',
                    end: endDate || 'Present'
                }
            }
        });

    } catch (error) {
        console.error('Generate compliance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate compliance report'
        });
    }
};

module.exports = {
    getAllAuditLogs,
    getAuditStatistics,
    generateComplianceReport
};
