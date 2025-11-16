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
    subject: 'Password Reset Request - Fingerprint-Based Attendance Monitoring System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Fingerprint Attendance System account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Reset Password</a>
        <p style="margin: 20px 0; color: #666; font-size: 14px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border: 1px solid #dee2e6; border-radius: 3px; font-family: monospace; font-size: 12px;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Fingerprint Attendance System - 🔒 Secure Login</p>
      </div>
    `,
  };

  // Always log the email details to console for debugging/fallback
  console.log('=== PASSWORD RESET EMAIL ===');
  console.log('To:', email);
  console.log('Subject:', mailOptions.subject);
  console.log('Reset URL:', resetUrl);
  console.log('Token:', resetToken);
  console.log('===========================');

  // Attempt to send email if Gmail credentials are configured
  if (envConfig.EMAIL_USER && envConfig.EMAIL_PASS) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully via Gmail');
    } catch (error) {
      console.error('❌ Failed to send password reset email via Gmail:', error instanceof Error ? error.message : String(error));
      console.log('📝 Email details logged to console as fallback');
    }
  } else {
    console.log('📧 Gmail credentials not configured - email details logged to console only');
  }
};

export const sendPasswordChangeNotification = async (email: string, name: string) => {
  const mailOptions = {
    from: envConfig.EMAIL_USER,
    to: email,
    subject: 'Password Changed - Fingerprint-Based Attendance Monitoring System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Dear ${name},</p>
        <p>Your password for the Fingerprint Attendance System has been successfully changed.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Fingerprint Attendance System - Security Notification</p>
      </div>
    `,
  };

  // Always log the notification details to console for debugging/fallback
  console.log('=== PASSWORD CHANGE NOTIFICATION ===');
  console.log('To:', email);
  console.log('Name:', name);
  console.log('Subject:', mailOptions.subject);
  console.log('====================================');

  // Attempt to send email if Gmail credentials are configured
  if (envConfig.EMAIL_USER && envConfig.EMAIL_PASS) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Password change notification sent successfully via Gmail');
    } catch (error) {
      console.error('❌ Failed to send password change notification via Gmail:', error instanceof Error ? error.message : String(error));
      console.log('📝 Notification details logged to console as fallback');
    }
  } else {
    console.log('📧 Gmail credentials not configured - notification details logged to console only');
  }
};
