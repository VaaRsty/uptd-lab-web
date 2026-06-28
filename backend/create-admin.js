// backend/create-admin.js
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

(async () => {
    try {
        const db = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '', // kosongkan jika default Laragon
            database: 'uptd_lab'
        });

        // Data admin baru
        const email = 'admin@uptd.go.id';
        const password = 'admin123';
        const fullName = 'Super Admin UPTD';
        const role = 'admin';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✅ Hash generated:', hashedPassword);

        // Cek apakah email sudah ada
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            console.log(`⚠️ Email ${email} sudah terdaftar. Update password...`);
            await db.execute(
                'UPDATE users SET password = ?, full_name = ?, role = ? WHERE email = ?',
                [hashedPassword, fullName, role, email]
            );
            console.log(`✅ Password updated for ${email}`);
        } else {
            // Insert admin baru
            await db.execute(
                `INSERT INTO users 
                (email, password, full_name, role, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())`,
                [email, hashedPassword, fullName, role]
            );
            console.log(`✅ Admin baru berhasil dibuat!`);
        }

        console.log('=================================');
        console.log('📧 Email   :', email);
        console.log('🔑 Password:', password);
        console.log('👤 Role    :', role);
        console.log('=================================');

        await db.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();