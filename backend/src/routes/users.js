const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles, auditLog } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validator');

// Get all users (Admin only)
router.get('/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    userController.getAllUsers
);

// Get single user
router.get('/:id',
    authenticateToken,
    authorizeRoles('ADMIN', 'HQ_FIREARM_COMMANDER'),
    userController.getUserById
);

// Create new user (Admin only)
router.post('/',
    authenticateToken,
    authorizeRoles('ADMIN'),
    auditLog('CREATE_USER', 'user'),
    [
        body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        body('fullName').trim().notEmpty().withMessage('Full name is required'),
        body('role').isIn(['ADMIN', 'HQ_FIREARM_COMMANDER', 'STATION_COMMANDER', 'FORENSIC_ANALYST', 'AUDITOR'])
            .withMessage('Invalid role'),
        body('email').optional().isEmail().withMessage('Invalid email address'),
        body('phone').optional().trim(),
        body('unitId').optional().isInt().withMessage('Invalid unit ID')
    ],
    handleValidationErrors,
    userController.createUser
);

// Update user (Admin only)
router.put('/:id',
    authenticateToken,
    authorizeRoles('ADMIN'),
    auditLog('UPDATE_USER', 'user'),
    [
        body('fullName').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('phone').optional().trim(),
        body('unitId').optional().isInt(),
        body('isActive').optional().isBoolean()
    ],
    handleValidationErrors,
    userController.updateUser
);

// Confirm unit (Station Commander - first login)
router.post('/confirm-unit',
    authenticateToken,
    authorizeRoles('STATION_COMMANDER'),
    [
        body('confirmed').isBoolean().withMessage('Confirmation required')
    ],
    handleValidationErrors,
    userController.confirmUnit
);

// Change password (any authenticated user)
router.post('/change-password',
    authenticateToken,
    auditLog('CHANGE_PASSWORD', 'user'),
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    ],
    handleValidationErrors,
    userController.changePassword
);

module.exports = router;
