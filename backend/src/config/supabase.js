const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase Client untuk Storage
const supabaseUrl = process.env.SUPABASE_URL || 'https://hahspxchyligbgjeqqcm.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_JIsw9bmvjFelr6jp0jeNkA_P8mRbE9k';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Membuat signed upload URL agar browser bisa langsung upload ke Supabase
 * tanpa melewati server (bypass Vercel timeout)
 */
const createSignedUploadUrl = async (filePath, bucketName = 'uploads') => {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath);
    if (error) throw error;
    return {
        signedUrl: data.signedUrl,
        token: data.token,
        path: filePath,
        publicUrl: `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
    };
};

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
    supabaseUrl,
    uploadToSupabase,
    createSignedUploadUrl
};
