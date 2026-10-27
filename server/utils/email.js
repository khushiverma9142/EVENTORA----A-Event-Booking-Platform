

const nodemailer = require('nodemailer');
const path = require('path');

// Load the .env file from the server folder
require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send booking confirmation email
const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: `Booking Confirmed: ${eventTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Hi ${userName}!</h2>
                    <p>Your booking for
                    <strong>${eventTitle}</strong>
                    is successfully confirmed.</p>
                    <p>Thank you for choosing Eventora.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('Booking email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Booking email failed:', error.message);
        throw error;
    }
};

// Send signup or booking OTP email
const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const isAccountVerification =
            type === 'account_verification';

        const title = isAccountVerification
            ? 'Verify your Eventora Account'
            : 'Eventora Booking Verification';

        const message = isAccountVerification
            ? 'Use this OTP to verify your new Eventora account.'
            : 'Use this OTP to verify your event booking.';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: title,
            html: `
                <div style="font-family: Arial, sans-serif;
                            text-align: center; padding: 20px;">
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <div style="margin: 20px auto; padding: 15px;
                                font-size: 24px; font-weight: bold;
                                background: #f4f4f4;
                                letter-spacing: 5px;">
                        ${otp}
                    </div>
                    <p>This code expires in 5 minutes.</p>
                    <p>If you didn't request this, ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(
            'OTP email accepted by mail server:',
            info.messageId
        );

        console.log('OTP recipient:', userEmail);

        return info;
    } catch (error) {
        console.error('OTP email failed:', error.message);
        throw error;
    }
};

// Export both functions
module.exports = {
    sendBookingEmail,
    sendOTPEmail
};
