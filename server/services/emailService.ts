import nodemailer from 'nodemailer';

interface StoredVerificationCode {
  code: string;
  email: string;
  expires: number;
  attempts: number;
  lastSentAt: number;
}

const MAX_OTP_ATTEMPTS = 5;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds per email

// In-memory store for verification codes
const verificationCodes = new Map<string, StoredVerificationCode>();

// Escape HTML entities to prevent injection in email templates
function escapeHtml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Resolve sender address whether SMTP_FROM is a plain email, quoted email, or "Name <email>"
function getFromAddress(): string {
  const raw = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  if (!raw || raw === 'your-email@gmail.com') {
    return '"BukSU AI Assistant" <noreply@buksu.edu.ph>';
  }
  if (raw.includes('<') && raw.includes('>')) {
    return raw;
  }
  return `"BukSU AI Assistant" <${raw}>`;
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password',
    },
  });
}

// Send verification code email
export async function sendVerificationCode(email: string): Promise<{
  success: boolean;
  message: string;
  resendAvailableInSeconds?: number;
  retryAfterSeconds?: number;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = verificationCodes.get(normalizedEmail);
  const now = Date.now();

  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message: `Please wait ${retryAfterSeconds} seconds before requesting another verification code.`,
      retryAfterSeconds,
    };
  }

  const code = generateVerificationCode();
  const expires = now + OTP_EXPIRY_MS;

  verificationCodes.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expires,
    attempts: 0,
    lastSentAt: now,
  });

  try {
    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: getFromAddress(),
      to: normalizedEmail,
      subject: 'Email Verification Code - BukSU Chatbot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #001C38; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">BukSU AI Assistant</h1>
            <p style="margin: 6px 0 0; color: #fbbf24; font-size: 13px; font-weight: 600; text-transform: uppercase;">Email Verification</p>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #475569; line-height: 1.6;">
              Please enter the 6-digit verification code below to verify your email address:
            </p>
            <div style="background: #f8fafc; border: 2px solid #001C38; padding: 20px; margin: 22px 0; text-align: center; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; color: #001C38; letter-spacing: 6px;">${code}</span>
            </div>
            <p style="color: #64748b; line-height: 1.6; font-size: 13px;">
              This code will expire in <strong>10 minutes</strong>. For your security, never share this code with anyone.
            </p>
          </div>
          <div style="background: #001C38; color: white; padding: 16px; text-align: center;">
            <p style="margin: 0; font-size: 12px;">
              © ${new Date().getFullYear()} Bukidnon State University. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);

    return {
      success: true,
      message: 'Verification code sent to your email address. Please check your inbox.',
      resendAvailableInSeconds: 60,
    };
  } catch (error) {
    verificationCodes.delete(normalizedEmail);
    const err = error as any;
    console.error("Failed to send verification email:", err);

    if (err.code === 'EAUTH') {
      return {
        success: false,
        message: 'Email service authentication failed. Please check SMTP credentials (or authorize your IP in Brevo).',
      };
    } else if (err.code === 'ECONNECTION') {
      return {
        success: false,
        message: 'Email server connection failed. Please check your SMTP settings.',
      };
    } else if (err.code === 'ESOCKET') {
      return {
        success: false,
        message: 'Network socket error while connecting to email server.',
      };
    } else {
      return {
        success: false,
        message: `Failed to send verification email: ${err.message || 'Unknown error'}`,
      };
    }
  }
}

// Send email informing user that registration is pending Main Admin approval
export async function sendPendingApprovalEmail(email: string, name: string): Promise<{ success: boolean; message: string }> {
  try {
    const safeName = escapeHtml(name || 'Administrator');
    const transporter = createTransporter();
    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: 'Admin Account Pending Approval - BukSU Chatbot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #001C38; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">BukSU AI Assistant</h1>
            <p style="margin: 6px 0 0; color: #f59e0b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Admin Portal</p>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Hello ${safeName},</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">
              Your sign-up request for the <strong>BukSU AI Assistant Admin Portal</strong> has been received and registered.
            </p>
            <div style="background: #eff6ff; border-left: 4px solid #001C38; padding: 18px; margin: 22px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e3a8a; font-weight: 600; font-size: 15px;">
                "Wait for the main admin to allow your sign in, as of now always check your email"
              </p>
            </div>
            <p style="color: #64748b; line-height: 1.6; font-size: 13px;">
              The Main Administrator will review your account and assign your administrative roles &amp; permissions. Once approved, you will receive another email confirmation granting you access to sign in.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; padding: 16px; text-align: center; font-size: 12px;">
            © ${new Date().getFullYear()} Bukidnon State University. All rights reserved.
          </div>
        </div>
      `,
    };

    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log(`[Email Service - Dev] Pending approval email prepared for ${email}`);
      return { success: true, message: 'Pending approval email logged.' };
    }

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Pending approval email sent successfully.' };
  } catch (err: any) {
    console.error("Error sending pending approval email:", err);
    return { success: false, message: err?.message || 'Failed to send pending approval email' };
  }
}

// Send email informing user that account has been approved by Main Admin
export async function sendApprovalConfirmationEmail(email: string, name: string, customMessage?: string): Promise<{ success: boolean; message: string }> {
  try {
    const safeName = escapeHtml(name || 'Administrator');
    const safeCustomMessage = customMessage ? escapeHtml(customMessage) : '';
    const transporter = createTransporter();
    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: 'Account Approved - BukSU Chatbot Admin Access Granted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background: #001C38; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; letter-spacing: 0.5px;">BukSU AI Assistant</h1>
            <p style="margin: 6px 0 0; color: #10b981; font-size: 13px; font-weight: 600; text-transform: uppercase;">Account Approved</p>
          </div>
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Welcome, ${safeName}!</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">
              Great news! Your account has been reviewed and approved by the Main Administrator. Your role and permissions have been configured.
            </p>
            ${safeCustomMessage ? `
            <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0 0 6px; color: #92400e; font-size: 11px; font-weight: bold; text-transform: uppercase;">Message from Main Administrator:</p>
              <p style="margin: 0; color: #334155; font-size: 14px; font-style: italic;">"${safeCustomMessage}"</p>
            </div>
            ` : ''}
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">
              You can now sign in to the Admin Dashboard using your registered email and password.
            </p>
            <div style="text-align: center; margin: 26px 0;">
              <a href="/admin/login" style="background: #001C38; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Sign In to Admin Panel
              </a>
            </div>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; padding: 16px; text-align: center; font-size: 12px;">
            © ${new Date().getFullYear()} Bukidnon State University. All rights reserved.
          </div>
        </div>
      `,
    };

    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log(`[Email Service - Dev] Approval confirmation email prepared for ${email}`);
      return { success: true, message: 'Approval email logged.' };
    }

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Approval confirmation email sent.' };
  } catch (err: any) {
    console.error("Error sending approval confirmation email:", err);
    return { success: false, message: err?.message || 'Failed to send approval email' };
  }
}

// Verify code with brute-force attempt limit
export function verifyCode(
  email: string,
  code: string
): { success: boolean; message: string; attemptsRemaining?: number } {
  const normalizedEmail = email.trim().toLowerCase();
  const stored = verificationCodes.get(normalizedEmail);

  if (!stored) {
    return { success: false, message: 'No verification code found for this email. Please request a new code.' };
  }

  if (Date.now() > stored.expires) {
    verificationCodes.delete(normalizedEmail);
    return { success: false, message: 'Verification code has expired. Please request a new code.', attemptsRemaining: 0 };
  }

  if (stored.code !== code.trim()) {
    stored.attempts += 1;
    const attemptsRemaining = Math.max(0, MAX_OTP_ATTEMPTS - stored.attempts);

    if (attemptsRemaining === 0) {
      verificationCodes.delete(normalizedEmail);
      return {
        success: false,
        message: 'Too many invalid verification attempts. Please request a new code.',
        attemptsRemaining: 0,
      };
    }

    verificationCodes.set(normalizedEmail, stored);
    return {
      success: false,
      message: `Invalid verification code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining.`,
      attemptsRemaining,
    };
  }

  // Code is valid, remove it
  verificationCodes.delete(normalizedEmail);
  return { success: true, message: 'Code verified successfully.' };
}

// Clean up expired codes
export function cleanupExpiredCodes(): void {
  const now = Date.now();
  verificationCodes.forEach((data, email) => {
    if (now > data.expires) {
      verificationCodes.delete(email);
    }
  });
}

setInterval(cleanupExpiredCodes, 5 * 60 * 1000);
