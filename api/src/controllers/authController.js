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

const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Request password reset — generates token and emails reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({ success: false, message: 'There is no user with that email.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Hash token and set to resetPasswordToken field
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set token and expiry (10 minutes)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>You requested a password reset for your account at Higher Taste.</p>
                <p>Click the button below to reset your password. This link is valid for <strong>10 minutes</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #5a141e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #777; word-break: break-all;">${resetUrl}</p>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Token',
                message,
                html,
            });

            res.status(200).json({ success: true, message: 'Email sent successfully.' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return res.status(500).json({ success: false, message: 'Email could not be sent.' });
        }
    } catch (error) {
        logger.error(`Forgot Password Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Reset password using the token from the email link
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Please provide a new password.' });
    }

    // Hash the token from URL to compare with hashed token in DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        }).select('+password');

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now log in.',
        });
    } catch (error) {
        logger.error(`Reset Password Error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { login, logout, getMe, forgotPassword, resetPassword };
