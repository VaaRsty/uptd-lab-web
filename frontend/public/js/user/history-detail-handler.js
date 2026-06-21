// public/js/user/history-detail-handler.js

(function() {
    'use strict';

    // ==================== STATUS CONFIG (LANGSUNG DI DEFINE) ====================
    const STATUS_CONFIG = {
        // Urutan status dari awal sampai akhir
        statuses: [
            { key: 'Menunggu Verifikasi', label: 'Pengajuan Diterima', icon: 'fa-file', color: 'secondary' },
            { key: 'Pengecekan Sampel', label: 'Pengecekan Sampel', icon: 'fa-search', color: 'info' },
            { key: 'Belum Bayar', label: 'Menunggu Pembayaran', icon: 'fa-credit-card', color: 'danger' },
            { key: 'Menunggu SKRD Upload', label: 'Menunggu SKRD', icon: 'fa-file-invoice', color: 'warning' },
            { key: 'Belum Lunas', label: 'Pembayaran Sebagian', icon: 'fa-hourglass-half', color: 'warning' },
            { key: 'Lunas', label: 'Pembayaran Lunas', icon: 'fa-check-circle', color: 'success' },
            { key: 'Sedang Diuji', label: 'Proses Pengujian', icon: 'fa-flask', color: 'primary' },
            { key: 'Selesai', label: 'Pengujian Selesai', icon: 'fa-check-double', color: 'success' },
            { key: 'Dibatalkan', label: 'Dibatalkan', icon: 'fa-ban', color: 'danger' }
        ],

        getTimelineHtml: function(statusKey) {
            const statuses = this.statuses;
            let currentIndex = statuses.findIndex(s => s.key === statusKey);
            if (currentIndex === -1) currentIndex = 0;

            let html = '';
            const total = statuses.length;

            statuses.forEach((status, index) => {
                let statusClass = '';
                let iconHtml = '';

                if (index < currentIndex) {
                    statusClass = 'completed';
                    iconHtml = `<i class="fas fa-check-circle text-success"></i>`;
                } else if (index === currentIndex) {
                    statusClass = 'current';
                    iconHtml = `<i class="fas fa-spinner fa-pulse text-primary"></i>`;
                } else {
                    statusClass = 'pending';
                    iconHtml = `<i class="far fa-circle text-muted"></i>`;
                }

                html += `
                    <div class="timeline-item ${statusClass}">
                        <div class="timeline-icon">${iconHtml}</div>
                        <div class="timeline-content">
                            <span class="timeline-label">${status.label}</span>
                            ${index === currentIndex ? '<span class="timeline-badge badge badge-primary ms-2">Sedang Berjalan</span>' : ''}
                            ${index < currentIndex ? '<span class="timeline-badge badge badge-success ms-2">Selesai</span>' : ''}
                        </div>
                    </div>
                `;
            });

            return html;
        }
    };

    // ==================== STATE ====================
    let currentSubmissionData = null;
    let hasKuisioner = false;

    // ==================== DOM READY ====================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ History Detail Handler initialized');
        
        const token = document.getElementById('currentUserToken')?.value || getTokenFromCookie() || getTokenFromMeta();
        console.log('🔑 Token:', token ? 'ADA' : 'TIDAK ADA');
        
        if (!token) {
            console.error('❌ Token tidak ditemukan!');
            showError('Token tidak ditemukan. Silakan login ulang.');
            return;
        }
        
        window.userToken = token;
        
        const submissionId = document.getElementById('currentSubmissionId')?.value || 
                            window.location.pathname.split('/').pop();
        
        console.log('🔍 Submission ID:', submissionId);
        
        if (!submissionId || submissionId === 'detail' || submissionId === 'history') {
            showError('ID pengajuan tidak valid');
            return;
        }
        
        loadSubmissionDetail(submissionId, token);
    });

    // ==================== HELPER FUNCTIONS ====================
    function getTokenFromCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' || name === 'uptd.sid') {
                return value;
            }
        }
        return null;
    }

    function getTokenFromMeta() {
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        return metaToken ? metaToken.getAttribute('content') : null;
    }

    function normalizeFilename(filename) {
        if (!filename) return '';
        return filename.split('/').pop().split('\\').pop().trim();
    }

    function buildProtectedFileUrl(fileType, filename, token) {
        const safeName = normalizeFilename(filename);
        if (!safeName) return '#';
        const baseUrl = 'http://localhost:5000/api/file';
        return `${baseUrl}/${fileType}/${encodeURIComponent(safeName)}`;
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {
            return '-';
        }
    }

    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    function showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    // ==================== LOAD DATA ====================
    async function loadSubmissionDetail(id, token) {
        console.log('🔄 Loading detail for ID:', id);
        
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('contentState').style.display = 'none';
        document.getElementById('errorState').style.display = 'none';
        
        try {
            const API_URL = 'http://localhost:5000/api';
            const endpoint = `${API_URL}/user/history/${id}`;
            
            console.log('📡 Fetching:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            console.log('📡 Response status:', response.status);

            if (response.status === 401) {
                showError('Sesi habis. Silakan login ulang.');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 Data dari API:', result);

            if (result.success) {
                currentSubmissionData = result.data;
                hasKuisioner = result.data.kuisioner ? true : false;
                
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('contentState').style.display = 'block';
                
                fillData(result.data, token);
            } else {
                throw new Error(result.message || 'Gagal memuat data');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            showError(error.message || 'Terjadi kesalahan');
        }
    }

    // ==================== FILL DATA ====================
    function fillData(data, token) {
        console.log('📝 Mengisi data:', data);
        
        const formattedId = String(data.id).padStart(6, '0');
        setText('det-id', data.no_permohonan ? `#${data.no_permohonan}` : `#${formattedId}`);
        setText('det-status', data.status || '-');
        setText('det-date', formatDate(data.created_at));
        
        // Perusahaan
        setText('det-company', data.nama_instansi || '-');
        setText('det-pic', data.nama_pemohon || '-');
        setText('det-address', data.alamat_pemohon || '-');
        
        const contact = [];
        if (data.email_pemohon) contact.push(data.email_pemohon);
        if (data.nomor_telepon) contact.push(data.nomor_telepon);
        setText('det-contact', contact.join(' / ') || '-');
        setText('det-email', data.email_pemohon || '-');
        
        // Proyek
        setText('det-project', data.nama_proyek || '-');
        setText('det-project-location', data.lokasi_proyek || '-');
        
        // Material & Layanan
        if (data.samples && data.samples.length > 0) {
            const sample = data.samples[0];
            setText('det-sample-type', sample.jenis_sample || '-');
            setText('det-method', sample.method_at_time || sample.method || '-');
            setText('det-service-name', sample.nama_identitas_sample || '-');
            
            const qty = sample.jumlah_sample_angka || 1;
            setText('det-qty', qty);
            
            const unitPrice = parseFloat(sample.price_at_time) || 0;
            setText('det-unit-price', formatRupiah(unitPrice));
            
            const subtotal = qty * unitPrice;
            setText('det-subtotal', formatRupiah(subtotal));
            
            const totalTagihan = data.payment?.total_tagihan || subtotal;
            setText('det-total', formatRupiah(totalTagihan));
        } else {
            setText('det-sample-type', '-');
            setText('det-method', '-');
            setText('det-service-name', '-');
            setText('det-qty', '1');
            setText('det-unit-price', formatRupiah(0));
            setText('det-subtotal', formatRupiah(0));
            setText('det-total', formatRupiah(0));
        }

        // Informasi Pembayaran
        if (data.payment) {
            setText('det-invoice', data.payment.no_invoice || '-');
            setText('det-bill', formatRupiah(data.payment.total_tagihan || 0));
            setText('det-paid', formatRupiah(data.payment.jumlah_dibayar || 0));
            
            const sisa = (data.payment.total_tagihan || 0) - (data.payment.jumlah_dibayar || 0);
            setText('det-remaining', formatRupiah(sisa));
            
            let paymentStatus = data.payment.status_pembayaran || '-';
            let statusClass = '';
            if (paymentStatus === 'Lunas') statusClass = 'badge-soft-success';
            else if (paymentStatus === 'Belum Lunas' || paymentStatus === 'Belum Bayar') statusClass = 'badge-soft-danger';
            else if (paymentStatus === 'Menunggu SKRD Upload') statusClass = 'badge-soft-warning';
            
            document.getElementById('det-payment-status').innerHTML = `<span class="badge ${statusClass}">${paymentStatus}</span>`;
            setText('det-payment-date', data.payment.bukti_pembayaran_1_uploaded_at ? formatDate(data.payment.bukti_pembayaran_1_uploaded_at) : '-');
            
            renderPaymentProofs(data.payment, token);
        } else {
            setText('det-invoice', '-');
            setText('det-bill', formatRupiah(0));
            setText('det-paid', formatRupiah(0));
            setText('det-remaining', formatRupiah(0));
            document.getElementById('det-payment-status').innerHTML = '-';
            setText('det-payment-date', '-');
        }
        
        // Dokumen
        renderDocuments(data, token);
        
        // Laporan & Kuisioner
        renderLaporanWithKuisioner(data, token);
        
        // Catatan Admin
        if (data.catatan_admin) {
            document.getElementById('admin-notes-section').style.display = 'block';
            setText('admin-notes', data.catatan_admin);
        }
        
        // 🔥 TIMELINE – sekarang pakai STATUS_CONFIG lokal
        renderTimeline(data);
        
        console.log('✅ Selesai mengisi data');
    }

    // ==================== RENDER TIMELINE ====================
    function renderTimeline(data) {
        const timelineEl = document.getElementById('timeline');
        if (!timelineEl) return;
        
        // 🔥 Pakai STATUS_CONFIG yang sudah didefinisikan di atas
        const timelineHtml = STATUS_CONFIG.getTimelineHtml(data.status);
        timelineEl.innerHTML = timelineHtml;
    }

    // ==================== RENDER PAYMENT PROOFS ====================
    function renderPaymentProofs(payment, token) {
        const section = document.getElementById('payment-proof-section');
        const list = document.getElementById('payment-proof-list');
        
        if (!section || !list) return;
        
        let hasProofs = false;
        let html = '';
        
        if (payment.bukti_pembayaran_1) {
            hasProofs = true;
            const fileUrl = buildProtectedFileUrl('payment', payment.bukti_pembayaran_1, token);
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 1</small>
                        ${payment.bukti_pembayaran_notes ? `<small class="text-muted d-block">Catatan: ${payment.bukti_pembayaran_notes}</small>` : ''}
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
                    </div>
                </div>
            `;
        }
        
        if (payment.bukti_pembayaran_2) {
            hasProofs = true;
            const fileUrl = buildProtectedFileUrl('payment', payment.bukti_pembayaran_2, token);
            html += `
                <div class="document-item d-flex align-items-center p-2 mb-2 border rounded">
                    <div class="doc-icon me-2">
                        <i class="fas fa-file-pdf text-danger"></i>
                    </div>
                    <div class="doc-info flex-grow-1">
                        <small>Bukti Pembayaran 2</small>
                    </div>
                    <div class="doc-action">
                        <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                        <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
                    </div>
                </div>
            `;
        }
        
        if (hasProofs) {
            section.style.display = 'block';
            list.innerHTML = html;
        }
    }

    // ==================== RENDER DOCUMENTS ====================
    function renderDocuments(data, token) {
        // Surat Permohonan
        if (data.file_surat_permohonan) {
            setText('status-doc-permohonan', '✅ Terupload');
            const fileUrl = buildProtectedFileUrl('surat', data.file_surat_permohonan, token);
            document.getElementById('action-doc-permohonan').innerHTML = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
            `;
        } else {
            setText('status-doc-permohonan', '❌ Belum diupload');
            document.getElementById('action-doc-permohonan').innerHTML = '';
        }
        
        // Scan KTP
        if (data.file_ktp) {
            setText('status-doc-ktp', '✅ Terupload');
            const fileUrl = buildProtectedFileUrl('ktp', data.file_ktp, token);
            document.getElementById('action-doc-ktp').innerHTML = `
                <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye"></i> Buka</a>
                <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-primary"><i class="fas fa-download"></i> Download</a>
            `;
        } else {
            setText('status-doc-ktp', '❌ Belum diupload');
            document.getElementById('action-doc-ktp').innerHTML = '';
        }
    }

    // ==================== LAPORAN + KUIISIONER ====================
    function renderLaporanWithKuisioner(data, token) {
        const statusLaporan = document.getElementById('status-laporan');
        const actionLaporan = document.getElementById('action-laporan');
        const laporanDate = document.getElementById('laporan-date');
        const kuisionerSection = document.getElementById('kuisioner-section');
        
        if (!statusLaporan || !actionLaporan) return;
        
        const hasReport = data.report && data.report.file_laporan;
        
        if (hasReport) {
            const fileUrl = buildProtectedFileUrl('laporan', data.report.file_laporan, token);
            
            statusLaporan.innerHTML = '<i class="fas fa-check-circle text-success"></i> Laporan siap diunduh';
            if (laporanDate) {
                laporanDate.innerHTML = `Diterbitkan: ${formatDate(data.report.tanggal_selesai || data.report.created_at)}`;
            }
            
            if (!hasKuisioner) {
                kuisionerSection.style.display = 'block';
                const existingInfo = document.querySelector('#kuisioner-section .alert-info');
                if (!existingInfo) {
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'alert alert-info mt-3 mb-0';
                    infoDiv.innerHTML = '<i class="fas fa-info-circle me-2"></i> Laporan siap diunduh. Silakan isi kuisioner terlebih dahulu.';
                    document.querySelector('#kuisioner-section .card-body-custom').appendChild(infoDiv);
                }
                actionLaporan.innerHTML = `
                    <span class="text-muted small">Laporan tersedia setelah mengisi kuisioner</span>
                `;
            } else {
                kuisionerSection.style.display = 'none';
                actionLaporan.innerHTML = `
                    <a href="#" onclick="window.openFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-outline-primary me-1">
                        <i class="fas fa-eye"></i> Preview
                    </a>
                    <a href="#" onclick="window.downloadFileWithToken('${fileUrl}', '${token}'); return false;" class="btn btn-sm btn-success">
                        <i class="fas fa-download"></i> Download
                    </a>
                `;
            }
        } else {
            statusLaporan.innerHTML = '<i class="fas fa-hourglass-half text-secondary"></i> Laporan akan tersedia setelah pengujian selesai';
            actionLaporan.innerHTML = '';
            if (laporanDate) laporanDate.innerHTML = '';
            kuisionerSection.style.display = 'none';
        }
    }

    // ==================== KUIISIONER ====================
    window.openKuisioner = function() {
        const submissionId = document.getElementById('currentSubmissionId')?.value;
        if (submissionId) {
            window.location.href = `/kuisioner/${submissionId}`;
        } else {
            alert('ID pengajuan tidak ditemukan');
        }
    };

    // ==================== FILE HANDLING ====================
    async function fetchProtectedFileBlob(url, token) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 Fetch File Status:', response.status);

            if (response.status === 401) {
                alert('Sesi habis. Silakan login ulang.');
                window.location.href = '/login';
                return null;
            }

            if (!response.ok) {
                const errorData = await response.text();
                console.error('❌ Server Error Response:', errorData);
                
                if (response.status === 404) {
                    alert('File tidak ditemukan di server. Pastikan folder uploads sudah benar.');
                } else {
                    alert('Gagal mengambil file dari server (Error ' + response.status + ')');
                }
                return null;
            }

            const blob = await response.blob();
            console.log('📦 Received Blob size:', blob.size, 'bytes');

            if (blob.size < 50) {
                console.warn('⚠️ Ukuran file sangat kecil, kemungkinan corrupt.');
                const text = await blob.text();
                console.log('📄 Isi blob kecil tersebut:', text);
                
                if (text.includes('not found') || text.includes('error')) {
                    alert('File di server rusak atau tidak terbaca.');
                    return null;
                }
            }

            return blob;
        } catch (error) {
            console.error('❌ Network Error saat fetch file:', error);
            alert('Terjadi kesalahan jaringan saat mengambil file.');
            return null;
        }
    }

    window.openFileWithToken = async function(url, token) {
        const newTab = window.open('', '_blank');
        if (!newTab) return alert('Izinkan popup browser!');
        
        newTab.document.write('<html><body style="background:#333;color:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;">Memproses dokumen...</body></html>');

        try {
            const blob = await fetchProtectedFileBlob(url, token);
            if (!blob) {
                newTab.close();
                return;
            }
            const blobUrl = window.URL.createObjectURL(blob);
            newTab.location.href = blobUrl;
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
        } catch (e) {
            newTab.close();
            alert('Gagal memuat file.');
        }
    };

    window.downloadFileWithToken = async function(url, token) {
        try {
            console.log('📥 Downloading file:', url);
            const blob = await fetchProtectedFileBlob(url, token);
            if (!blob) return;
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const urlParts = url.split('/');
            const filename = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
            console.log('✅ Download selesai:', filename);
        } catch (error) {
            console.error('❌ Error download:', error);
            alert('Gagal download file: ' + error.message);
        }
    };

})();