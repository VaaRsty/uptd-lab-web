const Joi = require('joi');

const SUBMISSION_STATUS = [
    'Menunggu Verifikasi',
    'Pengecekan Sampel',
    'Belum Bayar',
    'Menunggu SKRD Upload',
    'Belum Lunas',
    'Lunas',
    'Sedang Diuji',
    'Selesai',
    'Dibatalkan'
];

exports.createSchema = Joi.object({
    // Field utama
    no_permohonan: Joi.string().max(100).allow('', null),
    nomor_permohonan: Joi.string().max(100).allow('', null),
    nama_pemohon: Joi.string().max(255).required(),
    nama_instansi: Joi.string().max(255).allow('', null),
    alamat_pemohon: Joi.string().max(500).allow('', null),
    nomor_telepon: Joi.string().max(20).allow('', null),
    email: Joi.string().email().max(100).allow('', null),
    email_pemohon: Joi.string().email().max(100).allow('', null),
    nama_proyek: Joi.string().max(255).required(),
    lokasi_proyek: Joi.string().max(255).allow('', null),
    catatan_tambahan: Joi.string().max(250).allow('', null),
    dokumen_tambahan: Joi.string().allow('', null),

    // --- Field sample & service ---
    uji_bahan: Joi.string().allow('', null),
    uji_konstruksi: Joi.string().allow('', null),
    service_id: Joi.string().allow('', null),
    test_type_id: Joi.string().allow('', null),
    test_category_id: Joi.string().allow('', null),
    price_at_time: Joi.string().allow('', null),
    method_at_time: Joi.string().allow('', null),

    // Field data sample
    jenis_sampel: Joi.alternatives().try(
        Joi.array().items(Joi.string()),
        Joi.string()
    ).allow(null),
    jenis_sampel_lainnya: Joi.string().allow('', null),
    nama_sampel: Joi.string().allow('', null),
    jumlah_sample_angka: Joi.string().allow('', null),
    jumlah_sample_satuan: Joi.string().allow('', null),
    tanggal_sampel: Joi.string().allow('', null),
    kemasan_sampel: Joi.string().allow('', null),
    asal_sampel: Joi.string().allow('', null),
    diambil_oleh: Joi.string().allow('', null),
    metode_uji: Joi.string().allow('', null),
    catatan_pemohon: Joi.string().allow('', null),
    qty_estimasi: Joi.string().allow('', null),
    tanggal_permohonan: Joi.string().allow('', null),

    // URL file dari direct browser-to-Supabase upload
    file_surat_permohonan_url: Joi.string().uri().allow('', null),
    file_ktp_url: Joi.string().uri().allow('', null),
    file_scan_ktp_url: Joi.string().uri().allow('', null),
    dokumen_tambahan_url: Joi.string().uri().allow('', null)
});

exports.updateSchema = Joi.object({
    status: Joi.string().valid(...SUBMISSION_STATUS),
    catatan_admin: Joi.string().max(1000).allow('', null),
    jadwal_sampling: Joi.date().allow(null, ''),
    no_permohonan: Joi.string().max(100).allow('', null),
    nama_pemohon: Joi.string().max(255),
    nama_proyek: Joi.string().max(255),
    lokasi_proyek: Joi.string().max(255).allow('', null),
    alamat_pemohon: Joi.string().max(500).allow('', null),
    nomor_telepon: Joi.string().max(20).allow('', null),
    email_pemohon: Joi.string().email().max(100).allow('', null),
    catatan_tambahan: Joi.string().max(250).allow('', null)
}).min(1);

exports.SUBMISSION_STATUS = SUBMISSION_STATUS;