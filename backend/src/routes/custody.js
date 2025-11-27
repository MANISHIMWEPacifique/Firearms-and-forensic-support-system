const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const custodyController = require('../controllers/custodyController');
const { authenticateToken, authorizeRoles, requireUnitConfirmation, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Assign custody (Station Commander, HQ Commander)
router.post('/assign',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER', 'HQ_FIREARM_COMMANDER'),
    requireUnitConfirmation,
    auditLog('ASSIGN_CUSTODY', 'custody'),
    [
        body('firearmId').isInt().withMessage('Firearm ID is required'),
        body('officerId').isInt().withMessage('Officer ID is required'),
        body('custodyType').isIn(['PERMANENT', 'TEMPORARY', 'PERSONAL'])
            .withMessage('Invalid custody type'),
        body('expectedReturnDate').optional().isDate(),
        body('notes').optional().trim()
    ],
    handleValidationErrors,
    custodyController.assignCustody
);

// Return firearm (end custody)
router.post('/:assignmentId/return',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER', 'HQ_FIREARM_COMMANDER'),
    requireUnitConfirmation,
    auditLog('RETURN_CUSTODY', 'custody'),
    [
        param('assignmentId').isInt().withMessage('Assignment ID is required'),
        body('notes').optional().trim()
    ],
    handleValidationErrors,
    custodyController.returnCustody
);

// Transfer custody between officers
router.post('/:assignmentId/transfer',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER', 'HQ_FIREARM_COMMANDER'),
    requireUnitConfirmation,
    auditLog('TRANSFER_CUSTODY', 'custody'),
    [
        param('assignmentId').isInt().withMessage('Assignment ID is required'),
        body('newOfficerId').isInt().withMessage('New officer ID is required'),
        body('notes').optional().trim()
    ],
    handleValidationErrors,
    custodyController.transferCustody
);

// Get all custody assignments
router.get('/',
    authenticateToken,
    requireUnitConfirmation,
    custodyController.getAllCustodyAssignments
);

// Get custody timeline for a firearm (Forensic purposes)
router.get('/timeline/:firearmId',
    authenticateToken,
    authorizeRoles('FORENSIC_ANALYST', 'HQ_FIREARM_COMMANDER', 'AUDITOR'),
    [
        param('firearmId').isInt().withMessage('Firearm ID is required')
    ],
    handleValidationErrors,
    custodyController.getCustodyTimeline
);

module.exports = router;
