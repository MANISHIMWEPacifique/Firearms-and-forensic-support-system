const db = require('../config/database');

// Register firearm at HQ with ballistic profile
const registerFirearmHQ = async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const {
            serialNumber,
            manufacturer,
            model,
            firearmType,
            caliber,
            procurementDate,
            notes,
            ballisticProfile
        } = req.body;

        // Check if firearm already exists
        const existingFirearm = await client.query(
            'SELECT id FROM firearms WHERE serial_number = $1',
            [serialNumber]
        );

        if (existingFirearm.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Firearm with this serial number already exists'
            });
        }

        // Insert firearm (status: UNASSIGNED, registration_level: HQ)
        const firearmResult = await client.query(
            `INSERT INTO firearms 
       (serial_number, manufacturer, model, firearm_type, caliber, 
        status, registration_level, registered_by, procurement_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [
                serialNumber,
                manufacturer,
                model,
                firearmType,
                caliber,
                'UNASSIGNED',
                'HQ',
                req.user.id,
                procurementDate,
                notes
            ]
        );

        const firearm = firearmResult.rows[0];

        // Insert ballistic profile if provided
        if (ballisticProfile) {
            await client.query(
                `INSERT INTO ballistic_profiles 
         (firearm_id, rifling_pattern, twist_rate, groove_count, 
          firing_pin_shape, firing_pin_impression, ejector_marks, 
          extractor_marks, breach_face_marks, other_characteristics, 
          test_fired_date, analyst_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    firearm.id,
                    ballisticProfile.riflingPattern,
                    ballisticProfile.twistRate,
                    ballisticProfile.grooveCount,
                    ballisticProfile.firingPinShape,
                    ballisticProfile.firingPinImpression,
                    ballisticProfile.ejectorMarks,
                    ballisticProfile.extractorMarks,
                    ballisticProfile.breachFaceMarks,
                    ballisticProfile.otherCharacteristics,
                    ballisticProfile.testFiredDate,
                    ballisticProfile.analystName
                ]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Firearm registered successfully at HQ',
            firearm: firearm
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Register firearm HQ error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register firearm'
        });
    } finally {
        client.release();
    }
};

// Register firearm at Station (assigns to unit)
const registerFirearmStation = async (req, res) => {
    try {
        const { serialNumber } = req.body;
        const stationUnitId = req.user.unit_id;

        if (!stationUnitId) {
            return res.status(400).json({
                success: false,
                message: 'User must be assigned to a unit'
            });
        }

        // Find firearm by serial number
        const firearmResult = await db.query(
            'SELECT * FROM firearms WHERE serial_number = $1',
            [serialNumber]
        );

        if (firearmResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found. It must be registered at HQ first.'
            });
        }

        const firearm = firearmResult.rows[0];

        // Check if already assigned to a unit
        if (firearm.assigned_unit_id) {
            return res.status(400).json({
                success: false,
                message: 'Firearm is already assigned to a unit'
            });
        }

        // Update firearm to assign to this station
        const updatedFirearm = await db.query(
            `UPDATE firearms 
       SET assigned_unit_id = $1, 
           status = 'ASSIGNED',
           registration_level = 'STATION'
       WHERE id = $2
       RETURNING *`,
            [stationUnitId, firearm.id]
        );

        res.json({
            success: true,
            message: 'Firearm assigned to your unit successfully',
            firearm: updatedFirearm.rows[0]
        });

    } catch (error) {
        console.error('Register firearm station error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign firearm to unit'
        });
    }
};

// Get all firearms (role-based filtering)
const getAllFirearms = async (req, res) => {
    try {
        const { status, type, unitId, search } = req.query;
        const userRole = req.user.role;
        const userUnitId = req.user.unit_id;

        let query = `
      SELECT f.*, 
             u.name as unit_name,
             r.username as registered_by_username,
             r.full_name as registered_by_name
      FROM firearms f
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      LEFT JOIN users r ON f.registered_by = r.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        // Station Commanders only see their unit's firearms
        if (userRole === 'STATION_COMMANDER') {
            query += ` AND f.assigned_unit_id = $${paramCount}`;
            params.push(userUnitId);
            paramCount++;
        }

        // Filter by status
        if (status) {
            query += ` AND f.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        // Filter by type
       
        // Filter by unit (for HQ users)
        if (unitId && userRole !== 'STATION_COMMANDER') {
            query += ` AND f.assigned_unit_id = $${paramCount}`;
            params.push(unitId);
            paramCount++;
        }

        // Search by serial number, manufacturer, or model
        if (search) {
            query += ` AND (
        f.serial_number ILIKE $${paramCount} OR
        f.manufacturer ILIKE $${paramCount} OR
        f.model ILIKE $${paramCount}
      )`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY f.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            firearms: result.rows
        });

    } catch (error) {
        console.error('Get firearms error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve firearms'
        });
    }
};

// Get single firearm by ID
const getFirearmById = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        const userUnitId = req.user.unit_id;

        const result = await db.query(
            `SELECT f.*, 
              u.name as unit_name,
              r.username as registered_by_username,
              r.full_name as registered_by_name,
              bp.rifling_pattern, bp.twist_rate, bp.groove_count,
              bp.firing_pin_shape, bp.firing_pin_impression,
              bp.ejector_marks, bp.extractor_marks, bp.breach_face_marks,
              bp.other_characteristics, bp.test_fired_date, bp.analyst_name
       FROM firearms f
       LEFT JOIN units u ON f.assigned_unit_id = u.id
       LEFT JOIN users r ON f.registered_by = r.id
       LEFT JOIN ballistic_profiles bp ON f.id = bp.firearm_id
       WHERE f.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        const firearm = result.rows[0];

        // Station Commanders can only view their unit's firearms
        if (userRole === 'STATION_COMMANDER' && firearm.assigned_unit_id !== userUnitId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this firearm'
            });
        }

        res.json({
            success: true,
            firearm: firearm
        });

    } catch (error) {
        console.error('Get firearm error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve firearm'
        });
    }
};

// Update firearm details
const updateFirearm = async (req, res) => {
    try {
        const { id } = req.params;
        const { manufacturer, model, caliber, status, notes, lastMaintenanceDate } = req.body;

        const result = await db.query(
            `UPDATE firearms 
       SET manufacturer = COALESCE($1, manufacturer),
           model = COALESCE($2, model),
           caliber = COALESCE($3, caliber),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           last_maintenance_date = COALESCE($6, last_maintenance_date)
       WHERE id = $7
       RETURNING *`,
            [manufacturer, model, caliber, status, notes, lastMaintenanceDate, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        res.json({
            success: true,
            message: 'Firearm updated successfully',
            firearm: result.rows[0]
        });

    } catch (error) {
        console.error('Update firearm error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update firearm'
        });
    }
};

// Get firearm custody history
const getFirearmHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Get custody logs
        const custodyLogs = await db.query(
            `SELECT cl.*, 
              o.full_name as officer_name,
              o.badge_number,
              u.username as performed_by_username
       FROM custody_logs cl
       LEFT JOIN officers o ON cl.officer_id = o.id
       LEFT JOIN users u ON cl.performed_by = u.id
       WHERE cl.firearm_id = $1
       ORDER BY cl.timestamp DESC`,
            [id]
        );

        // Get lifecycle events
        const lifecycleEvents = await db.query(
            `SELECT le.*,
              req.full_name as requested_by_name,
              app.full_name as approved_by_name
       FROM lifecycle_events le
       LEFT JOIN users req ON le.requested_by = req.id
       LEFT JOIN users app ON le.approved_by = app.id
       WHERE le.firearm_id = $1
       ORDER BY le.requested_at DESC`,
            [id]
        );

        res.json({
            success: true,
            custodyLogs: custodyLogs.rows,
            lifecycleEvents: lifecycleEvents.rows
        });

    } catch (error) {
        console.error('Get firearm history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve firearm history'
        });
    }
};

module.exports = {
    registerFirearmHQ,
    registerFirearmStation,
    getAllFirearms,
    getFirearmById,
    updateFirearm,
    getFirearmHistory
};
