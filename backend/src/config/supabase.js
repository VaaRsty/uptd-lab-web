const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase Client untuk Storage
const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'public-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Mengunggah file (dari memory buffer) ke Supabase Storage
 * @param {Buffer} fileBuffer Buffer file
 * @param {String} originalName Nama asli file
 * @param {String} mimeType Mime type file
 * @param {String} bucketName Nama bucket di Supabase (default: 'uploads')
 * @param {String} folderPath Sub-folder di dalam bucket
 * @returns {String} URL publik file yang telah diunggah
 */
const uploadToSupabase = async (fileBuffer, originalName, mimeType, bucketName = 'uploads', folderPath = 'others') => {
    try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `${uniqueSuffix}-${originalName.replace(/\s+/g, '_')}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
                contentType: mimeType,
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error.message);
            throw error;
        }

        // Ambil URL publik
        const { data: publicUrlData } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Error uploading file to Supabase:', err);
        throw err;
    }
};

module.exports = {
    supabase,
    uploadToSupabase
};
