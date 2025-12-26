
import nodemailer from 'nodemailer';

type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

const smtpOptions = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};

export const sendEmail = async (data: EmailPayload) => {
    try {
        const transporter = nodemailer.createTransport({
            ...smtpOptions,
        });

        await transporter.sendMail({
            from: process.env.SMTP_FROM_EMAIL,
            ...data,
        });
    } catch (error) {
        console.error("Error sending email:", error);
        // We will log the error but not re-throw it to avoid blocking the registration process.
    }
};

export const getLoginCredentialsEmailTemplate = (phoneNumber: string, password: string, loginUrl: string) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your NIB Training Account Credentials</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                padding: 20px;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 5px;
            }
            .header {
                background-color: #2e4c3d;
                color: #fff;
                padding: 10px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }
            .content {
                padding: 20px;
            }
            .credentials {
                background-color: #f9f9f9;
                border: 1px solid #eee;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .credentials p {
                margin: 5px 0;
            }
            .credentials strong {
                display: inline-block;
                width: 120px;
            }
            .button {
                display: inline-block;
                background-color: #4a6e3a;
                color: #fff;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
            }
            .footer {
                margin-top: 20px;
                text-align: center;
                font-size: 0.9em;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Welcome to NIB Training Platform!</h2>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>An account has been created for you on the NIB Training Platform. Please use the following credentials to log in.</p>
                
                <div class="credentials">
                    <p><strong>Login ID:</strong> ${phoneNumber}</p>
                    <p><strong>Password:</strong> ${password}</p>
                </div>

                <p>It is strongly recommended to change your password after your first login.</p>
                
                <a href="${loginUrl}" class="button" style="color: #fff;">Click Here to Login</a>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
