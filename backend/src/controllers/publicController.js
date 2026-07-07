/**
 * Controller untuk endpoint public (tidak butuh auth).
 */
const serviceModel = require('../models/serviceModel');
const settingModel = require('../models/settingModel');
const { success, error } = require('../utils/responseHelper');

exports.getServices = async (req, res, next) => {
    try {
        const data = await serviceModel.listServices();
        return success(res, 'Daftar layanan', data);
    } catch (err) { 
        res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
};

exports.getServiceById = async (req, res, next) => {
    try {
        const data = await serviceModel.findServiceById(req.params.id);
        if (!data) return error(res, 404, 'Layanan tidak ditemukan');
        return success(res, 'Detail layanan', data);
    } catch (err) { next(err); }
};

exports.getJadwalSibuk = async (req, res, next) => {
    try {
        const active = await settingModel.getByKey('busy_mode_active');
        const periods = await settingModel.findActiveBusyPeriods();
        return success(res, 'Jadwal sibuk', {
            active: active === '1' || active === 'true',
            data: periods
        });
    } catch (err) { next(err); }
};

exports.getPublicBusySchedule = async (req, res, next) => {
    try {
        const active = await settingModel.getByKey('busy_mode_active');
        // 🔥 Ambil SEMUA periode sibuk (termasuk yang sudah lewat)
        const periods = await settingModel.listBusyPeriods();
        return success(res, 'Jadwal sibuk publik', {
            active: active === '1' || active === 'true',
            data: periods
        });
    } catch (err) { next(err); }
};
