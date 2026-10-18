const express = require('express');
const router = express.Router();

const {
    registerUser,
    login,
    verifyOTP
} = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);

module.exports = router;