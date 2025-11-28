const db = require('../config/database');
const { detectAnomalies } = require('../ml/anomalyDetection');

// Trigger anomaly detection manually
const runAnomalyDetection = async (req, res) => {
    try {
        const result = await detectAnomalies();

        res.json({
            success: true,
            message: 'Anomaly detection completed',
            detected: result.detected,
            anomalies: result.anomalies
        });

    } catch (error) {
        console.error('Run anomaly detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to run anomaly detection'
        });
    }
};

// Get all anomalies with filtering
const getAllAnomalies = async (req, res) => {
    try {
        const { status, type, firearmId, officerId, minScore } = req.query;

        let query = `
      SELECT a.*,
             f.serial_number,
             f.manufacturer,
             f.model,
             o.badge_number,
             o.full_name as officer_name,
             r.full_name as reviewed_by_name
      FROM anomalies a
      LEFT JOIN firearms f ON a.firearm_id = f.id
      LEFT JOIN officers o ON a.officer_id = o.id
      LEFT JOIN users r ON a.reviewed_by = r.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND a.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (type) {
            query += ` AND a.anomaly_type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        if (firearmId) {
            query += ` AND a.firearm_id = $${paramCount}`;
            params.push(firearmId);
            paramCount++;
        }

        if (officerId) {
            query += ` AND a.officer_id = $${paramCount}`;
            params.push(officerId);
            paramCount++;
        }

        if (minScore) {
            query += ` AND a.anomaly_score >= $${paramCount}`;
            params.push(minScore);
            paramCount++;
        }

        query += ' ORDER BY a.anomaly_score DESC, a.detected_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            anomalies: result.rows
        });

    } catch (error) {
        console.error('Get anomalies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve anomalies'
        });
    }
};

// Get single anomaly details
const getAnomalyById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT a.*,
              f.serial_number,
              f.manufacturer,
              f.model,
              f.assigned_unit_id,
              u.name as unit_name,
              o.badge_number,
              o.full_name as officer_name,
              o.rank,
              r.full_name as reviewed_by_name
       FROM anomalies a
       LEFT JOIN firearms f ON a.firearm_id = f.id
       LEFT JOIN units u ON f.assigned_unit_id = u.id
       LEFT JOIN officers o ON a.officer_id = o.id
       LEFT JOIN users r ON a.reviewed_by = r.id
       WHERE a.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anomaly not found'
            });
        }

        res.json({
            success: true,
            anomaly: result.rows[0]
        });

    } catch (error) {
        console.error('Get anomaly error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve anomaly'
        });
    }
};

// Review anomaly (mark as reviewed, resolved, or false positive)
const reviewAnomaly = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;

        const result = await db.query(
            `UPDATE anomalies 
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           resolution_notes = $3
       WHERE id = $4
       RETURNING *`,
            [status, req.user.id, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Anomaly not found'
            });
        }

        res.json({
            success: true,
            message: 'Anomaly reviewed successfully',
            anomaly: result.rows[0]
        });

    } catch (error) {
        console.error('Review anomaly error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review anomaly'
        });
    }
};

// Get anomaly statistics
const getAnomalyStatistics = async (req, res) => {
    try {
        // Total anomalies by status
        const statusStats = await db.query(`
      SELECT status, COUNT(*) as count
      FROM anomalies
      GROUP BY status
    `);

        // Anomalies by type
        const typeStats = await db.query(`
      SELECT anomaly_type, COUNT(*) as count, AVG(anomaly_score) as avg_score
      FROM anomalies
      WHERE status = 'DETECTED'
      GROUP BY anomaly_type
      ORDER BY count DESC
    `);

        // Recent high-priority anomalies (score > 70)
        const highPriority = await db.query(`
      SELECT a.*,
             f.serial_number,
             o.badge_number
      FROM anomalies a
      LEFT JOIN firearms f ON a.firearm_id = f.id
      LEFT JOIN officers o ON a.officer_id = o.id
      WHERE a.status = 'DETECTED'
        AND a.anomaly_score > 70
      ORDER BY a.anomaly_score DESC, a.detected_at DESC
      LIMIT 10
    `);

        // Trend over last 30 days
        const trend = await db.query(`
      SELECT DATE(detected_at) as date, COUNT(*) as count
      FROM anomalies
      WHERE detected_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(detected_at)
      ORDER BY date ASC
    `);

        res.json({
            success: true,
            statistics: {
                byStatus: statusStats.rows,
                byType: typeStats.rows,
                highPriority: highPriority.rows,
                trend: trend.rows
            }
        });

    } catch (error) {
        console.error('Get anomaly statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve anomaly statistics'
        });
    }
};

module.exports = {
    runAnomalyDetection,
    getAllAnomalies,
    getAnomalyById,
    reviewAnomaly,
    getAnomalyStatistics
};
