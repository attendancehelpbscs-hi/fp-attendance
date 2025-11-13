import nodemailer from 'nodemailer';
import { envConfig } from '../config/environment.config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: envConfig.EMAIL_USER,
    pass: envConfig.EMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetUrl = `${envConfig.FRONTEND_URL}/staff/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: envConfig.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Bio Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Bio Attendance System account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Bio Attendance System - Secure Login</p>
      </div>
    `,
  };

  // For testing purposes, log the email instead of sending
  console.log('=== PASSWORD RESET EMAIL ===');
  console.log('To:', email);
  console.log('Subject:', mailOptions.subject);
  console.log('Reset URL:', resetUrl);
  console.log('Token:', resetToken);
  console.log('===========================');

  // Uncomment the line below when email credentials are properly configured
  // await transporter.sendMail(mailOptions);
};

export const sendPasswordChangeNotification = async (email: string, name: string) => {
  const mailOptions = {
    from: envConfig.EMAIL_USER,
    to: email,
    subject: 'Password Changed - Bio Attendance System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Dear ${name},</p>
        <p>Your password for the Bio Attendance System has been successfully changed.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Bio Attendance System - Security Notification</p>
      </div>
    `,
  };

  // For testing purposes, log the notification instead of sending
  console.log('=== PASSWORD CHANGE NOTIFICATION ===');
  console.log('To:', email);
  console.log('Name:', name);
  console.log('Subject:', mailOptions.subject);
  console.log('====================================');

  // Uncomment the line below when email credentials are properly configured
  // await transporter.sendMail(mailOptions);
};
