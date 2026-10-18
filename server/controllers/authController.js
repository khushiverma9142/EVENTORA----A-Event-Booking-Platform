const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/email');

const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Register user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                error: 'User already exists'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
            isVerified: false
        });

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        await OTP.deleteMany({
            email,
            action: 'account_verification'
        });

        await OTP.create({
            email,
            otp,
            action: 'account_verification'
        });

        await sendOTPEmail(
            email,
            otp,
            'account_verification'
        );

        return res.status(201).json({
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            email: user.email
        });

    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid credentials'
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Please verify your email before logging in.'
            });
        }

        return res.json({
            message: 'Login successful',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const otpRecord = await OTP.findOne({
            email,
            otp,
            action: 'account_verification'
        });

        if (!otpRecord) {
            return res.status(400).json({
                message: 'Invalid or expired OTP'
            });
        }

        const user = await User.findOneAndUpdate(
            { email },
            { isVerified: true },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        await OTP.deleteMany({
            email,
            action: 'account_verification'
        });

        return res.json({
            message: 'Account verified successfully. You can now log in.',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role)
        });

    } catch (error) {
        return res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};