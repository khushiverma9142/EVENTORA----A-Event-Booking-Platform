
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

// Generate JWT token
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Register user
exports.registerUser = async (req, res) => {
    let user = null;

    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email, and password are required.'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: 'Please enter a valid email address.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userExists = await User.findOne({
            email: normalizedEmail
        });

        if (userExists) {
            return res.status(400).json({
                message: userExists.isVerified
                    ? 'User already exists. Please log in.'
                    : 'An account already exists with this email. Please verify your account or use another email.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'user',
            isVerified: false
        });

        // Generate six-digit OTP
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // Remove previous verification OTPs
        await OTP.deleteMany({
            email: normalizedEmail,
            action: 'account_verification'
        });

        // Save OTP
        await OTP.create({
            email: normalizedEmail,
            otp,
            action: 'account_verification'
        });

        // Send OTP email
        try {
            await sendOTPEmail(
                normalizedEmail,
                otp,
                'account_verification'
            );
        } catch (emailError) {
            console.error(
                'Failed to send signup OTP:',
                emailError.message
            );

            // Clean up the newly created unverified account
            await OTP.deleteMany({
                email: normalizedEmail,
                action: 'account_verification'
            });

            await User.deleteOne({
                _id: user._id,
                isVerified: false
            });

            return res.status(500).json({
                message: 'Unable to send OTP email. Please check the email configuration and try again.'
            });
        }

        // Respond only after sendMail succeeds
        return res.status(201).json({
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            email: normalizedEmail
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        return res.status(500).json({
            message: 'Registration failed. Please try again.'
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid credentials.'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid credentials.'
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Please verify your email before logging in.'
            });
        }

        return res.status(200).json({
            message: 'Login successful',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            message: 'Server error during login.'
        });
    }
};

// Verify signup OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: 'Email and OTP are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedOTP = String(otp).trim();

        const otpRecord = await OTP.findOne({
            email: normalizedEmail,
            otp: normalizedOTP,
            action: 'account_verification'
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: 'Invalid or expired OTP.'
            });
        }

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        user.isVerified = true;
        await user.save();

        await OTP.deleteMany({
            email: normalizedEmail,
            action: 'account_verification'
        });

        return res.status(200).json({
            message: 'Account verified successfully. You can now log in.',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });

    } catch (error) {
        console.error('OTP verification error:', error.message);

        return res.status(500).json({
            message: 'Server error during OTP verification.'
        });
    }
};
