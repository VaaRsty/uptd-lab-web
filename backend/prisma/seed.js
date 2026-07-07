// File ini di-generate otomatis oleh scripts/generateSeedData.js
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

    const testTypes = [
        {
                "id": 1,
                "type_name": "PENGUJIAN BAHAN",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 2,
                "type_name": "PENGUJIAN KONSTRUKSI",
                "created_at": "2026-02-28T08:55:51.000Z"
        }
];
    const testCategories = [
        {
                "id": 1,
                "test_type_id": 1,
                "category_name": "Agregat",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 2,
                "test_type_id": 1,
                "category_name": "Tanah",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 3,
                "test_type_id": 1,
                "category_name": "Besi / Baja",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 4,
                "test_type_id": 1,
                "category_name": "Mortar / Lainnya",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 5,
                "test_type_id": 2,
                "category_name": "Beton",
                "created_at": "2026-02-28T08:55:51.000Z"
        },
        {
                "id": 6,
                "test_type_id": 2,
                "category_name": "Aspal",
                "created_at": "2026-02-28T08:55:51.000Z"
        }
];
    const services = [
        {
                "id": 1,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Keausan Agregat Dengan Mesin Abrasi Los Angeles",
                "min_sample": "20",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "90000.00",
                "method": "SNI 2417:2008",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 2,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Analisis Saringan Agregat Halus dan Kasar",
                "min_sample": "5",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "110000.00",
                "method": "SNI ASTM C136:2012",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 3,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Berat Jenis dan Penyerapan Air Agregat Halus",
                "min_sample": "3",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "150000.00",
                "method": "SNI 1970:2016",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 4,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Berat Jenis dan Penyerapan Air Agregat Kasar",
                "min_sample": "3",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "90000.00",
                "method": "SNI 1969:2016",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 5,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian Kadar Air Untuk Tanah dan Batuan Di Laboratorium",
                "min_sample": "2",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "90000.00",
                "method": "SNI 1965:2019",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 6,
                "category_id": 3,
                "test_type_id": 1,
                "service_name": "Pengujian Kuat Tarik Baja Beton",
                "min_sample": "2",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "85000.00",
                "method": "SNI 07-2529-1991",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 7,
                "category_id": 6,
                "test_type_id": 1,
                "service_name": "Pengujian Berat Jenis Nyata Campuran Beraspal Yang Dipadatkan Menggunakan Benda Uji Kering Permukaan Jenuh",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "180000.00",
                "method": "SNI 03-6757-2002",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 8,
                "category_id": 6,
                "test_type_id": 1,
                "service_name": "Pengujian Kadar Aspal Dari Campuran Beraspal Dengan Cara Sentrifus",
                "min_sample": "5",
                "satuan": "Kilogram",
                "duration_days": 7,
                "price": "20000.00",
                "method": "SNI 03-6894-2002",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 9,
                "category_id": 5,
                "test_type_id": 1,
                "service_name": "Pengujian Kuat Tekan Paving Block",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "35000.00",
                "method": "BS 6717-1993 ANNEX B",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 10,
                "category_id": 5,
                "test_type_id": 1,
                "service_name": "Pengujian Kuat Lentur Beton Normal Dengan Dua Titik Pembebanan",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "95000.00",
                "method": "SNI 4431-2011",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 11,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian Attebergh",
                "min_sample": "5",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "150000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 12,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian CBR Laboratorium Rendaman (Soaked)",
                "min_sample": "50",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "250000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 13,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian CBR Laboratorium Tanpa Rendaman (Unsoaked)",
                "min_sample": "50",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "200000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 14,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian Kepadatan Ringan Untuk Tanah",
                "min_sample": "50",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "235000.00",
                "method": null,
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 15,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian Kepadatan Berat Untuk Tanah",
                "min_sample": "50",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "360000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 16,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Berat Isi Agregat",
                "min_sample": "50",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "110000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 17,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Gumpalan Lempung Dan Butiran Mudah Pecah Dalam Agregat",
                "min_sample": "5",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "150000.00",
                "method": null,
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 18,
                "category_id": 1,
                "test_type_id": 1,
                "service_name": "Pengujian Jumlah Bahan Dalam Agregate Yang Lolos Saringan Nomor 200",
                "min_sample": "5",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "180000.00",
                "method": null,
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 19,
                "category_id": 2,
                "test_type_id": 1,
                "service_name": "Pengujian Berat Jenis Tanah",
                "min_sample": "10",
                "satuan": "Kilogram",
                "duration_days": 14,
                "price": "90000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 20,
                "category_id": 3,
                "test_type_id": 1,
                "service_name": "Pengujian Lengkung Logam",
                "min_sample": "2",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "125000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 21,
                "category_id": 4,
                "test_type_id": 1,
                "service_name": "Pengujian Kuat Tekan Mortar",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "30000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 22,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Kuat Tekan Beton Kubus",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "60000.00",
                "method": "SNI 03-1974-1990",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:34.000Z"
        },
        {
                "id": 23,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Kuat Tekan Beton Silinder",
                "min_sample": "3",
                "satuan": "Buah",
                "duration_days": 7,
                "price": "60000.00",
                "method": "SNI 1974:2011",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 24,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Inti Beton Hasil Pemboran",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "100000.00",
                "method": "SNI 2492-2018",
                "kan": "Ya",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 25,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Densitas Tanah Di Tempat (Lapangan) Dengan Alat Konus Pasir",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "400000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 26,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian CBR Lapangan",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "250000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 27,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian DCP",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "150000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 28,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Angka Pantul Beton Keras/Hammer Test",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "150000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 29,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Coring Aspal Beton/Pengeboran Beton 10cm",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "20000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 30,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Coring Aspal Beton/Pengeboran Beton 20cm",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "260000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 31,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Coring Aspal Beton/Pengeboran Beton 30cm",
                "min_sample": "3",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "350000.00",
                "method": null,
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        },
        {
                "id": 32,
                "category_id": 5,
                "test_type_id": 2,
                "service_name": "Pengujian Daya Dukung Tanah",
                "min_sample": "2",
                "satuan": "Titik",
                "duration_days": 7,
                "price": "100000.00",
                "method": "SNI 2828-2011",
                "kan": "Tidak",
                "created_at": "2026-03-27T16:13:35.000Z"
        }
];

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
