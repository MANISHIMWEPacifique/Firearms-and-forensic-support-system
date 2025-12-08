const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');

// Login - Step 1: Username/Password verification
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get user from database
        const result = await db.query(
            'SELECT id, username, password_hash, full_name, role, unit_id, unit_confirmed, totp_enabled, totp_secret, is_active FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate temporary token for 2FA verification
        const tempToken = jwt.sign(
            { userId: user.id, temp: true },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // If 2FA not enabled, set it up first
        if (!user.totp_enabled) {
            return res.json({
                success: true,
                message: '2FA setup required',
                requires2FASetup: true,
                tempToken,
                userId: user.id
            });
        }

        // 2FA is enabled, proceed to verification
        res.json({
            success: true,
            message: 'Password verified, enter 2FA code',
            requires2FA: true,
            tempToken,
            userId: user.id
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// Setup 2FA - Generate QR code for first-time users
const setup2FA = async (req, res) => {
    try {
        const { userId } = req.body;

        // Get user
        const result = await db.query(
            'SELECT id, username, full_name, totp_enabled FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `${process.env.TOTP_APP_NAME || 'SafeArms'} (${user.username})`,
            length: 32
        });

        // Store secret temporarily (will be confirmed after first successful verification)
        await db.query(
            'UPDATE users SET totp_secret = $1 WHERE id = $2',
            [secret.base32, user.id]
        );

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            message: '2FA setup initiated',
            qrCode: qrCodeUrl,
            secret: secret.base32,
            manualEntryKey: secret.base32
        });

    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({
            success: false,
            message: '2FA setup failed'
        });
    }
};

// Verify 2FA code
const verify2FA = async (req, res) => {
    try {
        const { userId, token: totpToken } = req.body;

        // Get user with TOTP secret
        const result = await db.query(
            'SELECT id, username, full_name, role, unit_id, unit_confirmed, totp_secret, totp_enabled FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        // Verify TOTP code
        const verified = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: totpToken,
            window: parseInt(process.env.TOTP_WINDOW || 2)
        });

        if (!verified) {
            return res.status(401).json({
                success: false,
                message: 'Invalid 2FA code'
            });
        }

        // Enable 2FA if this was first verification
        if (!user.totp_enabled) {
            await db.query(
                'UPDATE users SET totp_enabled = TRUE WHERE id = $1',
                [user.id]
            );
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT tokens
        const accessToken = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role,
                unitId: user.unit_id,
                unitConfirmed: user.unit_confirmed
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({
            success: false,
            message: '2FA verification failed'
        });
    }
};

// Refresh access token
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required'
            });
        }

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }

            // Get user
            const result = await db.query(
                'SELECT id, username, role FROM users WHERE id = $1 AND is_active = TRUE',
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'User not found or inactive'
                });
            }

            const user = result.rows[0];

            // Generate new access token
            const accessToken = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                accessToken
            });
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
};

// Logout (client-side token deletion, but we log it)
const logout = async (req, res) => {
    try {
        // Log the logout action
        await db.query(
            'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
            [req.user.id, 'LOGOUT', JSON.stringify({ timestamp: new Date() })]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
};

module.exports = {
    login,
    setup2FA,
    verify2FA,
    refreshToken,
    logout
};
