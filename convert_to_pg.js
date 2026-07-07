const fs = require('fs');

const mysqlDump = fs.readFileSync('uptd_lab.sql', 'utf8');

// 1. Ekstrak semua query INSERT INTO dari file asli
const lines = mysqlDump.split('\n');
let inserts = [];
let currentInsert = '';
let inInsert = false;

for (let line of lines) {
    if (line.startsWith('INSERT INTO')) {
        inInsert = true;
        currentInsert = line;
    } else if (inInsert) {
        currentInsert += '\n' + line;
    }
    
    if (inInsert && line.trim().endsWith(';')) {
        inserts.push(currentInsert);
        inInsert = false;
        currentInsert = '';
    }
}

// 2. Bersihkan syntax MySQL pada INSERT
let cleanInserts = inserts.map(insert => {
    // Hilangkan backticks
    let clean = insert.replace(/`/g, '"');
    
    // Ganti escape \' menjadi ''
    clean = clean.replace(/\\'/g, "''");
    
    // Ganti escape \" menjadi "
    clean = clean.replace(/\\"/g, '"');
    
    // Ganti escape \r\n menjadi spasi karena di Postgres JSON tidak bisa \r literal
    clean = clean.replace(/\\r\\n/g, '\\n');
    
    // Ganti tanggal MySQL 0000-00-00 menjadi 1970-01-01 yang valid di Postgres
    clean = clean.replace(/0000-00-00 00:00:00/g, '1970-01-01 00:00:00');
    clean = clean.replace(/0000-00-00/g, '1970-01-01');
    
    // Insert ON CONFLICT
    clean = clean.replace(/;/g, ' ON CONFLICT DO NOTHING;');
    
    return clean;
});

// 3. Ambil schema dari AI (Kita pakai schema yang tadi diberikan AI, tapi tanpa insert bawaan AI)
const aiSchema = `
create table IF NOT EXISTS users (
  id SERIAL primary key,
  email VARCHAR(100) not null unique,
  password VARCHAR(255) not null,
  role VARCHAR(50) default 'pelanggan',
  full_name VARCHAR(100) not null,
  employee_id VARCHAR(50) default null,
  nama_instansi VARCHAR(255) default null,
  alamat TEXT,
  nomor_telepon VARCHAR(20) default null,
  avatar VARCHAR(255) default null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  updated_at TIMESTAMP default null,
  notif_email SMALLINT default 1,
  notif_wa SMALLINT default 0
);

create table IF NOT EXISTS activities (
  id SERIAL primary key,
  user_id INTEGER default null,
  activity_name VARCHAR(255) default null,
  ip_address VARCHAR(45) default null,
  user_agent TEXT,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS jadwal_sibuk (
  id SERIAL primary key,
  keterangan VARCHAR(255) not null,
  tanggal_mulai DATE not null,
  tanggal_selesai DATE not null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  updated_at TIMESTAMP default CURRENT_TIMESTAMP,
  created_by INTEGER default null,
  updated_by INTEGER default null
);

create table IF NOT EXISTS kuisioner_questions (
  id SERIAL primary key,
  question_text TEXT not null,
  urutan INTEGER default 0
);

create table IF NOT EXISTS kuisioner (
  id SERIAL primary key,
  submission_id INTEGER not null unique,
  saran TEXT,
  jawaban_json JSON default null,
  pertanyaan_json JSON default null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  skor_17 SMALLINT default null
);

create table IF NOT EXISTS notifications (
  id SERIAL primary key,
  user_id INTEGER default null,
  title VARCHAR(255) not null,
  message TEXT not null,
  href VARCHAR(255) default '#',
  is_read SMALLINT default 0,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS payments (
  id SERIAL primary key,
  submission_id INTEGER not null unique,
  no_invoice VARCHAR(100) not null,
  total_tagihan DECIMAL(15, 2) default 0.00,
  jumlah_dibayar DECIMAL(15, 2) default 0.00,
  sisa_tagihan DECIMAL(15, 2) GENERATED ALWAYS as (total_tagihan - jumlah_dibayar) STORED,
  status_pembayaran VARCHAR(50) default 'Belum Bayar',
  bukti_pembayaran_1 VARCHAR(255) default null,
  bukti_pembayaran_2 VARCHAR(255) default null,
  bukti_pembayaran_1_uploaded_at TIMESTAMP default null,
  bukti_pembayaran_2_uploaded_at TIMESTAMP default null,
  skrd_file VARCHAR(255) default null,
  skrd_filename VARCHAR(255) default null,
  skrd_uploaded_at TIMESTAMP default null,
  skrd_uploaded_by INTEGER default null,
  bukti_pembayaran_notes TEXT,
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  updated_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS test_types (
  id SERIAL primary key,
  type_name VARCHAR(100) not null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS test_categories (
  id SERIAL primary key,
  test_type_id INTEGER not null,
  category_name VARCHAR(100) not null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS services (
  id SERIAL primary key,
  category_id INTEGER not null,
  test_type_id INTEGER not null,
  service_name VARCHAR(255) not null,
  min_sample VARCHAR(100) default null,
  satuan VARCHAR(50) default 'sample',
  duration_days INTEGER default null,
  price DECIMAL(15, 2) not null default 0.00,
  method VARCHAR(255) default null,
  kan VARCHAR(10) default 'Tidak',
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS settings (
  id SERIAL primary key,
  setting_key VARCHAR(100) not null unique,
  setting_value TEXT,
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  updated_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS submissions (
  id SERIAL primary key,
  user_id INTEGER not null,
  no_permohonan VARCHAR(100) default null,
  nama_pemohon VARCHAR(255) not null,
  nama_instansi VARCHAR(255) default null,
  alamat_pemohon TEXT,
  nomor_telepon VARCHAR(20) default null,
  email_pemohon VARCHAR(100) default null,
  nama_proyek VARCHAR(255) not null,
  lokasi_proyek VARCHAR(255) default null,
  file_surat_permohonan VARCHAR(255) default null,
  file_ktp VARCHAR(255) default null,
  dokumen_tambahan TEXT,
  catatan_tambahan VARCHAR(250) default null,
  catatan_admin TEXT,
  jadwal_sampling DATE default null,
  status VARCHAR(50) default 'Menunggu Verifikasi',
  created_at TIMESTAMP default CURRENT_TIMESTAMP,
  updated_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS submission_samples (
  id SERIAL primary key,
  submission_id INTEGER not null,
  jenis_sample VARCHAR(255) default null,
  nama_identitas_sample VARCHAR(255) default null,
  jumlah_sample_angka INTEGER not null default 1,
  jumlah_sample_satuan VARCHAR(50) default 'sample',
  tanggal_pengambilan DATE default null,
  kemasan_sample VARCHAR(100) default null,
  asal_sample VARCHAR(255) default null,
  sample_diambil_oleh VARCHAR(50) default 'Pelanggan',
  test_type_id INTEGER not null,
  test_category_id INTEGER not null,
  service_id INTEGER not null,
  price_at_time DECIMAL(15, 2) not null,
  method_at_time VARCHAR(255) default null,
  estimasi_selesai DATE default null,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS test_reports (
  id SERIAL primary key,
  submission_id INTEGER not null unique,
  file_laporan VARCHAR(255) default null,
  no_laporan VARCHAR(100) default null,
  tanggal_selesai DATE default null,
  catatan_laporan TEXT,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);

create table IF NOT EXISTS user_notifications (
  id SERIAL primary key,
  user_id INTEGER not null,
  title VARCHAR(255) not null,
  message TEXT not null,
  type VARCHAR(50) default 'info',
  is_read SMALLINT default 0,
  created_at TIMESTAMP default CURRENT_TIMESTAMP
);
`;

const finalize = `
-- FOREIGN KEYS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='activities_ibfk_1') THEN
    alter table activities add constraint activities_ibfk_1 foreign KEY (user_id) references users (id) on delete set null;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='kuisioner_ibfk_1') THEN
    alter table kuisioner add constraint kuisioner_ibfk_1 foreign KEY (submission_id) references submissions (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='payments_ibfk_1') THEN
    alter table payments add constraint payments_ibfk_1 foreign KEY (submission_id) references submissions (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_services_test_type') THEN
    alter table services add constraint fk_services_test_type foreign KEY (test_type_id) references test_types (id) on delete RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='services_ibfk_1') THEN
    alter table services add constraint services_ibfk_1 foreign KEY (category_id) references test_categories (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='submissions_ibfk_1') THEN
    alter table submissions add constraint submissions_ibfk_1 foreign KEY (user_id) references users (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='submission_samples_ibfk_1') THEN
    alter table submission_samples add constraint submission_samples_ibfk_1 foreign KEY (submission_id) references submissions (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='submission_samples_ibfk_2') THEN
    alter table submission_samples add constraint submission_samples_ibfk_2 foreign KEY (test_type_id) references test_types (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='submission_samples_ibfk_3') THEN
    alter table submission_samples add constraint submission_samples_ibfk_3 foreign KEY (test_category_id) references test_categories (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='submission_samples_ibfk_4') THEN
    alter table submission_samples add constraint submission_samples_ibfk_4 foreign KEY (service_id) references services (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='test_categories_ibfk_1') THEN
    alter table test_categories add constraint test_categories_ibfk_1 foreign KEY (test_type_id) references test_types (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='test_reports_ibfk_1') THEN
    alter table test_reports add constraint test_reports_ibfk_1 foreign KEY (submission_id) references submissions (id) on delete CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='user_notifications_ibfk_1') THEN
    alter table user_notifications add constraint user_notifications_ibfk_1 foreign KEY (user_id) references users (id) on delete CASCADE;
  END IF;
END $$;

select setval(pg_get_serial_sequence('activities', 'id'), COALESCE(MAX(id), 0) + 1, false) from activities;
select setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 0) + 1, false) from users;
select setval(pg_get_serial_sequence('jadwal_sibuk', 'id'), COALESCE(MAX(id), 0) + 1, false) from jadwal_sibuk;
select setval(pg_get_serial_sequence('kuisioner', 'id'), COALESCE(MAX(id), 0) + 1, false) from kuisioner;
select setval(pg_get_serial_sequence('kuisioner_questions', 'id'), COALESCE(MAX(id), 0) + 1, false) from kuisioner_questions;
select setval(pg_get_serial_sequence('notifications', 'id'), COALESCE(MAX(id), 0) + 1, false) from notifications;
select setval(pg_get_serial_sequence('payments', 'id'), COALESCE(MAX(id), 0) + 1, false) from payments;
select setval(pg_get_serial_sequence('services', 'id'), COALESCE(MAX(id), 0) + 1, false) from services;
select setval(pg_get_serial_sequence('settings', 'id'), COALESCE(MAX(id), 0) + 1, false) from settings;
select setval(pg_get_serial_sequence('submissions', 'id'), COALESCE(MAX(id), 0) + 1, false) from submissions;
select setval(pg_get_serial_sequence('submission_samples', 'id'), COALESCE(MAX(id), 0) + 1, false) from submission_samples;
select setval(pg_get_serial_sequence('test_categories', 'id'), COALESCE(MAX(id), 0) + 1, false) from test_categories;
select setval(pg_get_serial_sequence('test_reports', 'id'), COALESCE(MAX(id), 0) + 1, false) from test_reports;
select setval(pg_get_serial_sequence('test_types', 'id'), COALESCE(MAX(id), 0) + 1, false) from test_types;
select setval(pg_get_serial_sequence('user_notifications', 'id'), COALESCE(MAX(id), 0) + 1, false) from user_notifications;
`;

const fullSql = `
BEGIN;
SET LOCAL session_replication_role = 'replica';

-- 1. SCHEMA
${aiSchema}

-- 2. DATA
${cleanInserts.join('\n')}

-- 3. FOREIGN KEYS & TRIGGERS
${finalize}

COMMIT;
`;

fs.writeFileSync('supabase_import.sql', fullSql, 'utf8');
console.log('Done generating supabase_import.sql');
