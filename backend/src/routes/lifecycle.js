const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const lifecycleController = require('../controllers/lifecycleController');
const { authenticateToken, authorizeRoles, requireUnitConfirmation, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Report firearm loss (Station Commander)
router.post('/loss',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER'),
    requireUnitConfirmation,
    auditLog('REPORT_LOSS', 'lifecycle'),
    [
        body('firearmId').isInt().withMessage('Firearm ID is required'),
        body('details').trim().notEmpty().withMessage('Loss details are required')
    ],
    handleValidationErrors,
    lifecycleController.reportLoss
);

// Request firearm destruction (Station Commander)
router.post('/destruction',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER'),
    requireUnitConfirmation,
    auditLog('REQUEST_DESTRUCTION', 'lifecycle'),
    [
        body('firearmId').isInt().withMessage('Firearm ID is required'),
        body('details').trim().notEmpty().withMessage('Destruction reason details are required')
    ],
    handleValidationErrors,
    lifecycleController.requestDestruction
);

// Request firearm procurement (Station Commander)
router.post('/procurement',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER'),
    requireUnitConfirmation,
    auditLog('REQUEST_PROCUREMENT', 'lifecycle'),
    [
        body('details').trim().notEmpty().withMessage('Procurement details are required')
    ],
    handleValidationErrors,
    lifecycleController.requestProcurement
);

// Get all lifecycle events
router.get('/',
    authenticateToken,
    lifecycleController.getAllLifecycleEvents
);

// Approve or reject lifecycle event (HQ Commander only)
router.post('/:eventId/review',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER'),
    auditLog('REVIEW_LIFECYCLE_EVENT', 'lifecycle'),
    [
        param('eventId').isInt().withMessage('Event ID is required'),
        body('approved').isBoolean().withMessage('Approval decision is required'),
        body('comments').optional().trim()
    ],
    handleValidationErrors,
    lifecycleController.reviewLifecycleEvent
);

module.exports = router;
