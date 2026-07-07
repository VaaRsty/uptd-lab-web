require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/uptd_lab',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
    query: async (text, params) => {
        const client = await pool.connect();
        try {
            if (text && text.includes('?')) {
                let i = 1;
                text = text.replace(/\?/g, () => `$${i++}`);
            }
            const result = await client.query(text, params);
            return [result.rows, result.fields];
        } finally {
            client.release();
        }
    },
    getConnection: async () => {
        const client = await pool.connect();
        return client;
    }
};