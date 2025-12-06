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

/**
 * Send corruption alert email for fingerprint data integrity issues
 */
export const sendTeacherWelcomeEmail = async (email: string, teacherName: string) => {
  const mailOptions = {
    from: envConfig.EMAIL_USER,
    to: email,
    subject: 'Welcome to the Fingerprint-Based Attendance Monitoring System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
          <h1 style="margin: 0;">Welcome to Our System!</h1>
        </div>
        <div style="border: 1px solid #dee2e6; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
          <h2 style="color: #333;">Hello ${teacherName},</h2>
          <p>Welcome to the Fingerprint-Based Attendance Monitoring System! We're excited to have you join our educational community.</p>

          <h3 style="color: #007bff;">System Overview</h3>
          <p>Our system provides a comprehensive solution for managing student attendance using advanced fingerprint technology. As a teacher, you'll have access to powerful tools to:</p>
          <ul>
            <li>Manage your student roster</li>
            <li>Mark attendance efficiently</li>
            <li>Generate detailed reports</li>
            <li>Monitor attendance patterns</li>
            <li>Communicate with administrators</li>
          </ul>

          <h3 style="color: #007bff;">Quick Start Guide</h3>
          <ol>
            <li><strong>Login:</strong> Use your email and password to access the teacher portal</li>
            <li><strong>Student Management:</strong> Add and manage your students' information</li>
            <li><strong>Attendance Marking:</strong> Use the kiosk to record attendance</li>
            <li><strong>Reports:</strong> View attendance summaries and generate reports</li>
            <li><strong>Settings:</strong> Customize your preferences and system settings</li>
          </ol>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #495057;"><strong>Important Notes:</strong></p>
            <ul style="margin: 10px 0 0 0; color: #495057;">
              <li>Keep your login credentials secure</li>
              <li>Ensure student fingerprint data is enrolled accurately</li>
              <li>Regular attendance monitoring helps improve student engagement</li>
              <li>Contact support if you encounter any issues</li>
            </ul>
          </div>

          <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>

          <p>Best regards,<br>The Attendance System Team</p>

          <hr>
          <p style="color: #666; font-size: 12px;">Fingerprint-Based Attendance Monitoring System - Professional Educational Tools</p>
        </div>
      </div>
    `,
  };

  // Always log the email details to console for debugging/fallback
  console.log('=== TEACHER WELCOME EMAIL ===');
  console.log('To:', email);
  console.log('Teacher Name:', teacherName);
  console.log('Subject:', mailOptions.subject);
  console.log('=============================');

  // Attempt to send email if Gmail credentials are configured
  if (envConfig.EMAIL_USER && envConfig.EMAIL_PASS) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Teacher welcome email sent successfully via Gmail');
    } catch (error) {
      console.error('❌ Failed to send teacher welcome email via Gmail:', error instanceof Error ? error.message : String(error));
      console.log('📝 Email details logged to console as fallback');
    }
  } else {
    console.log('📧 Gmail credentials not configured - email details logged to console only');
  }
};

export const sendFingerprintCorruptionAlert = async (
  recipientEmail: string,
  corruptionDetails: {
    type: 'student' | 'staff';
    identifier: string;
    corruptionCount: number;
    totalCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }
) => {
  const { type, identifier, corruptionCount, totalCount, riskLevel } = corruptionDetails;

  const riskColors = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    critical: '#dc3545'
  };

  const riskColor = riskColors[riskLevel];

  const mailOptions = {
    from: envConfig.EMAIL_USER,
    to: recipientEmail,
    subject: `🚨 ${riskLevel.toUpperCase()} - Fingerprint Data Corruption Alert`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${riskColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">🔒 Fingerprint Data Corruption Alert</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Risk Level: ${riskLevel.toUpperCase()}</p>
        </div>
        <div style="border: 1px solid #dee2e6; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
          <p><strong>Alert Details:</strong></p>
          <ul>
            <li><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Records</li>
            <li><strong>Identifier:</strong> ${identifier}</li>
            <li><strong>Corrupted Records:</strong> ${corruptionCount}</li>
            <li><strong>Total Records:</strong> ${totalCount}</li>
            <li><strong>Corruption Rate:</strong> ${((corruptionCount / totalCount) * 100).toFixed(2)}%</li>
          </ul>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #495057;"><strong>Recommended Actions:</strong></p>
            <ul style="margin: 10px 0 0 0; color: #495057;">
              <li>Check system logs for detailed error information</li>
              <li>Run data integrity verification</li>
              <li>Consider re-enrolling affected ${type}s</li>
              <li>Contact system administrator if corruption persists</li>
            </ul>
          </div>

          <p style="color: #6c757d; font-size: 12px;">
            This alert was generated automatically by the Fingerprint Attendance System monitoring service.
          </p>
        </div>
      </div>
    `,
  };

  // Always log the alert details to console for debugging/fallback
  console.log('=== FINGERPRINT CORRUPTION ALERT ===');
  console.log('To:', recipientEmail);
  console.log('Subject:', mailOptions.subject);
  console.log('Type:', type);
  console.log('Identifier:', identifier);
  console.log('Corrupted:', corruptionCount);
  console.log('Total:', totalCount);
  console.log('Risk Level:', riskLevel);
  console.log('=====================================');

  // Attempt to send email if Gmail credentials are configured
  if (envConfig.EMAIL_USER && envConfig.EMAIL_PASS) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Fingerprint corruption alert sent successfully via Gmail');
    } catch (error) {
      console.error('❌ Failed to send fingerprint corruption alert via Gmail:', error instanceof Error ? error.message : String(error));
      console.log('📝 Alert details logged to console as fallback');
    }
  } else {
    console.log('📧 Gmail credentials not configured - alert details logged to console only');
  }
};
