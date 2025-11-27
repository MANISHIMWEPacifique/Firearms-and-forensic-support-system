const db = require('../config/database');

// Assign custody to an officer
const assignCustody = async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const {
            firearmId,
            officerId,
            custodyType,
            expectedReturnDate,
            notes
        } = req.body;

        // Verify firearm exists and is available
        const firearmCheck = await client.query(
            'SELECT * FROM firearms WHERE id = $1',
            [firearmId]
        );

        if (firearmCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        const firearm = firearmCheck.rows[0];

        // Station Commanders can only assign firearms from their unit
        if (req.user.role === 'STATION_COMMANDER') {
            if (firearm.assigned_unit_id !== req.user.unit_id) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    message: 'You can only assign firearms from your unit'
                });
            }
        }

        // Check if firearm already has active custody
        const activeCheck = await client.query(
            'SELECT id FROM custody_assignments WHERE firearm_id = $1 AND is_active = TRUE',
            [firearmId]
        );

        if (activeCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Firearm is already assigned to another officer'
            });
        }

        // Verify officer exists and is active
        const officerCheck = await client.query(
            'SELECT * FROM officers WHERE id = $1 AND is_active = TRUE',
            [officerId]
        );

        if (officerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Officer not found or inactive'
            });
        }

        // Create custody assignment
        const assignmentResult = await client.query(
            `INSERT INTO custody_assignments 
       (firearm_id, officer_id, custody_type, expected_return_date, 
        is_active, assigned_by, notes)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6)
       RETURNING *`,
            [firearmId, officerId, custodyType, expectedReturnDate, req.user.id, notes]
        );

        // Log custody action
        await client.query(
            `INSERT INTO custody_logs 
       (firearm_id, officer_id, action, custody_type, performed_by, notes)
       VALUES ($1, $2, 'ASSIGNED', $3, $4, $5)`,
            [firearmId, officerId, custodyType, req.user.id, notes]
        );

        // Update firearm status
        await client.query(
            'UPDATE firearms SET status = $1 WHERE id = $2',
            ['IN_CUSTODY', firearmId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Custody assigned successfully',
            assignment: assignmentResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Assign custody error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign custody'
        });
    } finally {
        client.release();
    }
};

// Return firearm (end custody)
const returnCustody = async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { assignmentId } = req.params;
        const { notes } = req.body;

        // Get custody assignment
        const assignmentCheck = await client.query(
            `SELECT ca.*, f.assigned_unit_id
       FROM custody_assignments ca
       JOIN firearms f ON ca.firearm_id = f.id
       WHERE ca.id = $1 AND ca.is_active = TRUE`,
            [assignmentId]
        );

        if (assignmentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Active custody assignment not found'
            });
        }

        const assignment = assignmentCheck.rows[0];

        // Station Commanders can only return firearms from their unit
        if (req.user.role === 'STATION_COMMANDER') {
            if (assignment.assigned_unit_id !== req.user.unit_id) {
                await client.query('ROLLBACK');
                return res.status(403).json({
                    success: false,
                    message: 'You can only return firearms from your unit'
                });
            }
        }

        // End custody assignment
        await client.query(
            `UPDATE custody_assignments 
       SET is_active = FALSE, 
           end_date = CURRENT_TIMESTAMP,
           returned_by = $1,
           notes = COALESCE($2, notes)
       WHERE id = $3`,
            [req.user.id, notes, assignmentId]
        );

        // Log custody action
        await client.query(
            `INSERT INTO custody_logs 
       (firearm_id, officer_id, action, custody_type, performed_by, notes)
       VALUES ($1, $2, 'RETURNED', $3, $4, $5)`,
            [
                assignment.firearm_id,
                assignment.officer_id,
                assignment.custody_type,
                req.user.id,
                notes
            ]
        );

        // Update firearm status
        await client.query(
            'UPDATE firearms SET status = $1 WHERE id = $2',
            ['ASSIGNED', assignment.firearm_id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Firearm returned successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Return custody error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to return firearm'
        });
    } finally {
        client.release();
    }
};

// Transfer custody between officers
const transferCustody = async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { assignmentId } = req.params;
        const { newOfficerId, notes } = req.body;

        // Get current assignment
        const currentAssignment = await client.query(
            `SELECT ca.*, f.assigned_unit_id
       FROM custody_assignments ca
       JOIN firearms f ON ca.firearm_id = f.id
       WHERE ca.id = $1 AND ca.is_active = TRUE`,
            [assignmentId]
        );

        if (currentAssignment.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Active custody assignment not found'
            });
        }

        const assignment = currentAssignment.rows[0];

        // Verify new officer
        const newOfficerCheck = await client.query(
            'SELECT * FROM officers WHERE id = $1 AND is_active = TRUE',
            [newOfficerId]
        );

        if (newOfficerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'New officer not found or inactive'
            });
        }

        // End current assignment
        await client.query(
            `UPDATE custody_assignments 
       SET is_active = FALSE, 
           end_date = CURRENT_TIMESTAMP,
           returned_by = $1
       WHERE id = $2`,
            [req.user.id, assignmentId]
        );

        // Create new assignment
        const newAssignment = await client.query(
            `INSERT INTO custody_assignments 
       (firearm_id, officer_id, custody_type, is_active, assigned_by, notes)
       VALUES ($1, $2, $3, TRUE, $4, $5)
       RETURNING *`,
            [
                assignment.firearm_id,
                newOfficerId,
                assignment.custody_type,
                req.user.id,
                notes
            ]
        );

        // Log transfer action
        await client.query(
            `INSERT INTO custody_logs 
       (firearm_id, officer_id, action, custody_type, performed_by, notes)
       VALUES ($1, $2, 'TRANSFERRED', $3, $4, $5)`,
            [
                assignment.firearm_id,
                newOfficerId,
                assignment.custody_type,
                req.user.id,
                `Transferred from officer ID ${assignment.officer_id}. ${notes || ''}`
            ]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Custody transferred successfully',
            newAssignment: newAssignment.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transfer custody error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transfer custody'
        });
    } finally {
        client.release();
    }
};

// Get all custody assignments
const getAllCustodyAssignments = async (req, res) => {
    try {
        const { firearmId, officerId, isActive, unitId } = req.query;
        const userRole = req.user.role;
        const userUnitId = req.user.unit_id;

        let query = `
      SELECT ca.*, 
             f.serial_number, f.manufacturer, f.model, f.firearm_type,
             o.full_name as officer_name, o.badge_number,
             u.name as unit_name,
             assigned.full_name as assigned_by_name,
             returned.full_name as returned_by_name
      FROM custody_assignments ca
      JOIN firearms f ON ca.firearm_id = f.id
      JOIN officers o ON ca.officer_id = o.id
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      LEFT JOIN users assigned ON ca.assigned_by = assigned.id
      LEFT JOIN users returned ON ca.returned_by = returned.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        // Station Commanders only see their unit's assignments
        if (userRole === 'STATION_COMMANDER') {
            query += ` AND f.assigned_unit_id = $${paramCount}`;
            params.push(userUnitId);
            paramCount++;
        } else if (unitId) {
            query += ` AND f.assigned_unit_id = $${paramCount}`;
            params.push(unitId);
            paramCount++;
        }

        if (firearmId) {
            query += ` AND ca.firearm_id = $${paramCount}`;
            params.push(firearmId);
            paramCount++;
        }

        if (officerId) {
            query += ` AND ca.officer_id = $${paramCount}`;
            params.push(officerId);
            paramCount++;
        }

        if (isActive !== undefined) {
            query += ` AND ca.is_active = $${paramCount}`;
            params.push(isActive === 'true');
            paramCount++;
        }

        query += ' ORDER BY ca.start_date DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            assignments: result.rows
        });

    } catch (error) {
        console.error('Get custody assignments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve custody assignments'
        });
    }
};

// Get custody timeline (for forensic analysis)
const getCustodyTimeline = async (req, res) => {
    try {
        const { firearmId } = req.params;

        const result = await db.query(
            `SELECT cl.*,
              o.full_name as officer_name,
              o.badge_number,
              u.username as performed_by_username,
              u.full_name as performed_by_name
       FROM custody_logs cl
       LEFT JOIN officers o ON cl.officer_id = o.id
       LEFT JOIN users u ON cl.performed_by = u.id
       WHERE cl.firearm_id = $1
       ORDER BY cl.timestamp ASC`,
            [firearmId]
        );

        res.json({
            success: true,
            timeline: result.rows
        });

    } catch (error) {
        console.error('Get custody timeline error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve custody timeline'
        });
    }
};

module.exports = {
    assignCustody,
    returnCustody,
    transferCustody,
    getAllCustodyAssignments,
    getCustodyTimeline
};
