require('dotenv').config({ path: 'api/.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '',
    },
});

transporter.verify(function (error, success) {
    if (error) {
        console.log("Transporter error:", error);
    } else {
        console.log("Server is ready to take our messages");
    }
});
