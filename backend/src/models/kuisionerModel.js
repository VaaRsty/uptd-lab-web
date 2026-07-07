// backend/src/models/kuisionerModel.js

const db = require('../config/database');

// =========== KUISIONER (jawaban) ===========

exports.list = async ({ limit = 50, offset = 0, start_date, end_date } = {}) => {
    let params = [];
    let sql = `
        SELECT k.*, s.nama_pemohon, s.nama_proyek, s.nama_instansi, s.nomor_telepon 
        FROM kuisioner k 
        LEFT JOIN submissions s ON s.id = k.submission_id 
        WHERE 1=1
    `;
    
    // 🔥 FILTER TANGGAL
    if (start_date) {
        sql += ' AND DATE(k.created_at) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND DATE(k.created_at) <= ?';
        params.push(end_date);
    }
    
    sql += ' ORDER BY k.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    
    const [rows] = await db.query(sql, params);
    
    // Hitung total_nilai, jumlah_pertanyaan, rata_rata
    rows.forEach(row => {
        let total = 0;
        let count = 0;
        if (row.jawaban_json) {
            const answers = typeof row.jawaban_json === 'string' ? JSON.parse(row.jawaban_json) : row.jawaban_json;
            Object.values(answers).forEach(val => {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    total += num;
                    count++;
                }
            });
        }
        row.total_nilai = total;
        row.jumlah_pertanyaan = count;
        row.rata_rata = count > 0 ? (total / count) : 0;
    });

    return rows;
};

exports.count = async ({ start_date, end_date } = {}) => {
    let params = [];
    let sql = 'SELECT COUNT(*) AS total FROM kuisioner k WHERE 1=1';
    if (start_date) {
        sql += ' AND DATE(k.created_at) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND DATE(k.created_at) <= ?';
        params.push(end_date);
    }
    const [rows] = await db.query(sql, params);
    return rows[0].total;
};

exports.findById = async (id) => {
    const [rows] = await db.query(
        `SELECT k.*, s.nama_pemohon, s.nama_instansi, s.nomor_telepon
         FROM kuisioner k 
         LEFT JOIN submissions s ON s.id = k.submission_id 
         WHERE k.id = ? LIMIT 1`, 
        [id]
    );
    if (!rows[0]) return null;
    
    const row = rows[0];
    
    // Map jawaban_json to skor_list
    let skor_list = [];
    if (row.jawaban_json) {
        const answers = typeof row.jawaban_json === 'string' ? JSON.parse(row.jawaban_json) : row.jawaban_json;
        if (Array.isArray(answers)) {
            skor_list = answers.map(a => parseInt(a, 10));
        } else if (typeof answers === 'object') {
            skor_list = Object.keys(answers).sort((a,b) => parseInt(a)-parseInt(b)).map(k => parseInt(answers[k], 10));
        }
    }
    row.skor_list = skor_list;
    
    // Map pertanyaan_json to pertanyaan
    let pertanyaan = [];
    if (row.pertanyaan_json) {
        pertanyaan = typeof row.pertanyaan_json === 'string' ? JSON.parse(row.pertanyaan_json) : row.pertanyaan_json;
    } else {
        const [qRows] = await db.query('SELECT question_text FROM kuisioner_questions ORDER BY urutan ASC');
        pertanyaan = qRows.map(q => q.question_text);
    }
    row.pertanyaan = pertanyaan;

    return row;
};

exports.findBySubmissionId = async (submissionId) => {
    const [rows] = await db.query(
        'SELECT * FROM kuisioner WHERE submission_id = ? LIMIT 1',
        [submissionId]
    );
    return rows[0] || null;
};

exports.create = async (data) => {
    const [result] = await db.query(
        `INSERT INTO kuisioner 
        (submission_id, saran, jawaban_json, pertanyaan_json, skor_17, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [
            data.submission_id || null,
            data.saran || null,
            data.answers ? JSON.stringify(data.answers) : null,
            data.pertanyaan_json ? JSON.stringify(data.pertanyaan_json) : null,
            data.rating_avg || null
        ]
    );
    return result.insertId;
};

exports.update = async (id, data) => {
    const fields = [];
    const values = [];
    
    if (data.answers !== undefined) {
        fields.push(`jawaban_json = ?`);
        values.push(JSON.stringify(data.answers));
    }
    if (data.rating_avg !== undefined) {
        fields.push(`skor_17 = ?`);
        values.push(data.rating_avg);
    }
    if (data.saran !== undefined) {
        fields.push(`saran = ?`);
        values.push(data.saran);
    }
    if (data.pertanyaan_json !== undefined) {
        fields.push(`pertanyaan_json = ?`);
        values.push(JSON.stringify(data.pertanyaan_json));
    }
    
    if (!fields.length) return 0;
    values.push(id);
    const [result] = await db.query(
        `UPDATE kuisioner SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.delete = async (id) => {
    const [result] = await db.query('DELETE FROM kuisioner WHERE id = ?', [id]);
    return result.affectedRows;
};

exports.stats = async ({ start_date, end_date } = {}) => {
    let params = [];
    let sql = 'SELECT jawaban_json FROM kuisioner WHERE 1=1';
    if (start_date) {
        sql += ' AND DATE(created_at) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND DATE(created_at) <= ?';
        params.push(end_date);
    }
    const [rows] = await db.query(sql, params);
    
    let totalScore = 0;
    let totalAnswers = 0;
    const distribusi = { skor_1_count: 0, skor_2_count: 0, skor_3_count: 0, skor_4_count: 0, skor_5_count: 0 };
    const perQuestionScores = {};
    const perQuestionCounts = {};
    
    rows.forEach(row => {
        if (row.jawaban_json) {
            const answers = typeof row.jawaban_json === 'string' ? JSON.parse(row.jawaban_json) : row.jawaban_json;
            Object.entries(answers).forEach(([qId, val]) => {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    totalScore += num;
                    totalAnswers++;
                    
                    if (num === 1) distribusi.skor_1_count++;
                    else if (num === 2) distribusi.skor_2_count++;
                    else if (num === 3) distribusi.skor_3_count++;
                    else if (num === 4) distribusi.skor_4_count++;
                    else if (num === 5) distribusi.skor_5_count++;
                    
                    perQuestionScores[qId] = (perQuestionScores[qId] || 0) + num;
                    perQuestionCounts[qId] = (perQuestionCounts[qId] || 0) + 1;
                }
            });
        }
    });

    const rata_keseluruhan = totalAnswers > 0 ? (totalScore / totalAnswers) : 0;
    
    const rata_skor_array = [];
    const maxQId = Math.max(...Object.keys(perQuestionCounts).map(Number), 0);
    for (let i = 1; i <= maxQId; i++) {
        const score = perQuestionScores[i] || 0;
        const count = perQuestionCounts[i] || 0;
        rata_skor_array.push(count > 0 ? (score / count) : 0);
    }
    
    return {
        stats: {
            total_responden: rows.length,
            rata_keseluruhan,
            rata_skor_array
        },
        distribusi
    };
};

// =========== KUISIONER QUESTIONS ===========

exports.listQuestions = async () => {
    const [rows] = await db.query(
        'SELECT * FROM kuisioner_questions ORDER BY urutan ASC, id ASC'
    );
    return rows.map(r => ({ ...r, order_index: r.urutan }));
};

exports.findQuestionById = async (id) => {
    const [rows] = await db.query(
        'SELECT * FROM kuisioner_questions WHERE id = ? LIMIT 1',
        [id]
    );
    if (!rows[0]) return null;
    return { ...rows[0], order_index: rows[0].urutan };
};

exports.createQuestion = async (data) => {
    const [result] = await db.query(
        `INSERT INTO kuisioner_questions 
        (question_text, urutan)
        VALUES (?, ?)`,
        [
            data.question_text,
            data.order_index || 0
        ]
    );
    return result.insertId;
};

exports.updateQuestion = async (id, data) => {
    const fields = [];
    const values = [];
    
    if (data.question_text !== undefined) {
        fields.push(`question_text = ?`);
        values.push(data.question_text);
    }
    if (data.order_index !== undefined) {
        fields.push(`urutan = ?`);
        values.push(data.order_index);
    }
    
    if (!fields.length) return 0;
    values.push(id);
    const [result] = await db.query(
        `UPDATE kuisioner_questions SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.deleteQuestion = async (id) => {
    const [result] = await db.query('DELETE FROM kuisioner_questions WHERE id = ?', [id]);
    return result.affectedRows;
};

exports.reorderQuestions = async (orders) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        for (const item of orders) {
            await conn.query(
                'UPDATE kuisioner_questions SET urutan = ? WHERE id = ?',
                [item.order_index, item.id]
            );
        }
        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};