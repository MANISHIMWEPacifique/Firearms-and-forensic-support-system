const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all audit logs (Auditor, HQ Commander)
router.get('/',
    authenticateToken,
    authorizeRoles('AUDITOR', 'HQ_FIREARM_COMMANDER', 'ADMIN'),
    auditController.getAllAuditLogs
);

// Get audit statistics (Auditor only)
router.get('/statistics',
    authenticateToken,
    authorizeRoles('AUDITOR', 'ADMIN'),
    auditController.getAuditStatistics
);

// Generate compliance report (Auditor only)
router.get('/compliance-report',
    authenticateToken,
    authorizeRoles('AUDITOR', 'ADMIN'),
    auditController.generateComplianceReport
);

module.exports = router;
