const db = require('../config/database');

let cachedSettings = null;
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 60 seconds

const globalSettings = async (req, res, next) => {
    try {
        const now = Date.now();
        if (cachedSettings && (now - lastFetchTime < CACHE_TTL)) {
            res.locals.settings = cachedSettings;
            req.settings = cachedSettings;
            return next();
        }

        const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(row => {
            let key = row.setting_key;
            if (key.startsWith('system_')) {
                key = key.replace('system_', '');
            }
            settings[key] = row.setting_value;
        });
        
        cachedSettings = settings;
        lastFetchTime = now;

        res.locals.settings = settings;
        req.settings = settings;
        next();
    } catch (error) {
        console.error('Error fetching global settings:', error);
        res.locals.settings = cachedSettings || {};
        req.settings = cachedSettings || {};
        next();
    }
};

module.exports = globalSettings;