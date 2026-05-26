const nodemailer = require('nodemailer');

/**
 * Reusable utility to send emails using Gmail SMTP
 * @param {Object} options - { email, subject, message, html }
 */
const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Gmail App Password
        },
    });

    // Define email options
    const mailOptions = {
        from: `"Higher Taste" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
