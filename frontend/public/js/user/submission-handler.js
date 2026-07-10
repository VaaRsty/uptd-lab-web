/**
 * UPTD Lab Submission Handler
 * VERSI FIX - HIDDEN INPUTS PASTI TERKIRIM
 */

// ==================== FUNGSI GLOBAL ====================

// Data services dari backend (disimpan di global)
let servicesData = [];

// â‰¡Æ’Ã¶â”¤ TAMBAHKAN VARIABEL UNTUK MODE SIBUK
let busyModeActive = false;
let busyModePeriods = [];

// â‰¡Æ’Ã¶â”¤ VARIABEL UNTUK UNIT SATUAN
let currentUnit = 'sample';

// Di fungsi loadServicesData, perbaiki pembacaan data
function loadServicesData() {
    console.log('â‰¡Æ’Ã´Âª Loading services data from DOM...');
    
    const allSelects = document.querySelectorAll('.test-select');
    servicesData = [];
    
    allSelects.forEach(select => {
        const typeName = select.getAttribute('data-type');
        if (!typeName) return;
        
        const typeObj = {
            typeName: typeName,
            categories: []
        };
        
        const options = select.querySelectorAll('option[data-price]');
        const categoryMap = new Map();
        
        options.forEach(option => {
            if (!option.value) return;
            
            const price = option.getAttribute('data-price');
            const duration = option.getAttribute('data-duration');
            const method = option.getAttribute('data-method');
            const minSample = option.getAttribute('data-min-sample');      // angka saja
            const minSampleText = option.getAttribute('data-min-sample-text'); // "20 Kilogram"
            const unit = option.getAttribute('data-unit');
            const name = option.getAttribute('data-name');
            
            console.log(`â‰¡Æ’Ã´Ã¨ Option: ${option.value}, minSample: ${minSample}, unit: ${unit}`);
            
            // Tentukan kategori dari teks option
            const optionText = option.textContent;
            let categoryName = 'Umum';
            
            if (optionText.includes('Beton')) categoryName = 'Beton';
            else if (optionText.includes('Aspal')) categoryName = 'Aspal';
            else if (optionText.includes('Agregat')) categoryName = 'Agregat';
            else if (optionText.includes('Tanah')) categoryName = 'Tanah';
            else if (optionText.includes('Besi')) categoryName = 'Besi / Baja';
            
            if (!categoryMap.has(categoryName)) {
                categoryMap.set(categoryName, {
                    categoryName: categoryName,
                    items: []
                });
            }
            
            categoryMap.get(categoryName).items.push({
                id: option.value,
                name: name || optionText.split(' (Rp')[0],
                sample: minSampleText || minSample + ' ' + (unit || 'sample'),
                minSampleValue: parseInt(minSample) || 1,
                unit: unit || 'sample',
                duration: duration,
                price: price,
                method: method
            });
        });
        
        typeObj.categories = Array.from(categoryMap.values());
        servicesData.push(typeObj);
    });
    
    console.log('Î“Â£Ã  Services data loaded:', servicesData.length, 'types');
}

// â‰¡Æ’Ã¶â”¤ FUNGSI UNTUK UPDATE UNIT SATUAN (di card dan form)
function updateUnitDisplay(unit) {
    currentUnit = unit || 'sample';
    const unitText = document.getElementById('unitText');
    const jumlahSampleSatuan = document.getElementById('jumlahSampleSatuan');
    
    if (unitText) {
        unitText.innerText = currentUnit;
    }
    
    // Update input readonly satuan
    if (jumlahSampleSatuan) {
        jumlahSampleSatuan.value = currentUnit;
    }
}

// â‰¡Æ’Ã¶â”¤ FUNGSI UNTUK SYNC QUANTITY KE INPUT JUMLAH SAMPLE UJI
function syncQuantityToForm() {
    const qtyInput = document.getElementById('qtyInput');
    const jumlahSampleAngka = document.getElementById('jumlahSampleAngka');
    
    if (qtyInput && jumlahSampleAngka) {
        const qty = parseInt(qtyInput.value) || 1;
        jumlahSampleAngka.value = qty;
        console.log('â‰¡Æ’Ã´Ã¨ Sync quantity to form:', qty);
    }
}

// â‰¡Æ’Ã¶â”¤ FUNGSI UNTUK MENGAMBIL DATA MODE SIBUK
function loadBusyModeData() {
    const dataElement = document.getElementById('busy-mode-data');
    if (dataElement) {
        busyModeActive = dataElement.dataset.active === 'true';
        try {
            if (dataElement.dataset.periods) {
                busyModePeriods = JSON.parse(dataElement.dataset.periods) || [];
            }
        } catch (e) {
            console.error('Error parsing busy mode periods:', e);
        }
        console.log('â‰¡Æ’Ã´Ã  Busy mode active:', busyModeActive, 'Periods:', busyModePeriods);
    }
}

// â‰¡Æ’Ã¶â”¤ FUNGSI UNTUK MENDAPATKAN TAMBAHAN HARI DARI MODE SIBUK
function getBusyModeExtraDays() {
    if (!busyModeActive || busyModePeriods.length === 0) {
        return 0;
    }
    
    const today = new Date();
    let extraDays = 0;
    
    for (const period of busyModePeriods) {
        const start = new Date(period.tanggal_mulai);
        const end = new Date(period.tanggal_selesai);
        
        if (end >= today) {
            const periodEnd = end > today ? end : today;
            const daysInPeriod = Math.ceil((periodEnd - today) / (1000 * 60 * 60 * 24)) + 1;
            extraDays += Math.max(0, daysInPeriod);
        }
    }
    
    console.log('â‰¡Æ’Ã´Ã  Busy mode extra days:', extraDays);
    return extraDays;
}

// Fungsi untuk mencari detail service berdasarkan ID
function getServiceDetails(serviceId) {
    console.log('â‰¡Æ’Ã¶Ã¬ Mencari service dengan ID:', serviceId);
    
    for (const type of servicesData) {
        for (const category of type.categories) {
            for (const item of category.items) {
                if (item.id == serviceId) {
                    console.log('Î“Â£Ã  Service ditemukan:', item);
                    return {
                        serviceId: item.id,
                        serviceName: item.name,
                        price: item.price,
                        method: item.method,
                        unit: item.unit,
                        minSampleValue: item.minSampleValue,
                        testTypeId: getTestTypeId(type.typeName),
                        testCategoryId: getTestCategoryId(category.categoryName)
                    };
                }
            }
        }
    }
    console.log('Î“Â¥Ã® Service tidak ditemukan untuk ID:', serviceId);
    return null;
}

// Fungsi untuk mendapatkan test_type_id berdasarkan nama type
function getTestTypeId(typeName) {
    return typeName === 'PENGUJIAN BAHAN' ? 1 : 2;
}

// Fungsi untuk mendapatkan test_category_id berdasarkan nama kategori
function getTestCategoryId(categoryName) {
    const categoryMap = {
        'Agregat': 1,
        'Tanah': 2,
        'Besi / Baja': 3,
        'Mortar / Lainnya': 4,
        'Beton': 5,
        'Aspal': 6
    };
    return categoryMap[categoryName] || 0;
}

// Increment quantity (tombol +)
window.incrementQty = function() {
    console.log('Î“â‚§Ã² Increment button clicked');
    const qtyInput = document.getElementById('qtyInput');
    if (!qtyInput) return;
    
    let currentVal = parseInt(qtyInput.value) || 1;
    qtyInput.value = currentVal + 1;
    
    // Update harga
    updatePriceFromCurrentQty();
    syncQuantityToForm();
};

// Decrement quantity (tombol -)
window.decrementQty = function() {
    console.log('Î“â‚§Ã» Decrement button clicked');
    const qtyInput = document.getElementById('qtyInput');
    if (!qtyInput) return;
    
    let currentVal = parseInt(qtyInput.value) || 1;
    let minSample = parseInt(qtyInput.getAttribute('data-min')) || 1;
    
    if (currentVal > minSample) {
        qtyInput.value = currentVal - 1;
        updatePriceFromCurrentQty();
        syncQuantityToForm();
    } else {
        console.log('Sudah minimal');
    }
};

// Fungsi update harga berdasarkan quantity saat ini
function updatePriceFromCurrentQty() {
    const qtyInput = document.getElementById('qtyInput');
    const totalPriceEl = document.getElementById('totalPrice');
    
    if (!qtyInput || !totalPriceEl) return;
    
    const activeSelect = getActiveSelect();
    if (!activeSelect) {
        totalPriceEl.innerText = 'Rp 0';
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    const price = parseInt(selectedOption.getAttribute('data-price')) || 0;
    const qty = parseInt(qtyInput.value) || 1;
    const total = price * qty;
    
    totalPriceEl.innerText = 'Rp ' + total.toLocaleString('id-ID');
    
    const priceAtTime = document.getElementById('priceAtTime');
    if (priceAtTime) priceAtTime.value = price;
}

// Fungsi untuk mendapatkan select yang aktif
function getActiveSelect() {
    const bahanSelect = document.querySelector('select[name="uji_bahan"]');
    const konstruksiSelect = document.querySelector('select[name="uji_konstruksi"]');
    
    if (bahanSelect && bahanSelect.value !== "") return bahanSelect;
    if (konstruksiSelect && konstruksiSelect.value !== "") return konstruksiSelect;
    return null;
}

// â‰¡Æ’Ã¶â”¤ DI FUNGSI updateAll, tambahkan pemanggilan updateUnitDisplay dan syncQuantityToForm
function updateAll() {
    console.log('â‰¡Æ’Ã¶Ã¤ Update semua');
    
    const activeSelect = getActiveSelect();
    
    if (!activeSelect) {
        // Reset semua
        document.getElementById('totalPrice').innerText = 'Rp 0';
        document.getElementById('timeEstimation').innerText = '-';
        document.getElementById('testTypeId').value = '';
        document.getElementById('testCategoryId').value = '';
        document.getElementById('serviceId').value = '';
        document.getElementById('methodAtTime').value = '';
        document.getElementById('priceAtTime').value = '0';
        document.getElementById('metodeUji').value = '';
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    const selectedServiceId = activeSelect.value;
    
    // Ambil data dari option
    let price = parseInt(selectedOption.getAttribute('data-price')) || 0;
    let duration = parseInt(selectedOption.getAttribute('data-duration')) || 0;
    let method = selectedOption.getAttribute('data-method') || '-';
    let minSampleNumber = parseInt(selectedOption.getAttribute('data-min-sample')) || 1;
    let unit = selectedOption.getAttribute('data-unit') || 'sample';
    
    console.log('â‰¡Æ’Ã´Ã¨ Data dari option:', { price, duration, method, minSampleNumber, unit });
    
    // Update unit
    updateUnitDisplay(unit);
    
    // Cari detail service
    const serviceDetails = getServiceDetails(selectedServiceId);
    
    // â‰¡Æ’Ã¶Ã‘ UPDATE HIDDEN INPUTS - PASTIKAN TERISI!
    if (serviceDetails) {
        document.getElementById('testTypeId').value = serviceDetails.testTypeId || '';
        document.getElementById('testCategoryId').value = serviceDetails.testCategoryId || '';
        document.getElementById('serviceId').value = serviceDetails.serviceId || selectedServiceId;
        document.getElementById('methodAtTime').value = serviceDetails.method || method;
        document.getElementById('priceAtTime').value = serviceDetails.price || price;
        console.log('Î“Â£Ã  Hidden serviceId diisi:', document.getElementById('serviceId').value);
        console.log('Î“Â£Ã  Hidden testTypeId diisi:', document.getElementById('testTypeId').value);
    } else {
        // Fallback: pakai data dari option langsung
        document.getElementById('serviceId').value = selectedServiceId;
        document.getElementById('methodAtTime').value = method;
        document.getElementById('priceAtTime').value = price;
        console.log('Î“ÃœÃ¡âˆ©â••Ã… Service details tidak ditemukan, pakai fallback:', selectedServiceId);
    }
    
    // Update quantity
    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
        qtyInput.min = minSampleNumber;
        qtyInput.setAttribute('data-min', minSampleNumber);
        qtyInput.value = minSampleNumber;
        // Update min sample info
        const minSampleInfo = document.getElementById('minSampleInfo');
        if (minSampleInfo) {
            minSampleInfo.innerHTML = `Minimal: ${minSampleNumber} ${unit}`;
        }
    }
    
    // Update metode uji
    const metodeUji = document.getElementById('metodeUji');
    if (metodeUji) {
        metodeUji.value = method;
        metodeUji.removeAttribute('readonly');
        metodeUji.style.background = 'white';
    }
    
    // Hitung total
    const total = price * minSampleNumber;
    document.getElementById('totalPrice').innerText = 'Rp ' + total.toLocaleString('id-ID');
    document.getElementById('timeEstimation').innerText = duration + ' Hari';
    
    // Sync quantity ke form
    syncQuantityToForm();
    
    // Update estimasi selesai
    updateCompletionDate(duration);
    
    // â‰¡Æ’Ã¶Ã‘ LOG FINAL UNTUK DEBUG
    console.log('â‰¡Æ’Ã¶Ã¬ [DEBUG] Setelah updateAll - serviceId:', document.getElementById('serviceId').value);
    console.log('â‰¡Æ’Ã¶Ã¬ [DEBUG] testTypeId:', document.getElementById('testTypeId').value);
    console.log('â‰¡Æ’Ã¶Ã¬ [DEBUG] priceAtTime:', document.getElementById('priceAtTime').value);
}

// â‰¡Æ’Ã¶â”¤ FUNGSI UPDATE ESTIMASI SELESAI
function updateCompletionDate(duration) {
    const tanggalSampel = document.getElementById('tanggalSampel');
    const completionDateEl = document.getElementById('completionDate');
    const totalDaysEl = document.getElementById('totalDays');
    const busyModeInfo = document.getElementById('busyModeInfo');
    
    if (!tanggalSampel || !completionDateEl || !totalDaysEl) return;
    
    const tanggalValue = tanggalSampel.value;
    
    if (!tanggalValue) {
        completionDateEl.innerText = '-';
        totalDaysEl.innerText = '0';
        if (busyModeInfo) busyModeInfo.style.display = 'none';
        return;
    }
    
    const extraDays = getBusyModeExtraDays();
    const totalHari = 3 + 7 + (parseInt(duration) || 0) + extraDays;
    
    const startDate = new Date(tanggalValue);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalHari);
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = endDate.toLocaleDateString('id-ID', options);
    
    completionDateEl.innerText = formattedDate;
    totalDaysEl.innerText = totalHari;
    
    if (busyModeInfo) {
        if (busyModeActive && extraDays > 0) {
            busyModeInfo.style.display = 'inline';
        } else {
            busyModeInfo.style.display = 'none';
        }
    }
}

// Fungsi ketika select berubah
window.onSelectChange = function(selectElement) {
    console.log('â‰¡Æ’Ã„Â» Select berubah:', selectElement.name);
    
    const allSelects = document.querySelectorAll('.test-select');
    for (let i = 0; i < allSelects.length; i++) {
        if (allSelects[i] !== selectElement) {
            allSelects[i].value = "";
        }
    }
    
    updateAll();
};

// ==================== FUNGSI VALIDASI FILE ====================
function validateFiles() {
    const suratFileInput = document.querySelector('input[name="surat_permohonan"]');
    const ktpFileInput = document.querySelector('input[name="scan_ktp"]');
    let isValid = true;
    let errorMessage = '';
    
    // â‰¡Æ’Ã¶Ã‘ Ambil batas upload dari setting admin
    // VERCEL HARD LIMIT: 4.5MB payload limit. Kita batasi di 4MB agar tidak melebihi payload saat multipart/form-data.
    let maxUploadMB = window.settings?.max_upload_size || 5;
    if (maxUploadMB > 4) maxUploadMB = 4;
    const maxUploadBytes = maxUploadMB * 1024 * 1024;
    
    // Validasi Surat Permohonan
    if (suratFileInput && suratFileInput.files.length > 0) {
        const file = suratFileInput.files[0];
        const fileSizeKB = file.size / 1024;
        
        console.log('â‰¡Æ’Ã´Ã¼ Surat file:', {
            name: file.name,
            size: file.size + ' bytes',
            sizeKB: fileSizeKB.toFixed(2) + ' KB',
            type: file.type
        });
        
        if (file.size === 0) {
            errorMessage = 'File surat permohonan kosong (0 bytes). Silakan upload ulang file yang valid.';
            isValid = false;
        } else if (file.size < 100) {
            errorMessage = 'File surat permohonan terlalu kecil. Pastikan file yang diupload valid dan tidak corrupt.';
            isValid = false;
        } else if (file.size > maxUploadBytes) {
            errorMessage = `File surat permohonan melebihi batas maksimal ${maxUploadMB}MB!`;
            isValid = false;
        }
    } else {
        errorMessage = 'Surat permohonan wajib diupload.';
        isValid = false;
    }
    
    // Validasi Scan KTP
    if (isValid && ktpFileInput && ktpFileInput.files.length > 0) {
        const file = ktpFileInput.files[0];
        const fileSizeKB = file.size / 1024;
        
        console.log('â‰¡Æ’Ã´Ã¼ KTP file:', {
            name: file.name,
            size: file.size + ' bytes',
            sizeKB: fileSizeKB.toFixed(2) + ' KB',
            type: file.type
        });
        
        if (file.size === 0) {
            errorMessage = 'File scan KTP kosong (0 bytes). Silakan upload ulang file yang valid.';
            isValid = false;
        } else if (file.size < 100) {
            errorMessage = 'File scan KTP terlalu kecil. Pastikan file yang diupload valid dan tidak corrupt.';
            isValid = false;
        } else if (file.size > maxUploadBytes) {
            errorMessage = `File scan KTP melebihi batas maksimal ${maxUploadMB}MB!`;
            isValid = false;
        }
    } else if (isValid) {
        errorMessage = 'Scan KTP wajib diupload.';
        isValid = false;
    }
    
    if (!isValid) {
        alert(errorMessage);
    }
    
    return isValid;
}

// ==================== FUNGSI UNTUK FORCE SET HIDDEN SEBELUM SUBMIT ====================
function forceSetHiddenBeforeSubmit() {
    const activeSelect = getActiveSelect();
    if (!activeSelect || !activeSelect.value) {
        console.warn('Î“ÃœÃ¡âˆ©â••Ã… Tidak ada select aktif sebelum submit');
        return;
    }
    
    const selectedOption = activeSelect.options[activeSelect.selectedIndex];
    const serviceId = activeSelect.value;
    const price = selectedOption.getAttribute('data-price') || '0';
    const method = selectedOption.getAttribute('data-method') || '';
    
    // Force set hidden inputs
    document.getElementById('serviceId').value = serviceId;
    document.getElementById('priceAtTime').value = price;
    document.getElementById('methodAtTime').value = method;
    
    // Jika testTypeId masih kosong, coba dapatkan dari serviceDetails
    if (!document.getElementById('testTypeId').value) {
        const serviceDetails = getServiceDetails(serviceId);
        if (serviceDetails) {
            document.getElementById('testTypeId').value = serviceDetails.testTypeId || '';
            document.getElementById('testCategoryId').value = serviceDetails.testCategoryId || '';
        } else {
            // Fallback: coba dari nama select
            const selectName = activeSelect.name;
            if (selectName === 'uji_bahan') {
                document.getElementById('testTypeId').value = '1';
            } else if (selectName === 'uji_konstruksi') {
                document.getElementById('testTypeId').value = '2';
            }
        }
    }
    
    console.log('â‰¡Æ’Ã¶Ã¤ [SUBMIT] Force set hidden:', {
        serviceId: document.getElementById('serviceId').value,
        testTypeId: document.getElementById('testTypeId').value,
        testCategoryId: document.getElementById('testCategoryId').value,
        priceAtTime: document.getElementById('priceAtTime').value,
        methodAtTime: document.getElementById('methodAtTime').value,
    });
}

// ==================== INISIALISASI ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Î“Â£Ã  Handler siap - Versi database + Mode Sibuk');
    
    // LOAD DATA SERVICES DARI DOM
    loadServicesData();
    
    // LOAD DATA MODE SIBUK
    loadBusyModeData();
    
    // Set default date
    const requestDateInput = document.getElementById('request-date');
    if (requestDateInput) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        requestDateInput.value = today.toLocaleDateString('id-ID', options);
    }
    
    // Set default untuk tanggal sampel (hari ini)
    const tanggalSampel = document.getElementById('tanggalSampel');
    if (tanggalSampel && !tanggalSampel.value) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        tanggalSampel.value = `${year}-${month}-${day}`;
    }
    
    // Event untuk input manual quantity
    const qtyInput = document.getElementById('qtyInput');
    if (qtyInput) {
        qtyInput.addEventListener('input', function() {
            let val = parseInt(this.value) || 1;
            const minSample = parseInt(this.getAttribute('data-min')) || 1;
            
            if (val < minSample) {
                val = minSample;
                this.value = val;
            }
            if (val < 1) {
                val = 1;
                this.value = 1;
            }
            
            updatePriceFromCurrentQty();
            syncQuantityToForm();
        });
    }
    
    // Event untuk tanggal sampel
    if (tanggalSampel) {
        tanggalSampel.addEventListener('change', function() {
            const duration = document.getElementById('timeEstimation').innerText;
            const days = duration !== '-' ? parseInt(duration) : 0;
            updateCompletionDate(days);
        });
    }
    
    // â‰¡Æ’Ã¶Ã‘ Preview file dengan validasi - PAKAI SETTING ADMIN
    // VERCEL HARD LIMIT
    let maxUploadMB = window.settings?.max_upload_size || 5;
    if (maxUploadMB > 4) maxUploadMB = 4;
    const maxUploadBytes = maxUploadMB * 1024 * 1024;
    
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const fileSizeKB = file.size / 1024;
                console.log(`â‰¡Æ’Ã´Ã¼ ${this.name} file:`, {
                    name: file.name,
                    size: file.size + ' bytes',
                    sizeKB: fileSizeKB.toFixed(2) + ' KB',
                    type: file.type
                });
                
                // â‰¡Æ’Ã¶Ã‘ VALIDASI UKURAN FILE PAKAI SETTING ADMIN
                if (file.size === 0) {
                    alert(`File ${this.name} kosong! Silakan pilih file yang valid.`);
                    this.value = '';
                    return;
                }
                
                if (file.size > maxUploadBytes) {
                    alert(`File ${this.name} melebihi batas maksimal ${maxUploadMB}MB!`);
                    this.value = '';
                    return;
                }
                
                if (file.size < 100) {
                    alert(`File ${this.name} terlalu kecil (${file.size} bytes). Pastikan file yang dipilih valid.`);
                    this.value = '';
                    return;
                }
                
                const label = this.nextElementSibling;
                if (label && label.tagName === 'P') {
                    label.innerText = file.name;
                }
            }
        });
    });
    
    // HANDLE FORM SUBMIT
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // === VALIDASI AWAL (di luar try-catch agar finally tidak ikut jalan) ===

            // 1. Cegah double-submit
            if (this.dataset.submitting === 'true') {
                alert('Pengajuan sedang diproses, harap tunggu...');
                return;
            }

            // 2. Force set hidden inputs (safe)
            try { forceSetHiddenBeforeSubmit(); } catch(ex) { console.warn('forceSet:', ex); }

            // 3. Validasi file — jika gagal, alert muncul dari dalam validateFiles()
            if (!validateFiles()) return;

            // 4. Cek token
            const authToken = localStorage.getItem('token')
                || document.getElementById('api-auth-token')?.getAttribute('data-token')
                || '';

            if (!authToken) {
                alert('Sesi habis. Silakan login ulang.');
                window.location.href = '/login';
                return;
            }

            // === SEMUA VALID — MULAI PROSES SUBMIT ===

            const submitBtn = this.querySelector('button[type="submit"]') || this.querySelector('button');
            const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

            this.dataset.submitting = 'true';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
            }

            Swal.fire({
                title: 'Memproses...',
                text: 'Sedang mengirim pengajuan',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => { Swal.showLoading(); }
            });

            try {
                // Kumpulkan FormData (dengan file binary)
                const formData = new FormData(this);

                // Pastikan service_id ada
                if (!formData.get('service_id')) {
                    const activeSelect = getActiveSelect();
                    if (activeSelect && activeSelect.value) {
                        formData.set('service_id', activeSelect.value);
                    }
                }

                console.log('📤 [SUBMIT] Kirim ke /api/submissions...');

                // Kirim langsung ke backend (bypass frontend proxy)
                const response = await fetch('/api/submissions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    body: formData
                });

                let result;
                try {
                    result = await response.json();
                } catch (parseErr) {
                    throw new Error(`Server error ${response.status} — respons tidak valid`);
                }

                console.log('📥 [SUBMIT] Response:', response.status, result);

                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil!',
                        text: 'Pengajuan berhasil dikirim.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/user/history?success=true&message=Pengajuan+berhasil+dikirim';
                    });
                } else {
                    Swal.fire('Gagal', result.message || 'Terjadi kesalahan.', 'error');
                }

            } catch (err) {
                console.error('❌ [SUBMIT] Error:', err);
                Swal.fire('Error', 'Gagal mengirim: ' + (err.message || 'Tidak diketahui'), 'error');
            } finally {
                this.dataset.submitting = 'false';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHTML; // restore teks asli tombol
                }
            }
        });
    }

    // Initial update
    setTimeout(updateAll, 500);
});
