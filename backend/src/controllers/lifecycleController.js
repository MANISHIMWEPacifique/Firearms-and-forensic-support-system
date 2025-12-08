const db = require('../config/database');

// Report firearm loss
const reportLoss = async (req, res) => {
    try {
        const { firearmId, details } = req.body;

        // Verify firearm exists
        const firearmCheck = await db.query(
            'SELECT * FROM firearms WHERE id = $1',
            [firearmId]
        );

        if (firearmCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        const firearm = firearmCheck.rows[0];

        // Station Commanders can only report loss for their unit's firearms
       

        // Create lifecycle event
        const result = await db.query(
            `INSERT INTO lifecycle_events 
       (firearm_id, event_type, status, requested_by, request_details)
       VALUES ($1, 'LOSS_REPORT', 'PENDING', $2, $3)
       RETURNING *`,
            [firearmId, req.user.id, details]
        );

        res.status(201).json({
            success: true,
            message: 'Loss report submitted successfully. Awaiting HQ approval.',
            event: result.rows[0]
        });

    } catch (error) {
        console.error('Report loss error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report loss'
        });
    }
};

// Request firearm destruction
const requestDestruction = async (req, res) => {
    try {
        const { firearmId, details } = req.body;

        // Verify firearm exists
        const firearmCheck = await db.query(
            'SELECT * FROM firearms WHERE id = $1',
            [firearmId]
        );

        if (firearmCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        const firearm = firearmCheck.rows[0];

        // Station Commanders can only request destruction for their unit's firearms
        if (req.user.role === 'STATION_COMMANDER') {
            if (firearm.assigned_unit_id !== req.user.unit_id) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only request destruction for your unit\'s firearms'
                });
            }
        }

        // Create lifecycle event
        const result = await db.query(
            `INSERT INTO lifecycle_events 
       (firearm_id, event_type, status, requested_by, request_details)
       VALUES ($1, 'DESTRUCTION_REQUEST', 'PENDING', $2, $3)
       RETURNING *`,
            [firearmId, req.user.id, details]
        );

        res.status(201).json({
            success: true,
            message: 'Destruction request submitted successfully. Awaiting HQ approval.',
            event: result.rows[0]
        });

    } catch (error) {
        console.error('Request destruction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit destruction request'
        });
    }
};

// Request firearm procurement
const requestProcurement = async (req, res) => {
    try {
        const { details } = req.body;

        // Create lifecycle event (firearm_id can be NULL for procurement requests)
        const result = await db.query(
            `INSERT INTO lifecycle_events 
       (event_type, status, requested_by, request_details)
       VALUES ('PROCUREMENT_REQUEST', 'PENDING', $1, $2)
       RETURNING *`,
            [req.user.id, details]
        );

        res.status(201).json({
            success: true,
            message: 'Procurement request submitted successfully. Awaiting HQ approval.',
            event: result.rows[0]
        });

    } catch (error) {
        console.error('Request procurement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit procurement request'
        });
    }
};

// Get all lifecycle events (with filtering)
const getAllLifecycleEvents = async (req, res) => {
    try {
        const { eventType, status, firearmId } = req.query;
        const userRole = req.user.role;
        const userUnitId = req.user.unit_id;

        let query = `
      SELECT le.*,
             f.serial_number, f.manufacturer, f.model,
             f.assigned_unit_id,
             u.name as unit_name,
             req.full_name as requested_by_name,
             req.username as requested_by_username,
             app.full_name as approved_by_name
      FROM lifecycle_events le
      LEFT JOIN firearms f ON le.firearm_id = f.id
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      LEFT JOIN users req ON le.requested_by = req.id
      LEFT JOIN users app ON le.approved_by = app.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        // Station Commanders only see their unit's events
        if (userRole === 'STATION_COMMANDER') {
            query += ` AND (f.assigned_unit_id = $${paramCount} OR le.requested_by = $${paramCount + 1})`;
            params.push(userUnitId, req.user.id);
            paramCount += 2;
        }

        if (eventType) {
            query += ` AND le.event_type = $${paramCount}`;
            params.push(eventType);
            paramCount++;
        }

        if (status) {
            query += ` AND le.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (firearmId) {
            query += ` AND le.firearm_id = $${paramCount}`;
            params.push(firearmId);
            paramCount++;
        }

        query += ' ORDER BY le.requested_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            events: result.rows
        });

    } catch (error) {
        console.error('Get lifecycle events error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve lifecycle events'
        });
    }
};

// Approve or reject lifecycle event (HQ Commander only)
const reviewLifecycleEvent = async (req, res) => {
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { eventId } = req.params;
        const { approved, comments } = req.body;

        // Get event
        const eventCheck = await client.query(
            'SELECT * FROM lifecycle_events WHERE id = $1',
            [eventId]
        );

        if (eventCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Lifecycle event not found'
            });
        }

        const event = eventCheck.rows[0];

        if (event.status !== 'PENDING') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Event has already been reviewed'
            });
        }

        const newStatus = approved ? 'APPROVED' : 'REJECTED';

        // Update event
        await client.query(
            `UPDATE lifecycle_events 
       SET status = $1, 
           approved_by = $2,
           approval_comments = $3,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
            [newStatus, req.user.id, comments, eventId]
        );

        // If LOSS_REPORT approved, update firearm status
        if (approved && event.event_type === 'LOSS_REPORT' && event.firearm_id) {
            await client.query(
                'UPDATE firearms SET status = $1 WHERE id = $2',
                ['LOST', event.firearm_id]
            );
        }

        // If DESTRUCTION_REQUEST approved, update firearm status
        if (approved && event.event_type === 'DESTRUCTION_REQUEST' && event.firearm_id) {
            await client.query(
                'UPDATE firearms SET status = $1 WHERE id = $2',
                ['DESTROYED', event.firearm_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Lifecycle event ${approved ? 'approved' : 'rejected'} successfully`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Review lifecycle event error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review lifecycle event'
        });
    } finally {
        client.release();
    }
};

module.exports = {
    reportLoss,
    requestDestruction,
    requestProcurement,
    getAllLifecycleEvents,
    reviewLifecycleEvent
};
