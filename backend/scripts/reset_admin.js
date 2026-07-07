const db = require('../src/config/database');
const bcrypt = require('bcrypt');

async function update() {
    try {
        const hash = await bcrypt.hash('admin123', 12);
        
        // Find existing admins
        const [admins] = await db.query("SELECT id, email FROM users WHERE role = 'admin'");
        
        console.log("Found admins:", admins.map(a => a.email));
        
        if (admins.length > 0) {
            for (let admin of admins) {
                await db.query("UPDATE users SET password = ? WHERE id = ?", [hash, admin.id]);
                console.log(`Password reset for ${admin.email} to 'admin123'`);
            }
        } else {
            console.log("No admins found!");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

update();
