// public/js/user/history.js

(function() {
    'use strict';

    // ==================== STATE MANAGEMENT ====================
    let historySubmissions = [];
    let filteredSubmissions = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    // ==================== INISIALISASI ====================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ History.js initialized');
        
        const dataElement = document.getElementById('history-data');
        
        if (!dataElement) {
            console.error('❌ Element history-data tidak ditemukan');
            historySubmissions = [];
        } else {
            try {
                const rawData = dataElement.dataset.history;
                if (rawData && rawData !== 'undefined' && rawData !== 'null') {
                    const jsonStr = rawData.replace(/\\'/g, "'");
                    historySubmissions = JSON.parse(jsonStr);
                    console.log(`📦 Loaded ${historySubmissions.length} submissions from data attribute`);
                } else {
                    console.log('📦 No data in attribute');
                    historySubmissions = [];
                }
            } catch (error) {
                console.error('❌ Error parsing history data:', error);
                historySubmissions = [];
            }
        }

        filteredSubmissions = [...historySubmissions];
        setupFilters();
        renderTable();
        setupModalEvents();
        
        console.log('📊 Total submissions:', historySubmissions.length);
        if (historySubmissions.length > 0) {
            console.log('📋 First item sample:', historySubmissions[0]);
        }
        console.log('🔍 filteredSubmissions length:', filteredSubmissions.length);
    });

    // ==================== FUNGSI MENENTUKAN JENIS PENGUJIAN ====================
    function getJenisPengujian(item) {
        if (item.service_type) {
            if (item.service_type.includes('KONSTRUKSI')) {
                return 'PENGUJIAN KONSTRUKSI';
            } else if (item.service_type.includes('BAHAN')) {
                return 'PENGUJIAN BAHAN';
            }
        }
        
        if (item.service_name) {
            const serviceName = item.service_name.toLowerCase();
            const konstruksiKeywords = ['beton', 'aspal', 'core drill', 'hammer', 'paving', 'batako', 'marshall', 'penetrasi aspal', 'titik lembek', 'titik nyala', 'ekstraksi aspal', 'kuat tekan beton', 'kuat tarik'];
            const bahanKeywords = ['agregat', 'tanah', 'besi', 'baja', 'saringan', 'berat jenis', 'kadar air', 'batas cair', 'batas plastis', 'kepadatan', 'cbr', 'abrasi', 'los angeles', 'gumpalan lempung', 'bahan lolos'];
            
            for (let keyword of konstruksiKeywords) {
                if (serviceName.includes(keyword)) {
                    return 'PENGUJIAN KONSTRUKSI';
                }
            }
            for (let keyword of bahanKeywords) {
                if (serviceName.includes(keyword)) {
                    return 'PENGUJIAN BAHAN';
                }
            }
        }
        
        if (item.service_id) {
            const serviceId = parseInt(item.service_id);
            if (serviceId >= 1 && serviceId <= 19) {
                return 'PENGUJIAN BAHAN';
            } else if (serviceId >= 20 && serviceId <= 32) {
                return 'PENGUJIAN KONSTRUKSI';
            }
        }
        
        if (item.kode_pengujian) {
            if (item.kode_pengujian.includes('Bahan') || item.kode_pengujian.includes('BAHAN')) {
                return 'PENGUJIAN BAHAN';
            } else if (item.kode_pengujian.includes('Konstruksi') || item.kode_pengujian.includes('KONSTRUKSI')) {
                return 'PENGUJIAN KONSTRUKSI';
            }
        }
        
        if (item.nama_proyek) {
            const proyek = item.nama_proyek.toLowerCase();
            if (proyek.includes('beton') || proyek.includes('aspal') || proyek.includes('jalan') || proyek.includes('konstruksi')) {
                return 'PENGUJIAN KONSTRUKSI';
            }
        }
        
        return 'PENGUJIAN BAHAN';
    }

    // ==================== FILTER FUNCTIONS ====================
    function setupFilters() {
        const searchInput = document.getElementById('searchInput');
        const typeFilter = document.getElementById('serviceTypeFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (!searchInput || !typeFilter || !statusFilter) {
            console.warn('⚠️ Filter elements not found');
            return;
        }

        const filterHandler = () => {
            const search = searchInput.value.toLowerCase().trim();
            const selectedType = typeFilter.value;
            const selectedStatus = statusFilter.value;

            filteredSubmissions = historySubmissions.filter(item => {
                const formattedId = String(item.id).padStart(6, '0');
                const formattedIdWithHash = '#' + formattedId;
                const searchFields = [
                    formattedId,
                    formattedIdWithHash,
                    item.id ? item.id.toString() : '',
                    item.no_permohonan || '',
                    item.nama_proyek || '',
                    item.kode_pengujian || '',
                    item.status || ''
                ].join(' ').toLowerCase();
                
                const matchSearch = search === '' || searchFields.includes(search);
                const itemType = getJenisPengujian(item);
                const matchType = selectedType === 'all' || itemType === selectedType;
                const matchStatus = selectedStatus === 'all' || item.status === selectedStatus;
                
                return matchSearch && matchType && matchStatus;
            });

            currentPage = 1;
            renderTable();
        };

        searchInput.addEventListener('input', filterHandler);
        typeFilter.addEventListener('change', filterHandler);
        statusFilter.addEventListener('change', filterHandler);
    }

    // ==================== RENDER TABLE ====================
    function renderTable() {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) {
            console.error('❌ Table body not found');
            return;
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = filteredSubmissions.slice(start, end);

        console.log(`📊 Rendering page ${currentPage}, items ${start}-${end}, total filtered ${filteredSubmissions.length}`);

        if (paginatedItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox fa-3x mb-3"></i>
                        <p>Data pengajuan tidak ditemukan</p>
                    </td>
                </tr>
            `;
            updatePagination();
            updateTableInfo();
            return;
        }

        tbody.innerHTML = paginatedItems.map((item) => {
            let formattedDate = '-';
            try {
                const dateStr = item.created_at;
                if (dateStr) {
                    const date = new Date(dateStr);
                    formattedDate = date.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    });
                }
            } catch (e) {
                formattedDate = '-';
            }

            const formattedId = String(item.id).padStart(6, '0');
            const jenisPengujian = getJenisPengujian(item);
            const jenisClass = jenisPengujian === 'PENGUJIAN BAHAN' ? 'badge-bahan' : 'badge-konstruksi';

            let statusClass = 'status-default';
            let statusText = item.status || '-';
            
            switch(statusText) {
                case 'Menunggu Verifikasi': statusClass = 'status-pending'; break;
                case 'Pengecekan Sampel': statusClass = 'status-info'; break;
                case 'Menunggu Pembayaran':
                case 'Menunggu SKRD Upload': statusClass = 'status-warning'; break;
                case 'Belum Bayar':
                case 'Belum Lunas': statusClass = 'status-warning'; break;
                case 'Lunas': statusClass = 'status-success'; break;
                case 'Sedang Diuji': statusClass = 'status-primary'; break;
                case 'Selesai': statusClass = 'status-completed'; break;
                default: statusClass = 'status-default';
            }

            return `
                <tr>
                    <td><strong class="text-monospace">#${formattedId}</strong></td>
                    <td><strong>${item.no_permohonan || '-'}</strong></td>
                    <td>
                        <span class="jenis-badge ${jenisClass}">
                            ${jenisPengujian}
                        </span>
                    </td>
                    <td>
                        <div style="font-weight:600; color:#1e293b;">${item.nama_proyek || '-'}</div>
                        <div style="font-size:0.8rem; color:#64748b;">${item.total_samples || 0} sampel</div>
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <a href="/user/history/${item.id}" class="btn-detail-action">
                            <span>Detail</span>
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        updatePagination();
        updateTableInfo();
    }

    // ==================== PAGINATION ====================
    function updatePagination() {
        const container = document.getElementById('pagination');
        if (!container) {
            console.warn('⚠️ Pagination container not found');
            return;
        }

        const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
        
        console.log(`📄 Updating pagination: totalPages=${totalPages}, currentPage=${currentPage}`);

        if (totalPages <= 1) {
            container.innerHTML = '';
            // Pastikan wrapper tetap terlihat
            const wrapper = document.getElementById('paginationWrapper');
            if (wrapper) wrapper.style.display = 'flex';
            return;
        }

        let html = '';
        
        html += `<button class="page-nav" ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="window.goToPage(${currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - 2 && i <= currentPage + 2)
            ) {
                html += `<button class="page-number ${i === currentPage ? 'active' : ''}" 
                            onclick="window.goToPage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span class="page-dots">...</span>`;
            }
        }

        html += `<button class="page-nav" ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="window.goToPage(${currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>`;

        container.innerHTML = html;

        // Pastikan wrapper terlihat
        const wrapper = document.getElementById('paginationWrapper');
        if (wrapper) wrapper.style.display = 'flex';
    }

    function updateTableInfo() {
        const info = document.getElementById('tableInfo');
        if (!info) {
            console.warn('⚠️ Table info element not found');
            return;
        }

        if (filteredSubmissions.length === 0) {
            info.innerText = 'Menampilkan 0 data';
            return;
        }

        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, filteredSubmissions.length);
        
        info.innerText = `Menampilkan ${start}-${end} dari ${filteredSubmissions.length} pengajuan`;
    }

    // ==================== MODAL FUNCTIONS ====================
    function setupModalEvents() {
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }
    }

    // ==================== WINDOW FUNCTIONS ====================
    window.goToPage = (page) => {
        if (page < 1 || page > Math.ceil(filteredSubmissions.length / itemsPerPage)) return;
        currentPage = page;
        renderTable();
        document.querySelector('.history-table-container')?.scrollIntoView({ behavior: 'smooth' });
    };

    window.closeModal = () => {
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

})();