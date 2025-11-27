const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const unitController = require('../controllers/unitController');
const { authenticateToken, authorizeRoles, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Get all units
router.get('/',
    authenticateToken,
    unitController.getAllUnits
);

// Get single unit
router.get('/:id',
    authenticateToken,
    unitController.getUnitById
);

// Create new unit (Admin and HQ Commander)
router.post('/',
    authenticateToken,
    authorizeRoles('ADMIN', 'HQ_FIREARM_COMMANDER'),
    auditLog('CREATE_UNIT', 'unit'),
    [
        body('name').trim().notEmpty().withMessage('Unit name is required'),
        body('unitType').isIn(['HEADQUARTERS', 'POLICE_STATION', 'TRAINING_SCHOOL', 'SPECIAL_UNIT'])
            .withMessage('Invalid unit type'),
        body('location').optional().trim(),
        body('commanderName').optional().trim(),
        body('contactPhone').optional().trim()
    ],
    handleValidationErrors,
    unitController.createUnit
);

// Update unit (Admin and HQ Commander)
router.put('/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'HQ_FIREARM_COMMANDER'),
    auditLog('UPDATE_UNIT', 'unit'),
    [
        body('name').optional().trim().notEmpty(),
        body('location').optional().trim(),
        body('commanderName').optional().trim(),
        body('contactPhone').optional().trim(),
        body('isActive').optional().isBoolean()
    ],
    handleValidationErrors,
    unitController.updateUnit
);

// Get unit personnel
router.get('/:id/personnel',
    authenticateToken,
    unitController.getUnitPersonnel
);

module.exports = router;
