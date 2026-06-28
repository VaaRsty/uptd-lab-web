// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

const mainRoutes = require('./src/routes/mainRoutes');
const globalSettings = require('./src/middleware/globalSettings');
// const maintenanceCheck = require('./src/middleware/maintenanceCheck'); // <-- TIDAK DIPERLUKAN DI SINI

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'uptd-lab-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    cookie: { 
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    },
    name: 'uptd.sid'
}));

// Global settings (tetap dipasang)
app.use(globalSettings);

// ❌ HAPUS INI → app.use(maintenanceCheck);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.currentUrl = req.originalUrl;
    next();
});

app.use('/', mainRoutes);

app.use((req, res) => {
    res.redirect('/');
});

app.use((err, req, res, next) => {
    console.error('❌ Server error:', err.stack);
    req.session.error = 'Terjadi kesalahan server. Silakan coba lagi.';
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 FRONTEND SERVER RUNNING');
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log('=================================');
});