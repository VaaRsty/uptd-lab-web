/**
 * Controller untuk setting sistem, busy mode, backup, activity logs.
 */
const settingModel = require('../models/settingModel');
const activityModel = require('../models/activityModel');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/responseHelper');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// =========== SYSTEM CONFIG ===========

exports.getSystem = async (req, res, next) => {
    try {
        const data = await settingModel.getAll();
        return success(res, 'Konfigurasi sistem', data);
    } catch (err) { next(err); }
};

exports.updateSystem = async (req, res, next) => {
    try {
        await settingModel.setBulk(req.body);
        return success(res, 'Konfigurasi diupdate');
    } catch (err) { next(err); }
};

const userModel = require('../models/userModel');

exports.getProfileSettings = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) return error(res, 404, 'User tidak ditemukan');
        return success(res, 'Profile settings', {
            name: user.full_name,
            email: user.email,
            phone: user.nomor_telepon,
            position: user.jabatan || (user.role === 'admin' ? 'Super Administrator' : 'Administrator'),
            company: user.nama_instansi,
            alamat: user.alamat,
            avatar: user.avatar,
            updated_at: user.updated_at || user.created_at
        });
    } catch (err) { next(err); }
};

exports.updateProfileSettings = async (req, res, next) => {
    try {
        const { name, email, phone, alamat, company } = req.body;
        const affected = await userModel.updateProfile(req.user.id, {
            full_name: name,
            email: email,
            nomor_telepon: phone,
            nama_instansi: company,
            alamat: alamat
        });
        if (!affected) return error(res, 400, 'Tidak ada perubahan');
        return success(res, 'Profil berhasil diupdate');
    } catch (err) { next(err); }
};

// =========== BUSY MODE ===========

exports.getBusyMode = async (req, res, next) => {
    try {
        const active = await settingModel.getByKey('busy_mode_active');
        const periods = await settingModel.listBusyPeriods();
        return success(res, 'Busy mode', {
            active: active === '1' || active === 'true',
            periods
        });
    } catch (err) { next(err); }
};

exports.updateBusyMode = async (req, res, next) => {
    try {
        await settingModel.set('busy_mode_active', req.body.active ? '1' : '0');
        return success(res, 'Busy mode diupdate');
    } catch (err) { next(err); }
};

exports.getBusyPeriod = async (req, res, next) => {
    try {
        const data = await settingModel.findBusyPeriodById(req.params.id);
        if (!data) return error(res, 404, 'Periode sibuk tidak ditemukan');
        return success(res, 'Detail periode sibuk', data);
    } catch (err) { next(err); }
};

exports.addBusyPeriod = async (req, res, next) => {
    try {
        const id = await settingModel.addBusyPeriod(req.body);
        return success(res, 'Periode sibuk ditambahkan', { id }, 201);
    } catch (err) { next(err); }
};

exports.updateBusyPeriod = async (req, res, next) => {
    try {
        const affected = await settingModel.updateBusyPeriod(req.params.id, req.body);
        if (!affected) return error(res, 404, 'Periode sibuk tidak ditemukan');
        return success(res, 'Periode sibuk diupdate');
    } catch (err) { next(err); }
};

exports.deleteBusyPeriod = async (req, res, next) => {
    try {
        const affected = await settingModel.deleteBusyPeriod(req.params.id);
        if (!affected) return error(res, 404, 'Periode sibuk tidak ditemukan');
        return success(res, 'Periode sibuk dihapus');
    } catch (err) { next(err); }
};

// =========== ACTIVITY LOGS ===========

exports.activityLogs = async (req, res, next) => {
    try {
        const { type, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        console.log('📋 [activityLogs] Query:', { type, search, page, limit });

        // Kirim parameter ke model
        const result = await activityModel.list({
            limit: parseInt(limit),
            offset,
            type: type || undefined,
            search: search || undefined
        });

        // Format response agar sesuai dengan frontend
        return success(res, 'Activity logs', {
            data: result.data,
            total: result.total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(result.total / parseInt(limit))
        });
    } catch (err) {
        next(err);
    }
};

// =========== BACKUP ===========

exports.backupHistory = async (req, res, next) => {
    try {
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            return success(res, 'Backup history', []);
        }
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.sql'))
            .map(f => {
                const stat = fs.statSync(path.join(backupDir, f));
                return {
                    filename: f,
                    size: stat.size,
                    created_at: stat.mtime
                };
            })
            .sort((a, b) => b.created_at - a.created_at);
        return success(res, 'Backup history', files);
    } catch (err) { next(err); }
};



// Fungsi untuk mencari path mysqldump.exe di Laragon
function getMysqlDumpPath() {
    // 1. Coba di Laragon default
    const laragonBase = 'C:\\laragon\\bin\\mysql\\';
    if (fs.existsSync(laragonBase)) {
        try {
            const folders = fs.readdirSync(laragonBase).filter(f => f.startsWith('mysql-'));
            if (folders.length > 0) {
                // Urutkan descending (ambil versi terbaru)
                folders.sort().reverse();
                for (const folder of folders) {
                    const exePath = path.join(laragonBase, folder, 'bin', 'mysqldump.exe');
                    if (fs.existsSync(exePath)) {
                        console.log(`✅ [BACKUP] Found mysqldump at: ${exePath}`);
                        return exePath;
                    }
                }
            }
        } catch (err) {
            console.warn('⚠️ [BACKUP] Gagal scan folder Laragon:', err.message);
        }
    }

    // 2. Fallback ke nama command (harap ada di PATH)
    console.log('ℹ️ [BACKUP] Using default "mysqldump" (assume in PATH)');
    return 'mysqldump';
}

exports.createBackup = async (req, res, next) => {
    try {
        // 1. Pastikan folder backups ada
        const backupDir = path.join(__dirname, '../../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // 2. Nama file backup
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        const filename = `backup_${dateStr}_${timeStr}.sql`;
        const filepath = path.join(backupDir, filename);

        // 3. Konfigurasi database
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'uptd_lab',
            port: process.env.DB_PORT || 3306
        };

        // 4. Dapatkan path mysqldump
        const mysqlDumpPath = getMysqlDumpPath();
        const command = `"${mysqlDumpPath}" -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} --no-tablespaces ${dbConfig.database} > "${filepath}"`;

        console.log('📦 [BACKUP] Command:', command);

        // 5. Eksekusi
        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stderr.includes('Warning')) {
            console.error('❌ [BACKUP] Error:', stderr);
            // Jika masih error karena command not found, beri pesan jelas
            if (stderr.includes('not recognized') || stderr.includes('command not found')) {
                return error(res, 500, 'mysqldump tidak ditemukan. Pastikan MySQL terinstall. Coba install package "mysqldump" dengan: npm install mysqldump');
            }
            return error(res, 500, 'Gagal membuat backup: ' + stderr);
        }

        // 6. Verifikasi file
        if (!fs.existsSync(filepath)) {
            return error(res, 500, 'File backup gagal dibuat');
        }

        // 7. Catat aktivitas
        try {
            const activityModel = require('../models/activityModel');
            await activityModel.create({
                user_id: req.user.id,
                activity_name: 'Create Backup',
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent']
            });
        } catch (logErr) {
            console.warn('⚠️ [BACKUP] Gagal mencatat log:', logErr.message);
        }

        return success(res, 'Backup berhasil dibuat', { filename, filepath });

    } catch (err) {
        console.error('❌ [BACKUP] Error:', err);
        return error(res, 500, 'Gagal membuat backup: ' + err.message);
    }
};

exports.restoreBackup = async (req, res, next) => {
    try {
        if (!req.file) return error(res, 400, 'File backup belum diupload');
        return success(res, 'Backup berhasil di-restore (implementasi penuh butuh mysql import)');
    } catch (err) { next(err); }
};
