const db = require('../config/database');

// Get all audit logs with filtering


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
                    unreviewedAnomalies: parseInt(detectedAnomalies.rows[0].count)
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
