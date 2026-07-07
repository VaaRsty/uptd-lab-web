/**
 * Controller untuk dashboard admin (statistik agregat).
 */
const submissionModel = require('../models/submissionModel');
const userModel = require('../models/userModel');
const kuisionerModel = require('../models/kuisionerModel');
const notificationModel = require('../models/notificationModel');
const { success } = require('../utils/responseHelper');

exports.adminStats = async (req, res, next) => {
    try {
        const [submissionStats, totalUsers, totalPelanggan, kuisStats, recentNotifs, recentSubmissions, incomeData, awaitingPaymentData] = await Promise.all([
            submissionModel.countByStatus(),
            userModel.count(),
            userModel.count({ role: 'pelanggan' }),
            kuisionerModel.stats(),
            notificationModel.listAdmin({ limit: 5 }),
            submissionModel.list({ limit: 5 }),
            require('../config/database').query("SELECT SUM(total_tagihan) as income FROM payments WHERE status_pembayaran = 'Lunas'"),
            require('../config/database').query("SELECT COUNT(*) as count FROM payments WHERE status_pembayaran = 'Belum Bayar'")
        ]);

        let pending = 0, completed = 0;
        submissionStats.forEach(item => {
            if (item.status === 'Menunggu Verifikasi') pending = item.total;
            if (item.status === 'Selesai') completed = item.total;
        });
        const awaitingPayment = awaitingPaymentData[0][0].count || 0;

        const incomeNumber = incomeData[0][0].income || 0;
        const incomeFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(incomeNumber);

        // ── Chart Data (6 bulan terakhir) ──
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        const chartLabels = [];
        const chartValues = [0, 0, 0, 0, 0, 0];
        
        const d = new Date();
        for (let i = 5; i >= 0; i--) {
            const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
            chartLabels.push(months[past.getMonth()]);
        }
        
        const [monthlyIncome] = await require('../config/database').query(`
            SELECT EXTRACT(MONTH FROM created_at) as month, EXTRACT(YEAR FROM created_at) as year, SUM(total_tagihan) as total 
            FROM payments 
            WHERE status_pembayaran = 'Lunas' 
              AND created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        `);
        
        monthlyIncome.forEach(row => {
            // Find which index in the last 6 months this belongs to
            const rowDate = new Date(row.year, row.month - 1, 1);
            for (let i = 5; i >= 0; i--) {
                const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
                if (past.getMonth() === rowDate.getMonth() && past.getFullYear() === rowDate.getFullYear()) {
                    chartValues[5 - i] = parseFloat(row.total) || 0;
                }
            }
        });

        // Format activities from recentSubmissions
        const formattedActivities = recentSubmissions.map(sub => {
            let icon = 'file-alt';
            let color = 'primary';
            let badgeColor = 'primary';
            
            if (sub.status.includes('Selesai')) { icon = 'check-circle'; color = 'success'; badgeColor = 'success'; }
            else if (sub.status.includes('Menunggu')) { icon = 'clock'; color = 'warning'; badgeColor = 'warning'; }
            else if (sub.status.includes('Lunas')) { icon = 'receipt'; color = 'success'; badgeColor = 'success'; }
            else if (sub.status.includes('Belum')) { icon = 'exclamation-circle'; color = 'danger'; badgeColor = 'danger'; }

            const d = new Date(sub.created_at);
            const timeStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

            return {
                icon,
                color,
                badgeColor,
                company: sub.nama_instansi || sub.nama_pemohon || '-',
                time: timeStr,
                description: `Pengajuan pengujian ${sub.no_permohonan || ''}`,
                status: sub.status
            };
        });

        return success(res, 'Statistik dashboard', {
            stats: { income: incomeFmt, pending, completed, awaitingPayment },
            activities: formattedActivities,
            submissions: recentSubmissions,
            chartLabels,
            chartValues,
            submissions_by_status: submissionStats,
            total_users: totalUsers,
            total_pelanggan: totalPelanggan,
            kuisioner: kuisStats
        });
    } catch (err) {
        next(err);
    }
};

exports.getData = async (req, res, next) => {
    try {
        const [submissionStats, recentNotifs] = await Promise.all([
            submissionModel.countByStatus(),
            notificationModel.listAdmin({ limit: 5 })
        ]);
        return success(res, 'Dashboard data', {
            submissions_by_status: submissionStats,
            recent_notifications: recentNotifs
        });
    } catch (err) {
        next(err);
    }
};
