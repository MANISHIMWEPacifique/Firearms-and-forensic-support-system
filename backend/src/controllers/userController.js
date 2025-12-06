const bcrypt = require('bcrypt');
const db = require('../config/database');

// Get all users (Admin only, with filtering)
const getAllUsers = async (req, res) => {
    try {
        const { role, unitId, isActive } = req.query;

        let query = `
      SELECT u.id, u.username, u.full_name, u.role, u.email, u.phone, 
             u.unit_id, unit.name as unit_name, u.unit_confirmed, 
             u.is_active, u.last_login, u.created_at
      FROM users u
      LEFT JOIN units unit ON u.unit_id = unit.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        
        if (unitId) {
            query += ` AND u.unit_id = $${paramCount}`;
            params.push(unitId);
            paramCount++;
        }

        if (isActive !== undefined) {
            query += ` AND u.is_active = $${paramCount}`;
            params.push(isActive === 'true');
            paramCount++;
        }

        query += ' ORDER BY u.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users'
        });
    }
};

// Get single user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT u.id, u.username, u.full_name, u.role, u.email, u.phone, 
              u.unit_id, unit.name as unit_name, u.unit_confirmed, 
              u.is_active, u.last_login, u.created_at
       FROM users u
       LEFT JOIN units unit ON u.unit_id = unit.id
       WHERE u.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve user'
        });
    }
};

// Create new user (Admin only)
const createUser = async (req, res) => {
    try {
        const { username, password, fullName, role, email, phone, unitId } = req.body;

        // Check if username already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // For Station Commanders, unit_id is required
        if (role === 'STATION_COMMANDER' && !unitId) {
            return res.status(400).json({
                success: false,
                message: 'Station Commanders must be assigned to a unit'
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert user
        const result = await db.query(
            `INSERT INTO users (username, password_hash, full_name, role, email, phone, unit_id, unit_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, full_name, role, email, phone, unit_id, is_active, created_at`,
            [username, passwordHash, fullName, role, email, phone, unitId, false]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
};

// Update user (Admin only)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, unitId, isActive } = req.body;

        const result = await db.query(
            `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           unit_id = COALESCE($4, unit_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING id, username, full_name, role, email, phone, unit_id, is_active`,
            [fullName, email, phone, unitId, isActive, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
};

// Confirm unit (Station Commander only, first login)
const confirmUnit = async (req, res) => {
    try {
        const userId = req.user.id;
        const { confirmed } = req.body;

        if (req.user.role !== 'STATION_COMMANDER') {
            return res.status(403).json({
                success: false,
                message: 'Only Station Commanders need to confirm their unit'
            });
        }

        if (req.user.unit_confirmed) {
            return res.status(400).json({
                success: false,
                message: 'Unit already confirmed'
            });
        }

        if (!confirmed) {
            return res.status(400).json({
                success: false,
                message: 'You must confirm your assigned unit to proceed'
            });
        }

        await db.query(
            'UPDATE users SET unit_confirmed = TRUE WHERE id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Unit confirmed successfully'
        });

    } catch (error) {
        console.error('Confirm unit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm unit'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, userId]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    confirmUnit,
    changePassword
};
