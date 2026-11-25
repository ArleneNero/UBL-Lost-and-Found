import { env } from "../config/env.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class EmailService {
  /**
   * Dispatches an HTML email through the Resend HTTP API without logging sensitive body contents.
   */
  private async dispatchResendEmail(
    toEmail: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    const apiKey = (env.RESEND_API_KEY || "").trim();
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured; skipping email dispatch.");
      return false;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: [toEmail],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Resend API error:", errorData);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Failed to send email via Resend:", err);
      return false;
    }
  }

  async sendPasswordResetEmail(toEmail: string, resetUrl: string, fullName: string): Promise<boolean> {
    const safeName = escapeHtml(fullName);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f8fb; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #0050c8; padding: 28px 24px; text-align: center; color: #ffffff; }
    .title { font-size: 20px; font-weight: 700; margin: 0; }
    .subtitle { font-size: 13px; opacity: 0.85; margin-top: 6px; }
    .body { padding: 32px 28px; color: #1e293b; line-height: 1.6; font-size: 14px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background-color: #0050c8; color: #ffffff !important; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-size: 14px; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">UBL LostnFound</h1>
      <p class="subtitle">Layanan Barang Temuan Kampus Universitas Budi Luhur</p>
    </div>
    <div class="body">
      <p>Halo, <strong>${safeName}</strong>!</p>
      <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun mahasiswa Anda. Klik tombol di bawah ini untuk membuat kata sandi baru:</p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn">Atur Ulang Kata Sandi</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Tautan ini hanya berlaku selama <strong>30 menit</strong>. Jika Anda tidak merasa meminta pengaturan ulang kata sandi, Anda dapat mengabaikan email ini dengan aman.</p>
      <p style="font-size: 11px; color: #94a3b8; word-break: break-all; margin-top: 20px;">
        Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban Anda:<br>
        <a href="${resetUrl}" style="color: #0050c8;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Universitas Budi Luhur — Pos Pengajaran Terpadu.
    </div>
  </div>
</body>
</html>
    `;

    return this.dispatchResendEmail(
      toEmail,
      "Atur Ulang Kata Sandi Akun — UBL LostnFound",
      html
    );
  }

  /**
   * Sends a 6-digit registration verification OTP email to a student's official campus inbox.
   */
  async sendRegistrationOtpEmail(
    toEmail: string,
    otpCode: string,
    fullName: string,
    nim: string
  ): Promise<boolean> {
    const safeName = escapeHtml(fullName);
    const safeNim = escapeHtml(nim);
    const safeOtp = escapeHtml(otpCode);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f8fb; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; }
    .header { background: #0050c8; padding: 28px 24px; text-align: center; color: #ffffff; }
    .title { font-size: 20px; font-weight: 700; margin: 0; }
    .subtitle { font-size: 13px; opacity: 0.85; margin-top: 6px; }
    .body { padding: 32px 28px; color: #1e293b; line-height: 1.6; font-size: 14px; }
    .nim-badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; margin: 8px 0 16px; }
    .otp-container { text-align: center; margin: 24px 0; }
    .otp-code { display: inline-block; background-color: #f8fafc; border: 2px dashed #0050c8; color: #0050c8; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; border-radius: 12px; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">UBL LostnFound</h1>
      <p class="subtitle">Layanan Barang Temuan Kampus Universitas Budi Luhur</p>
    </div>
    <div class="body">
      <p>Halo, <strong>${safeName}</strong>!</p>
      <p>Terima kasih telah mendaftar di UBL LostnFound. Gunakan kode verifikasi OTP berikut untuk menyelesaikan pendaftaran akun mahasiswa Anda:</p>
      <div>
        <span class="nim-badge">NIM Terdeteksi: ${safeNim}</span>
      </div>
      <div class="otp-container">
        <span class="otp-code">${safeOtp}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">Kode OTP ini hanya berlaku selama <strong>10 menit</strong> dan bersifat rahasia. Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai petugas.</p>
      <p style="font-size: 12px; color: #64748b;">Jika Anda tidak merasa melakukan pendaftaran akun, abaikan email ini dengan aman.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Universitas Budi Luhur — Pos Pengajaran Terpadu.
    </div>
  </div>
</body>
</html>
    `;

    return this.dispatchResendEmail(
      toEmail,
      "Kode OTP Verifikasi Pendaftaran — UBL LostnFound",
      html
    );
  }
}

export const emailService = new EmailService();
