const { validationResult } = require('express-validator');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');


// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d',
    });

const sendTokenResponse = (user, statusCode, res, message) => {
    const token = generateToken(user._id);
    res.status(statusCode).json({
        success: true,
        message,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
        },
    });
};

const createMailTransporter = () =>
    nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,   // Gmail App Password (16 chars)
        },
    });


// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * @desc    Login (admin only — checked against env hash)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    // 1. Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(err => err.msg).join(', ');
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const { email, password } = req.body;

    try {
        // 2. Find user by email
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        
        if (!user) {
            logger.warn(`Login attempt for non-existent user: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Match password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            logger.warn(`Invalid password attempt for user: ${email}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // 4. Check if account is active
        if (!user.isActive) {
            logger.warn(`Deactivated user attempted login: ${email}`);
            return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact the administrator.' });
        }

        // 5. Send success response
        logger.info(`User logged in successfully: ${email}`);
        sendTokenResponse(user, 200, res, 'Login successful. Welcome back.');
    } catch (error) {
        logger.error(`Login Error [${email}]: ${error.message}`, { stack: error.stack });
        next(error); // Pass to centralized error handler
    }
};

/**
 * @desc    Logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (_req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully.', token: null });
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Request password reset — generates token and emails reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 *
 * Security: Always return the same generic response whether the email
 * matches or not (prevents email enumeration).
 */
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const adminEmail    = (process.env.ADMIN_EMAIL || 'mukunda@hkmvizag.org').toLowerCase();
    const recoveryEmail = process.env.RECOVERY_EMAIL || 'prabhavathigudipati5@gmail.com';

    // Generic response used for BOTH found & not-found cases
    const genericOk = () =>
        res.status(200).json({
            success: true,
            message: `If that email is registered, a reset link has been sent to ${recoveryEmail}.`,
        });

    if (!email || typeof email !== 'string')
        return res.status(400).json({ success: false, message: 'Email is required.' });

    // Only process for the admin email — but never leak "not found"
    if (email.toLowerCase() !== adminEmail) return genericOk();

    try {
        const user = await User.findOne({ email: adminEmail });
        if (!user) return genericOk();

        // Generate a cryptographically secure random token
        const rawToken    = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Store hashed token with 15-minute expiry
        user.resetPasswordToken   = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await user.save({ validateBeforeSave: false });

        // Build the frontend reset link
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl    = `${frontendUrl}/reset-password/${rawToken}`;

        // Send email
        const transporter = createMailTransporter();
        await transporter.sendMail({
            from: `"Higher Taste Admin" <${process.env.EMAIL_USER}>`,
            to: recoveryEmail,
            subject: 'Reset Your Password — Higher Taste Ops Hub',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8f9fa;border-radius:12px;">
                    <div style="text-align:center;margin-bottom:24px;">
                        <h1 style="color:#5a141e;font-size:22px;margin:0;">Higher Taste</h1>
                        <p style="color:#888;margin:4px 0 0;font-size:13px;">Catering Ops Hub</p>
                    </div>
                    <div style="background:#fff;border-radius:10px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                        <h2 style="color:#1a1a1a;font-size:18px;margin-top:0;">Reset Your Password</h2>
                        <p style="color:#555;line-height:1.7;font-size:14px;">
                            Hello,<br/><br/>
                            Click the button below to reset your password for the admin account
                            <strong style="color:#5a141e;">${adminEmail}</strong>.
                        </p>
                        <div style="text-align:center;margin:28px 0;">
                            <a href="${resetUrl}"
                               style="background:#5a141e;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color:#888;font-size:13px;line-height:1.6;">
                            ⏰ This link expires in <strong>15 minutes</strong>.<br/>
                            If you didn't request this, you can safely ignore this email — your password won't change.
                        </p>
                        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
                        <p style="color:#bbb;font-size:12px;margin:0;">
                            Or copy this link into your browser:<br/>
                            <a href="${resetUrl}" style="color:#5a141e;word-break:break-all;">${resetUrl}</a>
                        </p>
                    </div>
                </div>
            `,
        });

        logger.info(`Password reset email sent to ${recoveryEmail}`);
        return genericOk();
    } catch (error) {
        logger.error('Forgot Password Error:', error.message);

        // Clean up token so user can retry
        try {
            const user = await User.findOne({ email: adminEmail });
            if (user) {
                user.resetPasswordToken   = undefined;
                user.resetPasswordExpires = undefined;
                await user.save({ validateBeforeSave: false });
            }
        } catch (_) { /* ignore */ }

        res.status(500).json({
            success: false,
            message: 'Failed to send reset email. Please check email configuration in .env.',
        });
    }
};

/**
 * @desc    Reset password using the token from the email link
 * @route   POST /api/auth/reset-password
 * @access  Public
 *
 * Body: { token: string, newPassword: string }
 */
const resetPassword = async (req, res) => {
    const { token: rawToken, newPassword } = req.body;

    if (!rawToken || !newPassword)
        return res.status(400).json({ success: false, message: 'Token and new password are required.' });

    if (newPassword.length < 6)
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    try {
        // Hash the raw token to match what is stored in DB
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Find user with a valid (unexpired) token
        const user = await User.findOne({
            resetPasswordToken:   hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        }).select('+resetPasswordToken +resetPasswordExpires');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token. Please request a new reset link.',
            });
        }

        // Update user record password (pre-save hook will hash this)
        user.password             = newPassword;
        user.resetPasswordToken   = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        logger.info(`Password reset successfully for user: ${user.email}`);

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.',
        });
    } catch (error) {
        logger.error('Reset Password Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during password reset.' });
    }
};

module.exports = { login, logout, getMe, forgotPassword, resetPassword };
