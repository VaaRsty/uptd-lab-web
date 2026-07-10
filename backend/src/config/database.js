console.log('🟢 [DB] File database.js mulai di-load (Mode Supabase/Postgres)');

require('dotenv').config();
const { Pool } = require('pg');

// Buat pool koneksi Postgres
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/uptd_lab',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Wrapper untuk meniru kelakuan mysql2 promisePool
const promisePool = {
    query: async (sql, params = []) => {
        // Konversi `?` menjadi `$1`, `$2`
        let counter = 1;
        let pgSql = sql.replace(/\?/g, () => `$${counter++}`);
        
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert && !/RETURNING\s+id/i.test(pgSql)) {
            pgSql += ' RETURNING id';
        }
        
        try {
            const result = await pool.query(pgSql, params);
            
            // Buat tiruan MySQL result object
            const mysqlResult = {
                affectedRows: result.rowCount,
                insertId: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
                rows: result.rows
            };
            
            // MySQL biasanya return [rows, fields]
            const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW');
            
            if (isSelect) {
                return [result.rows, result.fields];
            } else {
                return [mysqlResult, undefined];
            }
        } catch (error) {
            console.error('❌ SQL Error:', pgSql, params);
            throw error;
        }
    },
    getConnection: async () => {
        const client = await pool.connect();
        
        // Wrapper client agar meniru connection mysql2
        const wrappedClient = {
            beginTransaction: async () => await client.query('BEGIN'),
            commit: async () => await client.query('COMMIT'),
            rollback: async () => await client.query('ROLLBACK'),
            release: () => client.release(),
            query: async (sql, params = []) => {
                let counter = 1;
                let pgSql = sql.replace(/\?/g, () => `$${counter++}`);
                
                const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
                if (isInsert && !/RETURNING\s+id/i.test(pgSql)) {
                    pgSql += ' RETURNING id';
                }
                
                try {
                    const result = await client.query(pgSql, params);
                    
                    const mysqlResult = {
                        affectedRows: result.rowCount,
                        insertId: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
                        rows: result.rows
                    };
                    
                    const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('SHOW');
                    
                    if (isSelect) {
                        return [result.rows, result.fields];
                    } else {
                        return [mysqlResult, undefined];
                    }
                } catch (error) {
                    console.error('❌ SQL Error on wrapped connection:', pgSql, params);
                    throw error;
                }
            }
        };
        
        return wrappedClient;
    }
};

// ===== TEST KONEKSI =====
(async function testConnection() {
    try {
        console.log('🟢 [DB] Mencoba koneksi ke Postgres (Supabase)...');
        const client = await pool.connect();
        console.log('✅ [DB] Koneksi ke PostgreSQL BERHASIL!');
        client.release();
    } catch (err) {
        console.error('❌ [DB] GAGAL koneksi ke PostgreSQL:');
        console.error('   - Pesan:', err.message);
        console.error('   - Pastikan DATABASE_URL sudah diset di .env');
    }
})();

module.exports = promisePool;