const db = require('../config/database');

// Add or update ballistic profile
const addBallisticProfile = async (req, res) => {
    try {
        const { firearmId } = req.params;
        const {
            riflingPattern,
            twistRate,
            grooveCount,
            firingPinShape,
            firingPinImpression,
            ejectorMarks,
            extractorMarks,
            breachFaceMarks,
            otherCharacteristics,
            testFiredDate,
            analystName
        } = req.body;

        // Check if firearm exists
        const firearmCheck = await db.query(
            'SELECT id FROM firearms WHERE id = $1',
            [firearmId]
        );

        if (firearmCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Firearm not found'
            });
        }

        // Check if ballistic profile already exists
        const existingProfile = await db.query(
            'SELECT id FROM ballistic_profiles WHERE firearm_id = $1',
            [firearmId]
        );

        let result;

        if (existingProfile.rows.length > 0) {
            // Update existing profile
            result = await db.query(
                `UPDATE ballistic_profiles 
         SET rifling_pattern = COALESCE($1, rifling_pattern),
             twist_rate = COALESCE($2, twist_rate),
             groove_count = COALESCE($3, groove_count),
             firing_pin_shape = COALESCE($4, firing_pin_shape),
             firing_pin_impression = COALESCE($5, firing_pin_impression),
             ejector_marks = COALESCE($6, ejector_marks),
             extractor_marks = COALESCE($7, extractor_marks),
             breach_face_marks = COALESCE($8, breach_face_marks),
             other_characteristics = COALESCE($9, other_characteristics),
             test_fired_date = COALESCE($10, test_fired_date),
             analyst_name = COALESCE($11, analyst_name)
         WHERE firearm_id = $12
         RETURNING *`,
                [
                    riflingPattern, twistRate, grooveCount, firingPinShape,
                    firingPinImpression, ejectorMarks, extractorMarks,
                    breachFaceMarks, otherCharacteristics, testFiredDate,
                    analystName, firearmId
                ]
            );
        } else {
            // Insert new profile
            result = await db.query(
                `INSERT INTO ballistic_profiles 
         (firearm_id, rifling_pattern, twist_rate, groove_count,
          firing_pin_shape, firing_pin_impression, ejector_marks,
          extractor_marks, breach_face_marks, other_characteristics,
          test_fired_date, analyst_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
                [
                    firearmId, riflingPattern, twistRate, grooveCount,
                    firingPinShape, firingPinImpression, ejectorMarks,
                    extractorMarks, breachFaceMarks, otherCharacteristics,
                    testFiredDate, analystName
                ]
            );
        }

        res.json({
            success: true,
            message: 'Ballistic profile saved successfully',
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('Add ballistic profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save ballistic profile'
        });
    }
};

// Get ballistic profile for a firearm
const getBallisticProfile = async (req, res) => {
    try {
        const { firearmId } = req.params;

        const result = await db.query(
            `SELECT bp.*, f.serial_number, f.manufacturer, f.model
       FROM ballistic_profiles bp
       JOIN firearms f ON bp.firearm_id = f.id
       WHERE bp.firearm_id = $1`,
            [firearmId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ballistic profile not found for this firearm'
            });
        }

        res.json({
            success: true,
            profile: result.rows[0]
        });

    } catch (error) {
        console.error('Get ballistic profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve ballistic profile'
        });
    }
};

// Search firearms by ballistic characteristics (Forensic Analysts)
const searchByBallistics = async (req, res) => {
    try {
        const {
            riflingPattern,
            twistRate,
            grooveCount,
            firingPinShape
        } = req.query;

        let query = `
      SELECT bp.*, f.serial_number, f.manufacturer, f.model, f.status,
             u.name as unit_name
      FROM ballistic_profiles bp
      JOIN firearms f ON bp.firearm_id = f.id
      LEFT JOIN units u ON f.assigned_unit_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (riflingPattern) {
            query += ` AND bp.rifling_pattern ILIKE $${paramCount}`;
            params.push(`%${riflingPattern}%`);
            paramCount++;
        }

        if (twistRate) {
            query += ` AND bp.twist_rate ILIKE $${paramCount}`;
            params.push(`%${twistRate}%`);
            paramCount++;
        }

        if (grooveCount) {
            query += ` AND bp.groove_count = $${paramCount}`;
            params.push(grooveCount);
            paramCount++;
        }

        if (firingPinShape) {
            query += ` AND bp.firing_pin_shape ILIKE $${paramCount}`;
            params.push(`%${firingPinShape}%`);
            paramCount++;
        }

        query += ' ORDER BY f.created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            results: result.rows
        });

    } catch (error) {
        console.error('Search by ballistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Ballistic search failed'
        });
    }
};

module.exports = {
    addBallisticProfile,
    getBallisticProfile,
    searchByBallistics
};
