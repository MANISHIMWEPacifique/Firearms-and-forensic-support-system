const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const officerController = require('../controllers/officerController');
const { authenticateToken, authorizeRoles, requireUnitConfirmation, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Get all officers (role-based filtering)
router.get('/',
    authenticateToken,
    requireUnitConfirmation,
    officerController.getAllOfficers
);

// Get single officer
router.get('/:id',
    authenticateToken,
    [
        param('id').isInt().withMessage('Invalid officer ID')
    ],
    handleValidationErrors,
    officerController.getOfficerById
);

// Create new officer (Station Commander, HQ Commander)
router.post('/',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER', 'HQ_FIREARM_COMMANDER'),
    requireUnitConfirmation,
    auditLog('CREATE_OFFICER', 'officer'),
    [
        body('badgeNumber').trim().notEmpty().withMessage('Badge number is required'),
        body('fullName').trim().notEmpty().withMessage('Full name is required'),
        body('rank').optional().trim(),
        body('unitId').isInt().withMessage('Unit ID is required'),
        body('phone').optional().trim(),
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('dateJoined').optional().isDate().withMessage('Invalid date')
    ],
    handleValidationErrors,
    officerController.createOfficer
);

// Update officer
router.put('/:id',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER', 'HQ_FIREARM_COMMANDER'),
    requireUnitConfirmation,
    auditLog('UPDATE_OFFICER', 'officer'),
    [
        param('id').isInt().withMessage('Invalid officer ID'),
        body('fullName').optional().trim(),
        body('rank').optional().trim(),
        body('unitId').optional().isInt(),
        body('phone').optional().trim(),
        body('email').optional().isEmail(),
        body('isActive').optional().isBoolean()
    ],
    handleValidationErrors,
    officerController.updateOfficer
);

// Get officer's firearm history
router.get('/:id/firearms',
    authenticateToken,
    [
        param('id').isInt().withMessage('Invalid officer ID')
    ],
    handleValidationErrors,
    officerController.getOfficerFirearmHistory
);

module.exports = router;
