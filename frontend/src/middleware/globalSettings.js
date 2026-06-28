const db = require('../config/database');

const globalSettings = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            let key = row.setting_key;
            if (key.startsWith('system_')) {
                key = key.replace('system_', '');
            }
            settings[key] = row.setting_value;
        });
        res.locals.settings = settings;
        req.settings = settings;
        next();
    } catch (error) {
        console.error('Error fetching global settings:', error);
        res.locals.settings = {};
        req.settings = {};
        next();
    }
};

module.exports = globalSettings;