const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const anomalyController = require('../controllers/anomalyController');
const { authenticateToken, authorizeRoles, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Run anomaly detection manually (HQ Commander, Auditor)
router.post('/detect',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'AUDITOR'),
    auditLog('RUN_ANOMALY_DETECTION', 'anomaly'),
    anomalyController.runAnomalyDetection
);

// Get all anomalies
router.get('/',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'FORENSIC_ANALYST', 'AUDITOR'),
    anomalyController.getAllAnomalies
);

// Get anomaly statistics
router.get('/statistics',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'AUDITOR'),
    anomalyController.getAnomalyStatistics
);

// Get single anomaly
router.get('/:id',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'FORENSIC_ANALYST', 'AUDITOR'),
    [
        param('id').isInt().withMessage('Invalid anomaly ID')
    ],
    handleValidationErrors,
    anomalyController.getAnomalyById
);

// Review anomaly (HQ Commander, Auditor)
router.post('/:id/review',
    authenticateToken,
    authorizeRoles('HQ_FIREARM_COMMANDER', 'AUDITOR'),
    auditLog('REVIEW_ANOMALY', 'anomaly'),
    [
        param('id').isInt().withMessage('Invalid anomaly ID'),
        body('status').isIn(['REVIEWED', 'RESOLVED', 'FALSE_POSITIVE'])
            .withMessage('Invalid status'),
        body('notes').optional().trim()
    ],
    handleValidationErrors,
    anomalyController.reviewAnomaly
);

module.exports = router;
