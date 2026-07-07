require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function main() {
    console.log('⏳ Mengambil data dari database lokal...');

    const [testTypes] = await db.query('SELECT * FROM test_types');
    const [testCategories] = await db.query('SELECT * FROM test_categories');
    const [services] = await db.query('SELECT * FROM services');

    console.log(`✅ Ditemukan: ${testTypes.length} Tipe Uji, ${testCategories.length} Kategori Uji, ${services.length} Layanan.`);

    const seedCode = `// File ini di-generate otomatis oleh scripts/generateSeedData.js
require('dotenv').config();
const db = require('../src/config/database');

async function main() {
    console.log('🌱 Menjalankan Seeding Database...');

    // 1. Cek apakah data sudah ada
    const [rows] = await db.query('SELECT COUNT(*) as count FROM services');
    if (rows[0].count > 0) {
        console.log('✅ Data services sudah ada. Seeding di-skip untuk mencegah duplikat.');
        return;
    }

    const testTypes = ${JSON.stringify(testTypes, null, 8)};
    const testCategories = ${JSON.stringify(testCategories, null, 8)};
    const services = ${JSON.stringify(services, null, 8)};

    console.log('Memasukkan data test_types...');
    for (const t of testTypes) {
        await db.query('INSERT IGNORE INTO test_types (id, name, created_at) VALUES (?, ?, ?)', [t.id, t.name, t.created_at]);
    }

    console.log('Memasukkan data test_categories...');
    for (const c of testCategories) {
        await db.query('INSERT IGNORE INTO test_categories (id, test_type_id, name, created_at) VALUES (?, ?, ?, ?)', [c.id, c.test_type_id, c.name, c.created_at]);
    }

    console.log('Memasukkan data services...');
    for (const s of services) {
        await db.query('INSERT IGNORE INTO services (id, category_id, test_type_id, name, min_sample, satuan, duration_days, price, method, kan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [s.id, s.category_id, s.test_type_id, s.name, s.min_sample, s.satuan, s.duration_days, s.price, s.method, s.kan, s.created_at]);
    }

    console.log('🎉 Seeding Selesai!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => {
        process.exit(0);
    });
`;

    const seedPath = path.join(__dirname, '..', 'prisma', 'seed.js');
    fs.writeFileSync(seedPath, seedCode, 'utf8');
    
    console.log(`🎉 Berhasil membuat file seed di: ${seedPath}`);
    console.log('🚀 Sekarang saat migrasi di hosting, tabel layanan otomatis terisi!');
    process.exit(0);
}

main().catch((e) => {
    console.error('❌ Gagal mengambil data:', e);
    process.exit(1);
});
