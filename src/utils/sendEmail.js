const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create a transporter
    // For production, use a real SMTP service like SendGrid, Mailgun, etc.
    // For development, we can use Ethereal Email or just log to console if no creds

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.log(`Email failed: ${error.message}`);
        console.log(`Target: ${options.email}`);
        // Log content to console for testing
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.message}`);
        // Do not throw error so the controller flow continues
    }
};

module.exports = sendEmail;
