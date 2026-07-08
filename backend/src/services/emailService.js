const nodemailer = require('nodemailer');

/**
 * Membuat transporter nodemailer berdasarkan konfigurasi environment.
 * Mendukung SMTP biasa dan service populer (Gmail, Outlook, dsb).
 */
function createTransporter() {
    const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD, MAIL_SECURE } = process.env;

    if (!MAIL_HOST || !MAIL_USER || !MAIL_PASSWORD) {
        return null; // Konfigurasi email belum diatur
    }

    return nodemailer.createTransport({
        host: MAIL_HOST,
        port: parseInt(MAIL_PORT, 10) || 587,
        secure: MAIL_SECURE === 'true', // true untuk port 465 (SSL)
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Untuk development/self-signed cert
        }
    });
}

/**
 * Template HTML email reset password yang branded dan professional.
 * @param {string} fullName    - Nama lengkap user
 * @param {string} resetLink   - URL untuk reset password
 * @returns {string} HTML email
 */
function buildResetPasswordEmail(fullName, resetLink) {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset Password</title>
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family:'Segoe UI',Arial,sans-serif; }
  .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#047857,#10b981); padding:40px 32px; text-align:center; }
  .header img { width:70px; height:auto; margin-bottom:16px; }
  .header h1 { color:#fff; font-size:22px; font-weight:700; margin:0; }
  .header p  { color:rgba(255,255,255,0.85); font-size:13px; margin:8px 0 0; }
  .body  { padding:36px 32px; }
  .greeting { font-size:18px; font-weight:600; color:#0f172a; margin-bottom:12px; }
  .text  { font-size:14px; color:#475569; line-height:1.7; margin-bottom:20px; }
  .btn-wrap  { text-align:center; margin:32px 0; }
  .btn { display:inline-block; background:linear-gradient(135deg,#047857,#10b981); color:#fff !important; text-decoration:none; padding:14px 36px; border-radius:10px; font-size:15px; font-weight:600; letter-spacing:0.02em; box-shadow:0 4px 16px rgba(4,120,87,0.35); }
  .divider { border:none; border-top:1px solid #e2e8f0; margin:24px 0; }
  .link-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; word-break:break-all; font-size:12px; color:#64748b; margin-bottom:20px; }
  .warning-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 16px; font-size:13px; color:#92400e; margin-bottom:20px; }
  .warning-box ul { margin:8px 0 0 16px; padding:0; }
  .warning-box li { margin-bottom:4px; }
  .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center; }
  .footer p { font-size:12px; color:#94a3b8; margin:0 0 4px; }
</style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <h1>Reset Password</h1>
    <p>UPTD Laboratorium Pengujian Banten</p>
  </div>

  <!-- Body -->
  <div class="body">
    <p class="greeting">Halo, ${fullName || 'Pengguna'}!</p>
    <p class="text">
      Kami menerima permintaan untuk mereset password akun Anda di 
      <strong>Sistem Informasi UPTD Laboratorium Pengujian Banten</strong>. 
      Klik tombol di bawah ini untuk membuat password baru.
    </p>

    <div class="btn-wrap">
      <a href="${resetLink}" class="btn">🔑 Reset Password Sekarang</a>
    </div>

    <hr class="divider">

    <p class="text" style="font-size:13px;">
      Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:
    </p>
    <div class="link-box">${resetLink}</div>

    <div class="warning-box">
      <strong>⚠️ Informasi Penting:</strong>
      <ul>
        <li>Link reset password berlaku selama <strong>1 jam</strong> sejak email ini dikirim.</li>
        <li>Jika Anda tidak meminta reset password, abaikan email ini — akun Anda tetap aman.</li>
        <li>Jangan bagikan link ini kepada siapapun.</li>
      </ul>
    </div>

    <p class="text" style="color:#94a3b8; font-size:12px; margin-bottom:0;">
      Email ini dikirim secara otomatis. Mohon jangan membalas email ini.
    </p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>UPTD Pengujian Bahan Konstruksi Bangunan &amp; Informasi Konstruksi</p>
    <p>Dinas Pekerjaan Umum dan Penataan Ruang Provinsi Banten</p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Kirim email reset password ke user.
 * @param {object} options
 * @param {string} options.toEmail  - Alamat email tujuan
 * @param {string} options.fullName - Nama lengkap user
 * @param {string} options.resetLink - URL reset password
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal
 */
async function sendResetPasswordEmail({ toEmail, fullName, resetLink }) {
    const transporter = createTransporter();

    // Jika transporter tidak ada, log ke console (mode development)
    if (!transporter) {
        console.log('');
        console.log('=========================================================');
        console.log('📧  [DEV MODE] Email Reset Password');
        console.log(`    To      : ${toEmail}`);
        console.log(`    Name    : ${fullName}`);
        console.log(`    Link    : ${resetLink}`);
        console.log('=========================================================');
        console.log('');
        return true; // Anggap berhasil di dev mode
    }

    const mailOptions = {
        from: `"UPTD Laboratorium Pengujian" <${process.env.MAIL_USER}>`,
        to: toEmail,
        subject: '🔑 Reset Password - Sistem UPTD Laboratorium Pengujian Banten',
        text: `Halo ${fullName},\n\nKlik link berikut untuk reset password Anda:\n${resetLink}\n\nLink berlaku selama 1 jam.\n\nJika Anda tidak meminta reset password, abaikan email ini.\n\nSalam,\nTim UPTD Laboratorium Pengujian Banten`,
        html: buildResetPasswordEmail(fullName, resetLink)
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email reset password terkirim ke: ${toEmail} | MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`❌ Gagal kirim email reset password ke ${toEmail}:`, error.message);
        throw error; // Re-throw agar controller bisa handle
    }
}

module.exports = {
    sendResetPasswordEmail
};
