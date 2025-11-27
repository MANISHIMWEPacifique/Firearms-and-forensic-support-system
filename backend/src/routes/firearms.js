const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const firearmController = require('../controllers/firearmController');
const ballisticsController = require('../controllers/ballisticsController');
const { authenticateToken, authorizeRoles, requireUnitConfirmation, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// =====================================================
// FIREARM REGISTRATION
// =====================================================

// Register firearm at HQ (HQ Commander only)
router.post('/register/hq',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER'),
    auditLog('REGISTER_FIREARM_HQ', 'firearm'),
    [
        body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
        body('manufacturer').trim().notEmpty().withMessage('Manufacturer is required'),
        body('model').trim().notEmpty().withMessage('Model is required'),
        body('firearmType').trim().notEmpty().withMessage('Firearm type is required'),
        body('caliber').optional().trim(),
        body('procurementDate').optional().isDate().withMessage('Invalid procurement date'),
        body('notes').optional().trim(),
        body('ballisticProfile').optional().isObject()
    ],
    handleValidationErrors,
    firearmController.registerFirearmHQ
);

// Register firearm at Station (Station Commander only)
router.post('/register/station',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER'),
    requireUnitConfirmation,
    auditLog('REGISTER_FIREARM_STATION', 'firearm'),
    [
        body('serialNumber').trim().notEmpty().withMessage('Serial number is required')
    ],
    handleValidationErrors,
    firearmController.registerFirearmStation
);

// =====================================================
// FIREARM MANAGEMENT
// =====================================================

// Get all firearms (role-based filtering)
router.get('/',
    authenticateToken,
    requireUnitConfirmation,
    firearmController.getAllFirearms
);

// Get single firearm by ID
router.get('/:id',
    authenticateToken,
    requireUnitConfirmation,
    [
        param('id').isInt().withMessage('Invalid firearm ID')
    ],
    handleValidationErrors,
    firearmController.getFirearmById
);

// Update firearm details
router.put('/:id',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'STATION_COMMANDER'),
    requireUnitConfirmation,
    auditLog('UPDATE_FIREARM', 'firearm'),
    [
        param('id').isInt().withMessage('Invalid firearm ID'),
        body('manufacturer').optional().trim(),
        body('model').optional().trim(),
        body('caliber').optional().trim(),
        body('status').optional().isIn(['UNASSIGNED', 'ASSIGNED', 'IN_CUSTODY', 'LOST', 'DESTROYED', 'UNDER_MAINTENANCE']),
        body('notes').optional().trim(),
        body('lastMaintenanceDate').optional().isDate()
    ],
    handleValidationErrors,
    firearmController.updateFirearm
);

// Get firearm custody and lifecycle history
router.get('/:id/history',
    authenticateToken,
    [
        param('id').isInt().withMessage('Invalid firearm ID')
    ],
    handleValidationErrors,
    firearmController.getFirearmHistory
);

// =====================================================
// BALLISTIC PROFILES
// =====================================================

// Add or update ballistic profile (HQ Commander only)
router.post('/:firearmId/ballistics',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER'),
    auditLog('ADD_BALLISTIC_PROFILE', 'ballistic_profile'),
    [
        param('firearmId').isInt().withMessage('Invalid firearm ID'),
        body('riflingPattern').optional().trim(),
        body('twistRate').optional().trim(),
        body('grooveCount').optional().isInt(),
        body('firingPinShape').optional().trim(),
        body('firingPinImpression').optional().trim(),
        body('ejectorMarks').optional().trim(),
        body('extractorMarks').optional().trim(),
        body('breachFaceMarks').optional().trim(),
        body('otherCharacteristics').optional().trim(),
        body('testFiredDate').optional().isDate(),
        body('analystName').optional().trim()
    ],
    handleValidationErrors,
    ballisticsController.addBallisticProfile
);

// Get ballistic profile (Forensic Analyst, HQ Commander)
router.get('/:firearmId/ballistics',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'FORENSIC_ANALYST'),
    [
        param('firearmId').isInt().withMessage('Invalid firearm ID')
    ],
    handleValidationErrors,
    ballisticsController.getBallisticProfile
);

// Search by ballistic characteristics (Forensic Analyst only)
router.get('/search/ballistics',
    authenticateToken,
    authorizeRoles('FORENSIC_ANALYST'),
    ballisticsController.searchByBallistics
);

module.exports = router;
