const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"Ada İmparatorluğu" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Şifre Sıfırlama - Ada İmparatorluğu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🏝️</span>
          <h1 style="color: #f1f5f9; font-size: 22px; margin: 8px 0 0;">Ada İmparatorluğu</h1>
        </div>
        <div style="background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="color: #f1f5f9; font-size: 18px; margin: 0 0 12px;">Şifre Sıfırlama Talebi</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.<br/>
            Bu link <strong style="color: #f59e0b;">1 saat</strong> geçerlidir.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}"
               style="display: inline-block; background: linear-gradient(135deg,#3b82f6,#06b6d4); color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
              🔑 Şifremi Sıfırla
            </a>
          </div>
          <p style="color: #475569; font-size: 12px; margin: 0;">
            Bu emaili siz talep etmediyseniz görmezden gelebilirsiniz.
          </p>
          <p style="color: #334155; font-size: 11px; margin: 8px 0 0; word-break: break-all;">
            Link: ${resetUrl}
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
