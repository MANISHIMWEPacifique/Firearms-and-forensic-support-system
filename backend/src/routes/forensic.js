const express = require('express');
const router = express.Router();
const forensicController = require('../controllers/forensicController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Advanced forensic search (Forensic Analyst, HQ Commander, Auditor)
router.get('/search',
    authenticateToken,
    authorizeRoles('FORENSIC_ANALYST', 'HQ_FIREARM_COMMANDER', 'AUDITOR'),
    forensicController.forensicSearch
);

// Cross-unit custody timeline (Forensic Analyst)
router.get('/timeline',
    authenticateToken,
    authorizeRoles('FORENSIC_ANALYST', 'HQ_FIREARM_COMMANDER', 'AUDITOR'),
    forensicController.getCrossUnitTimeline
);

// Get investigation summary for a firearm (Forensic Analyst)
router.get('/investigation/:firearmId',
    authenticateToken,
    authorizeRoles('FORENSIC_ANALYST', 'HQ_FIREARM_COMMANDER'),
    forensicController.getInvestigationSummary
);

module.exports = router;
