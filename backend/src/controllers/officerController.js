const db = require('../config/database');

// Get all officers (filtered by unit for Station Commanders)
const getAllOfficers = async (req, res) => {
    try {
        const { unitId, isActive, search } = req.query;
        const userRole = req.user.role;
        const userUnitId = req.user.unit_id;

        let query = `
      SELECT o.*, u.name as unit_name,
             (SELECT COUNT(*) FROM custody_assignments 
              WHERE officer_id = o.id AND is_active = TRUE) as active_firearms_count
      FROM officers o
      LEFT JOIN units u ON o.unit_id = u.id
      WHERE 1=1
    `;
        

        // Station Commanders only see their unit's officers
        if (userRole === 'STATION_COMMANDER') {
            query += ` AND o.unit_id = $${paramCount}`;
            params.push(userUnitId);
            paramCount++;
        } else if (unitId) {
            // Other roles can filter by unit
            query += ` AND o.unit_id = $${paramCount}`;
            params.push(unitId);
            paramCount++;
        }

        if (isActive !== undefined) {
            query += ` AND o.is_active = $${paramCount}`;
            params.push(isActive === 'true');
            paramCount++;
        }

        if (search) {
            query += ` AND (
        o.full_name ILIKE $${paramCount} OR
        o.badge_number ILIKE $${paramCount}
      )`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY o.rank, o.full_name';

        const result = await db.query(query, params);

        res.json({
            success: true,
            officers: result.rows
        });

    } catch (error) {
        console.error('Get officers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve officers'
        });
    }
};

// Get single officer
const getOfficerById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT o.*, u.name as unit_name
       FROM officers o
       LEFT JOIN units u ON o.unit_id = u.id
       WHERE o.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found'
            });
        }

        res.json({
            success: true,
            officer: result.rows[0]
        });

    } catch (error) {
        console.error('Get officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve officer'
        });
    }
};

// Create new officer
const createOfficer = async (req, res) => {
    try {
        const { badgeNumber, fullName, rank, unitId, phone, email, dateJoined } = req.body;

        // Check if badge number already exists
        const existingOfficer = await db.query(
            'SELECT id FROM officers WHERE badge_number = $1',
            [badgeNumber]
        );

        if (existingOfficer.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Badge number already exists'
            });
        }

        const result = await db.query(
            `INSERT INTO officers 
       (badge_number, full_name, rank, unit_id, phone, email, date_joined)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [badgeNumber, fullName, rank, unitId, phone, email, dateJoined]
        );

        res.status(201).json({
            success: true,
            message: 'Officer registered successfully',
            officer: result.rows[0]
        });

    } catch (error) {
        console.error('Create officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create officer'
        });
    }
};

// Update officer
const updateOfficer = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, rank, unitId, phone, email, isActive } = req.body;

        const result = await db.query(
            `UPDATE officers 
       SET full_name = COALESCE($1, full_name),
           rank = COALESCE($2, rank),
           unit_id = COALESCE($3, unit_id),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
            [fullName, rank, unitId, phone, email, isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Officer not found'
            });
        }

        res.json({
            success: true,
            message: 'Officer updated successfully',
            officer: result.rows[0]
        });

    } catch (error) {
        console.error('Update officer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update officer'
        });
    }
};

// Get officer's firearm history
const getOfficerFirearmHistory = async (req, res) => {
    try {
        const { id } = req.params;

        // Get current custody assignments
        const currentAssignments = await db.query(
            `SELECT ca.*, f.serial_number, f.manufacturer, f.model, f.firearm_type
       FROM custody_assignments ca
       JOIN firearms f ON ca.firearm_id = f.id
       WHERE ca.officer_id = $1 AND ca.is_active = TRUE
       ORDER BY ca.start_date DESC`,
            [id]
        );

        // Get custody history
        const custodyHistory = await db.query(
            `SELECT cl.*, f.serial_number, f.manufacturer, f.model
       FROM custody_logs cl
       JOIN firearms f ON cl.firearm_id = f.id
       WHERE cl.officer_id = $1
       ORDER BY cl.timestamp DESC`,
            [id]
        );

        res.json({
            success: true,
            currentAssignments: currentAssignments.rows,
            custodyHistory: custodyHistory.rows
        });

    } catch (error) {
        console.error('Get officer firearm history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve officer firearm history'
        });
    }
};

module.exports = {
    getAllOfficers,
    getOfficerById,
    createOfficer,
    updateOfficer,
    getOfficerFirearmHistory
};
