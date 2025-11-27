const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { handleValidationErrors } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');

// Login - Step 1: Username/Password
router.post('/login',
    [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    handleValidationErrors,
    authController.login
);

// Setup 2FA - Generate QR code
router.post('/setup-2fa',
    [
        body('userId').isInt().withMessage('Valid user ID required')
    ],
    handleValidationErrors,
    authController.setup2FA
);

// Verify 2FA code
router.post('/verify-2fa',
    [
        body('userId').isInt().withMessage('Valid user ID required'),
        body('token').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit code required')
    ],
    handleValidationErrors,
    authController.verify2FA
);

// Refresh access token
router.post('/refresh',
    [
        body('refreshToken').notEmpty().withMessage('Refresh token required')
    ],
    handleValidationErrors,
    authController.refreshToken
);

// Logout (requires authentication)
router.post('/logout',
    authenticateToken,
    authController.logout
);

module.exports = router;
