// types/email.types.ts
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Add OTP interface
export interface OTPOptions {
  to: string;
  username: string;
  otp: string;
  brandName?: string;
  purpose?: "verification" | "login" | "reset-password" | "signup";
}

// Add Notification interface
export interface NotificationOptions {
  to: string;
  username: string;
  subject: string;
  content: string;
  brandName?: string;
}

import { env } from "@/utils/env-config.util";
// services/emailService.ts
import nodemailer, { Transporter } from "nodemailer";

class EmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(config: EmailConfig) {
    this.defaultFrom = config.from;

    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        cc: options.cc
          ? Array.isArray(options.cc)
            ? options.cc.join(", ")
            : options.cc
          : undefined,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    emails: EmailOptions[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const email of emails) {
      try {
        await this.sendEmail(email);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    return results;
  }

  /**
   * Send welcome email template
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const welcomeOptions: EmailOptions = {
      to,
      subject: "Welcome to Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome ${userName}!</h2>
          <p>Thank you for joining our platform. We're excited to have you on board.</p>
          <p>Here are some next steps to get you started:</p>
          <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Connect with other users</li>
          </ul>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Team</p>
        </div>
      `,
      text: `Welcome ${userName}! Thank you for joining our platform. We're excited to have you on board.`,
    };

    return this.sendEmail(welcomeOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    resetUrl: string
  ): Promise<boolean> {
    const resetOptions: EmailOptions = {
      to,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}?token=${resetToken}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}?token=${resetToken}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
      text: `Password reset requested. Visit this link to reset your password: ${resetUrl}?token=${resetToken}`,
    };

    return this.sendEmail(resetOptions);
  }

  /**
   * Verify email connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email service connection verified successfully");
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }
  /**
   * Get purpose text for OTP email
   */
  private getOTPPurposeText(purpose: string): string {
    switch (purpose) {
      case "verification":
        return "Please use the following OTP to verify your account:";
      case "login":
        return "Please use the following OTP to complete your login:";
      case "reset-password":
        return "Please use the following OTP to reset your password:";
      case "signup":
        return "Please use the following OTP to complete your registration:";
      default:
        return "Please use the following OTP to complete your request:";
    }
  }
  /**
   * Send OTP email
   */
  async sendOTP(options: OTPOptions): Promise<boolean> {
    const {
      to,
      username,
      otp,
      brandName = "Your Company",
      purpose = "verification",
    } = options;

    const purposeText = this.getOTPPurposeText(purpose);
    const subject = `Your OTP Code - ${
      purpose.charAt(0).toUpperCase() + purpose.slice(1)
    }`;

    const htmlTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>OTP Verification</title>
    <style type="text/css">
        * { font-family: Arial, sans-serif; box-sizing: border-box; }
        body { width: 100%; margin: 0; background-color: #fafafa; }
        .email-wrapper { width: 100%; background-color: #fafafa; }
        .email-body { background-color: #FFFFFF; }
        .email-body_inner { width: 570px; margin: 0 auto; }
        .content-cell { padding: 35px; }
        .email-footer { width: 570px; margin: 0 auto; text-align: center; }
        h1 { margin-top: 0; font-size: 18px; font-weight: bold; color: #333; }
        p { margin: 10px 0; font-size: 14px; color: #555; }
        .otp-code { 
            font-size: 24px; 
            font-weight: bold; 
            color: #4185f4; 
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            letter-spacing: 3px;
        }
        .brand-name { color: #333; font-size: 16px; }
        .center { text-align: center; }
        
        @media only screen and (max-width: 600px) {
            .email-body_inner, .email-footer { width: 100% !important; }
            .content-cell { padding: 20px !important; }
        }
    </style>
</head>
<body>
    <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table class="email-content" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="email-body" width="100%">
                            <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="content-cell">
                                        <h1>One-Time Password</h1>
                                        <p>Dear ${username},</p>
                                        <p>${purposeText}</p>
                                        
                                        <div class="otp-code">${otp}</div>
                                        
                                        <p><strong>Important:</strong></p>
                                        <ul>
                                            <li>This OTP is valid for 10 minutes only</li>
                                            <li>Do not share this code with anyone</li>
                                            <li>If you didn't request this, please ignore this email</li>
                                        </ul>
                                        
                                        <p>Thanks,<br>The ${brandName} Team</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table class="email-footer" align="center" width="570" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="content-cell">
                                        <p class="center brand-name">${brandName}, Inc.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const otpOptions: EmailOptions = {
      to,
      subject,
      html: htmlTemplate,
      text: `Your OTP code is: ${otp}. This code is valid for 10 minutes. If you didn't request this, please ignore this email.`,
    };

    return this.sendEmail(otpOptions);
  }

  /**
   * Send notification email
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    const {
      to,
      username,
      subject,
      content,
      brandName = "Your Company",
    } = options;

    const htmlTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Notification</title>
    <style type="text/css">
        * {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            width: 100% !important;
            margin: 0;
            background-color: #f5f7f9;
            -webkit-text-size-adjust: none;
        }
        
        .email-wrapper {
            width: 100%;
            background-color: #f5f7f9;
        }
        
        .email-body {
            background-color: #ffffff;
        }
        
        .email-body_inner {
            width: 570px;
            margin: 0 auto;
        }
        
        .email-footer {
            width: 570px;
            margin: 0 auto;
            text-align: center;
        }
        
        .content-cell {
            padding: 35px;
        }
        
        h1 {
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: 600;
            color: #17312b;
        }
        
        p {
            margin: 0 0 15px 0;
            font-size: 14px;
            line-height: 1.5;
            color: #333333;
        }
        
        .content {
            font-weight: 500;
            color: #17312b;
        }
        
        .footer-brand {
            font-size: 16px;
            font-weight: 600;
            color: #17312b;
        }
        
        @media only screen and (max-width: 600px) {
            .email-body_inner,
            .email-footer {
                width: 100% !important;
            }
            .content-cell {
                padding: 20px !important;
            }
        }
    </style>
</head>
<body>
    <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="email-body" width="100%">
                            <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="content-cell">
                                        <h1>Notification</h1>
                                        <p>Dear ${username},</p>
                                        <p>You received notification:</p>
                                        <p class="content">${content}</p>
                                        <p>Thanks,<br>The ${brandName} Team</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <table class="email-footer" align="center" width="570" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td class="content-cell">
                                        <p class="footer-brand">${brandName}, Inc.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const notificationOptions: EmailOptions = {
      to,
      subject,
      html: htmlTemplate,
      text: `Dear ${username}, You received notification: ${content}. Thanks, The ${brandName} Team`,
    };

    return this.sendEmail(notificationOptions);
  }
}

// config/email.config.ts

export const getEmailConfig = (): EmailConfig => {
  return {
    host: env.EMAIL_HOST!,
    port: env.EMAIL_PORT!,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER!,
      pass: env.EMAIL_PASS!,
    },
    from: env.EMAIL_FROM!,
  };
};

// Initialize email service
export const emailService = new EmailService(getEmailConfig());
