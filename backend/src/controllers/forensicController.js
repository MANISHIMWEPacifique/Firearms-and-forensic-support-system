const db = require('../config/database');

// Advanced forensic search across all firearms
const forensicSearch = async (req, res) => {
    try {
        const {
            serialNumber,
            manufacturer,
            model,
            caliber,
            status,
            unitId,
            riflingPattern,
            firingPinShape,
            dateFrom,
            dateTo
        } = req.query;

        let query = `
      SELECT DISTINCT f.*,
             u.name as unit_name,
             bp.rifling_pattern,
             bp.firing_pin_shape,
             bp.test_fired_date,
             bp.analyst_name,
             (SELECT COUNT(*) FROM custody_logs WHERE firearm_id = f.id) as custody_events_count,
             (SELECT COUNT(*) FROM lifecycle_events WHERE firearm_id = f.id) as lifecycle_events_count
      FROM firearms f
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      LEFT JOIN ballistic_profiles bp ON f.id = bp.firearm_id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (serialNumber) {
            query += ` AND f.serial_number ILIKE $${paramCount}`;
            params.push(`%${serialNumber}%`);
            paramCount++;
        }

        if (manufacturer) {
            query += ` AND f.manufacturer ILIKE $${paramCount}`;
            params.push(`%${manufacturer}%`);
            paramCount++;
        }

        if (model) {
            query += ` AND f.model ILIKE $${paramCount}`;
            params.push(`%${model}%`);
            paramCount++;
        }

        if (caliber) {
            query += ` AND f.caliber ILIKE $${paramCount}`;
            params.push(`%${caliber}%`);
            paramCount++;
        }

        if (status) {
            query += ` AND f.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (unitId) {
            query += ` AND f.assigned_unit_id = $${paramCount}`;
            params.push(unitId);
            paramCount++;
        }

        if (riflingPattern) {
            query += ` AND bp.rifling_pattern ILIKE $${paramCount}`;
            params.push(`%${riflingPattern}%`);
            paramCount++;
        }

        if (firingPinShape) {
            query += ` AND bp.firing_pin_shape ILIKE $${paramCount}`;
            params.push(`%${firingPinShape}%`);
            paramCount++;
        }

        if (dateFrom) {
            query += ` AND f.created_at >= $${paramCount}`;
            params.push(dateFrom);
            paramCount++;
        }

        if (dateTo) {
            query += ` AND f.created_at <= $${paramCount}`;
            params.push(dateTo);
            paramCount++;
        }

        query += ' ORDER BY f.created_at DESC LIMIT 100';

        const result = await db.query(query, params);

        res.json({
            success: true,
            results: result.rows
        });

    } catch (error) {
        console.error('Forensic search error:', error);
        res.status(500).json({
            success: false,
            message: 'Forensic search failed'
        });
    }
};

// Get cross-unit custody timeline for investigation
const getCrossUnitTimeline = async (req, res) => {
    try {
        const { firearmId, officerId, startDate, endDate } = req.query;

        let query = `
      SELECT cl.*,
             f.serial_number,
             f.manufacturer,
             f.model,
             o.badge_number,
             o.full_name as officer_name,
             o.rank,
             u_officer.name as officer_unit_name,
             u_firearm.name as firearm_unit_name,
             performer.username as performed_by_username,
             performer.full_name as performed_by_name
      FROM custody_logs cl
      LEFT JOIN firearms f ON cl.firearm_id = f.id
      LEFT JOIN officers o ON cl.officer_id = o.id
      LEFT JOIN units u_officer ON o.unit_id = u_officer.id
      LEFT JOIN units u_firearm ON f.assigned_unit_id = u_firearm.id
      LEFT JOIN users performer ON cl.performed_by = performer.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (firearmId) {
            query += ` AND cl.firearm_id = $${paramCount}`;
            params.push(firearmId);
            paramCount++;
        }

        if (officerId) {
            query += ` AND cl.officer_id = $${paramCount}`;
            params.push(officerId);
            paramCount++;
        }

        if (startDate) {
            query += ` AND cl.timestamp >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }

        if (endDate) {
            query += ` AND cl.timestamp <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }

        query += ' ORDER BY cl.timestamp ASC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            timeline: result.rows
        });

    } catch (error) {
        console.error('Get cross-unit timeline error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve timeline'
        });
    }
};

// Get investigation summary for a firearm
const getInvestigationSummary = async (req, res) => {
    try {
        const { firearmId } = req.params;

        // Get firearm details with ballistic profile
        const firearmResult = await db.query(`
      SELECT f.*,
             u.name as unit_name,
             bp.rifling_pattern,
             bp.twist_rate,
             bp.firing_pin_shape,
             bp.analyst_name,
             bp.test_fired_date
      FROM firearms f
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      LEFT JOIN ballistic_profiles bp ON f.id = bp.firearm_id
      WHERE f.id = $1
    `, [firearmId]);

        if (firearmResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        // Get custody summary
        const custodySummary = await db.query(`
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(DISTINCT officer_id) as unique_officers,
        MIN(start_date) as first_assignment,
        MAX(CASE WHEN is_active = TRUE THEN officer_id END) as current_officer_id
      FROM custody_assignments
      WHERE firearm_id = $1
    `, [firearmId]);

        // Get current officer details if assigned
        let currentOfficer = null;
        if (custodySummary.rows[0].current_officer_id) {
            const officerResult = await db.query(`
        SELECT o.*, u.name as unit_name
        FROM officers o
        LEFT JOIN units u ON o.unit_id = u.id
        WHERE o.id = $1
      `, [custodySummary.rows[0].current_officer_id]);
            currentOfficer = officerResult.rows[0];
        }

        // Get lifecycle events
        const lifecycleEvents = await db.query(`
      SELECT le.*,
             req.full_name as requested_by_name,
             app.full_name as approved_by_name
      FROM lifecycle_events le
      LEFT JOIN users req ON le.requested_by = req.id
      LEFT JOIN users app ON le.approved_by = app.id
      WHERE le.firearm_id = $1
      ORDER BY le.requested_at DESC
    `, [firearmId]);

        // Get anomalies
        const anomalies = await db.query(`
      SELECT a.*,
             o.badge_number,
             o.full_name as officer_name
      FROM anomalies a
      LEFT JOIN officers o ON a.officer_id = o.id
      WHERE a.firearm_id = $1
      ORDER BY a.anomaly_score DESC, a.detected_at DESC
    `, [firearmId]);

        // Get recent custody timeline (last 10 events)
        const recentTimeline = await db.query(`
      SELECT cl.*,
             o.badge_number,
             o.full_name as officer_name,
             u.full_name as performed_by_name
      FROM custody_logs cl
      LEFT JOIN officers o ON cl.officer_id = o.id
      LEFT JOIN users u ON cl.performed_by = u.id
      WHERE cl.firearm_id = $1
      ORDER BY cl.timestamp DESC
      LIMIT 10
    `, [firearmId]);

        res.json({
            success: true,
            summary: {
                firearm: firearmResult.rows[0],
                custodySummary: {
                    ...custodySummary.rows[0],
                    currentOfficer: currentOfficer
                },
                lifecycleEvents: lifecycleEvents.rows,
                anomalies: anomalies.rows,
                recentTimeline: recentTimeline.rows
            }
        });

    } catch (error) {
        console.error('Get investigation summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve investigation summary'
        });
    }
};

module.exports = {
    forensicSearch,
    getCrossUnitTimeline,
    getInvestigationSummary
};
