const db = require('../config/database');

// Get all units
const getAllUnits = async (req, res) => {
    try {
        const { type, isActive } = req.query;

        let query = 'SELECT * FROM units WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (type) {
            query += ` AND unit_type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        if (isActive !== undefined) {
            query += ` AND is_active = $${paramCount}`;
            params.push(isActive === 'true');
            paramCount++;
        }

        query += ' ORDER BY name ASC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            units: result.rows
        });

    } catch (error) {
        console.error('Get units error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve units'
        });
    }
};

// Get single unit by ID
const getUnitById = async (req, res) => {
    try {
        const { id } = req.params;

        const unitResult = await db.query(
            'SELECT * FROM units WHERE id = $1',
            [id]
        );

        if (unitResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        // Get personnel count
        const personnelResult = await db.query(
            'SELECT COUNT(*) as count FROM officers WHERE unit_id = $1 AND is_active = TRUE',
            [id]
        );

        // Get firearms count
        const firearmsResult = await db.query(
            'SELECT COUNT(*) as count FROM firearms WHERE assigned_unit_id = $1',
            [id]
        );

        res.json({
            success: true,
            unit: {
                ...unitResult.rows[0],
                personnelCount: parseInt(personnelResult.rows[0].count),
                firearmsCount: parseInt(firearmsResult.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Get unit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve unit'
        });
    }
};

// Create new unit (Admin and HQ Commander)
const createUnit = async (req, res) => {
    try {
        const { name, unitType, location, commanderName, contactPhone } = req.body;

        // Check if unit name already exists
        const existingUnit = await db.query(
            'SELECT id FROM units WHERE name = $1',
            [name]
        );

        if (existingUnit.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Unit name already exists'
            });
        }

        const result = await db.query(
            `INSERT INTO units (name, unit_type, location, commander_name, contact_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name, unitType, location, commanderName, contactPhone]
        );

        res.status(201).json({
            success: true,
            message: 'Unit created successfully',
            unit: result.rows[0]
        });

    } catch (error) {
        console.error('Create unit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create unit'
        });
    }
};

// Update unit (Admin and HQ Commander)
const updateUnit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, commanderName, contactPhone, isActive } = req.body;

        const result = await db.query(
            `UPDATE units 
       SET name = COALESCE($1, name),
           location = COALESCE($2, location),
           commander_name = COALESCE($3, commander_name),
           contact_phone = COALESCE($4, contact_phone),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
            [name, location, commanderName, contactPhone, isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        res.json({
            success: true,
            message: 'Unit updated successfully',
            unit: result.rows[0]
        });

    } catch (error) {
        console.error('Update unit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update unit'
        });
    }
};

// Get unit personnel
const getUnitPersonnel = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify unit exists
        const unitCheck = await db.query(
            'SELECT id FROM units WHERE id = $1',
            [id]
        );

        if (unitCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found'
            });
        }

        // Get officers
        const officersResult = await db.query(
            `SELECT o.*, 
              (SELECT COUNT(*) FROM custody_assignments WHERE officer_id = o.id AND is_active = TRUE) as active_firearms
       FROM officers o
       WHERE o.unit_id = $1
       ORDER BY o.rank, o.full_name`,
            [id]
        );

        res.json({
            success: true,
            personnel: officersResult.rows
        });

    } catch (error) {
        console.error('Get unit personnel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve unit personnel'
        });
    }
};

module.exports = {
    getAllUnits,
    getUnitById,
    createUnit,
    updateUnit,
    getUnitPersonnel
};
