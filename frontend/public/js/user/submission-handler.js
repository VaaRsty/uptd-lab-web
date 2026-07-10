/**
 * UPTD Lab Submission Handler
 * VERSI FIX - HIDDEN INPUTS PASTI TERKIRIM
 */

// ==================== FUNGSI GLOBAL ====================

// Data services dari backend (disimpan di global)
let servicesData = [];

// 🔴 TAMBAHKAN VARIABEL UNTUK MODE SIBUK
let busyModeActive = false;
let busyModePeriods = [];

// 🔴 VARIABEL UNTUK UNIT SATUAN
let currentUnit = 'sample';

// Di fungsi loadServicesData, perbaiki pembacaan data
function loadServicesData() {
    console.log('📦 Loading services data from DOM...');
    
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
            
            console.log(`📊 Option: ${option.value}, minSample: ${minSample}, unit: ${unit}`);
            
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
    
    console.log('✅ Services data loaded:', servicesData.length, 'types');
}

// 🔴 FUNGSI UNTUK UPDATE UNIT SATUAN (di card dan form)
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

// 🔴 FUNGSI UNTUK SYNC QUANTITY KE INPUT JUMLAH SAMPLE UJI
function syncQuantityToForm() {
    const qtyInput = document.getElementById('qtyInput');
    const jumlahSampleAngka = document.getElementById('jumlahSampleAngka');
    
    if (qtyInput && jumlahSampleAngka) {
        const qty = parseInt(qtyInput.value) || 1;
        jumlahSampleAngka.value = qty;
        console.log('📊 Sync quantity to form:', qty);
    }
}

// 🔴 FUNGSI UNTUK MENGAMBIL DATA MODE SIBUK
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
        console.log('📅 Busy mode active:', busyModeActive, 'Periods:', busyModePeriods);
    }
}

// 🔴 FUNGSI UNTUK MENDAPATKAN TAMBAHAN HARI DARI MODE SIBUK
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
    
    console.log('📅 Busy mode extra days:', extraDays);
    return extraDays;
}

// Fungsi untuk mencari detail service berdasarkan ID
function getServiceDetails(serviceId) {
    console.log('🔍 Mencari service dengan ID:', serviceId);
    
    for (const type of servicesData) {
        for (const category of type.categories) {
            for (const item of category.items) {
                if (item.id == serviceId) {
                    console.log('✅ Service ditemukan:', item);
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
    console.log('❌ Service tidak ditemukan untuk ID:', serviceId);
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
    console.log('➕ Increment button clicked');
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
    console.log('➖ Decrement button clicked');
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

// 🔴 DI FUNGSI updateAll, tambahkan pemanggilan updateUnitDisplay dan syncQuantityToForm
function updateAll() {
    console.log('🔄 Update semua');
    
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
    
    console.log('📊 Data dari option:', { price, duration, method, minSampleNumber, unit });
    
    // Update unit
    updateUnitDisplay(unit);
    
    // Cari detail service
    const serviceDetails = getServiceDetails(selectedServiceId);
    
    // 🔥 UPDATE HIDDEN INPUTS - PASTIKAN TERISI!
    if (serviceDetails) {
        document.getElementById('testTypeId').value = serviceDetails.testTypeId || '';
        document.getElementById('testCategoryId').value = serviceDetails.testCategoryId || '';
        document.getElementById('serviceId').value = serviceDetails.serviceId || selectedServiceId;
        document.getElementById('methodAtTime').value = serviceDetails.method || method;
        document.getElementById('priceAtTime').value = serviceDetails.price || price;
        console.log('✅ Hidden serviceId diisi:', document.getElementById('serviceId').value);
        console.log('✅ Hidden testTypeId diisi:', document.getElementById('testTypeId').value);
    } else {
        // Fallback: pakai data dari option langsung
        document.getElementById('serviceId').value = selectedServiceId;
        document.getElementById('methodAtTime').value = method;
        document.getElementById('priceAtTime').value = price;
        console.log('⚠️ Service details tidak ditemukan, pakai fallback:', selectedServiceId);
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
    
    // 🔥 LOG FINAL UNTUK DEBUG
    console.log('🔍 [DEBUG] Setelah updateAll - serviceId:', document.getElementById('serviceId').value);
    console.log('🔍 [DEBUG] testTypeId:', document.getElementById('testTypeId').value);
    console.log('🔍 [DEBUG] priceAtTime:', document.getElementById('priceAtTime').value);
}

// 🔴 FUNGSI UPDATE ESTIMASI SELESAI
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
    console.log('🎯 Select berubah:', selectElement.name);
    
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
    
    // 🔥 Ambil batas upload dari setting admin
    // VERCEL HARD LIMIT: 4.5MB payload limit. Kita batasi di 4MB agar tidak melebihi payload saat multipart/form-data.
    let maxUploadMB = window.settings?.max_upload_size || 5;
    if (maxUploadMB > 4) maxUploadMB = 4;
    const maxUploadBytes = maxUploadMB * 1024 * 1024;
    
    // Validasi Surat Permohonan
    if (suratFileInput && suratFileInput.files.length > 0) {
        const file = suratFileInput.files[0];
        const fileSizeKB = file.size / 1024;
        
        console.log('📁 Surat file:', {
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
        
        console.log('📁 KTP file:', {
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
        console.warn('⚠️ Tidak ada select aktif sebelum submit');
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
    
    console.log('🔄 [SUBMIT] Force set hidden:', {
        serviceId: document.getElementById('serviceId').value,
        testTypeId: document.getElementById('testTypeId').value,
        testCategoryId: document.getElementById('testCategoryId').value,
        priceAtTime: document.getElementById('priceAtTime').value,
        methodAtTime: document.getElementById('methodAtTime').value,
    });
}

// ==================== INISIALISASI ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ Handler siap - Versi database + Mode Sibuk');
    
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
    
    // 🔥 Preview file dengan validasi - PAKAI SETTING ADMIN
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
                console.log(`📁 ${this.name} file:`, {
                    name: file.name,
                    size: file.size + ' bytes',
                    sizeKB: fileSizeKB.toFixed(2) + ' KB',
                    type: file.type
                });
                
                // 🔥 VALIDASI UKURAN FILE PAKAI SETTING ADMIN
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
    
    // 🔥 HANDLE FORM SUBMIT (PERBAIKAN UTAMA)
    const form = document.getElementById('applicationForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 🔥 FORCE SET HIDDEN INPUTS SEBELUM VALIDASI
            forceSetHiddenBeforeSubmit();
            
            if (!validateFiles()) return;
            if (this.dataset.submitting === 'true') return;
            
            this.dataset.submitting = 'true';
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
            
            Swal.fire({
                title: 'Memproses...',
                text: 'Sedang mengirim pengajuan',
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
            
            try {
                const formData = new FormData(this);
                
                // 🔥 KOMPRESI GAMBAR CLIENT-SIDE (DIOPTIMASI)
                async function compressImage(file) {
                    if (!file || !file.type.startsWith('image/')) return file;
                    return new Promise((resolve) => {
                        const img = new Image();
                        const objectUrl = URL.createObjectURL(file);
                        img.src = objectUrl;
                        
                        img.onload = () => {
                            URL.revokeObjectURL(objectUrl);
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_DIM = 1200;
                            
                            if (width > height && width > MAX_DIM) {
                                height *= MAX_DIM / width;
                                width = MAX_DIM;
                            } else if (height > MAX_DIM) {
                                width *= MAX_DIM / height;
                                height = MAX_DIM;
                            }
                            
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            canvas.toBlob(blob => {
                                if (blob && blob.size < file.size) {
                                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                                } else {
                                    resolve(file);
                                }
                            }, 'image/jpeg', 0.75);
                        };
                        img.onerror = () => {
                            URL.revokeObjectURL(objectUrl);
                            resolve(file);
                        };
                    });
                }
                
                const fileInputs = ['surat_permohonan', 'scan_ktp', 'lampiran_pendukung'];
                for (let inputName of fileInputs) {
                    const fileInput = document.querySelector(`input[name="${inputName}"]`);
                    if (fileInput && fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        if (file.type.startsWith('image/')) {
                            Swal.update({ text: `Mengompresi ${inputName.replace('_', ' ')}...` });
                            const compressed = await compressImage(file);
                            formData.set(inputName, compressed);
                        }
                    }
                }
                Swal.update({ text: 'Sedang mengirim pengajuan...' });

                
                // 🔥 LOG SEMUA FORM DATA (TERMASUK HIDDEN)
                console.log('📤 [SUBMIT] FormData yang dikirim:');
                for (let pair of formData.entries()) {
                    console.log(`  ${pair[0]}:`, pair[1] instanceof File ? pair[1].name : pair[1]);
                }
                
                // Pastikan hidden inputs tetap ada di FormData (jika kosong, set default)
                if (!formData.has('service_id') || !formData.get('service_id')) {
                    const activeSelect = getActiveSelect();
                    if (activeSelect && activeSelect.value) {
                        formData.set('service_id', activeSelect.value);
                        console.log('🔄 [SUBMIT] Set service_id via FormData:', activeSelect.value);
                    }
                }
                if (!formData.has('test_type_id') || !formData.get('test_type_id')) {
                    const activeSelect = getActiveSelect();
                    if (activeSelect) {
                        const selectName = activeSelect.name;
                        const testTypeId = selectName === 'uji_bahan' ? '1' : '2';
                        formData.set('test_type_id', testTypeId);
                        console.log('🔄 [SUBMIT] Set test_type_id via FormData:', testTypeId);
                    }
                }
                if (!formData.has('price_at_time') || formData.get('price_at_time') === '0') {
                    const activeSelect = getActiveSelect();
                    if (activeSelect && activeSelect.value) {
                        const selectedOption = activeSelect.options[activeSelect.selectedIndex];
                        const price = selectedOption.getAttribute('data-price') || '0';
                        formData.set('price_at_time', price);
                        console.log('🔄 [SUBMIT] Set price_at_time via FormData:', price);
                    }
                }
                
                // 🚀 DIRECT SUBMIT ke backend API (skip frontend proxy agar file hanya upload 1x)
                const authToken = document.getElementById('api-auth-token')?.getAttribute('data-token') || '';
                
                const fetchOptions = {
                    method: 'POST',
                    body: formData
                };
                
                // Jika token tersedia, kirim langsung ke backend API untuk menghindari double-upload
                let submitUrl = '/user/submission';
                if (authToken) {
                    fetchOptions.headers = { 'Authorization': `Bearer ${authToken}` };
                    submitUrl = '/api/submissions';
                }
                
                const response = await fetch(submitUrl, fetchOptions);
                
                if (!response.ok) {
                    const text = await response.text();
                    console.error('❌ Response not OK:', text);
                    throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
                }
                
                const result = await response.json();
                console.log('📦 Result:', result);
                
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Pengajuan berhasil dikirim',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '/user/history?success=true&message=Pengajuan+berhasil+dikirim';
                    });
                } else {
                    Swal.fire('Error', result.message || 'Gagal mengirim pengajuan', 'error');
                }
            } catch (error) {
                console.error('❌ Error:', error);
                Swal.fire('Error', 'Terjadi kesalahan saat mengirim data: ' + error.message, 'error');
            } finally {
                this.dataset.submitting = 'false';
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }
    
    // Initial update
    setTimeout(updateAll, 500);
});