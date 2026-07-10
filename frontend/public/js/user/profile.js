// public/js/user/profile.js

(function() {
    'use strict';

    let user = {};
    let notificationCount = 0;
    let isSubmitting = false;
    let toastTimer = null;

    function getInitials(name) {
        return (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function getAvatarUrl(avatar) {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        const baseUrl = window.__APP_CONFIG__?.API_BASE_URL.replace('/api', '') || 'http://localhost:5000';
        return `${baseUrl}${avatar}`;
    }

    function buildAvatarMarkup(avatar, imageClass, iconClass) {
        const avatarUrl = getAvatarUrl(avatar);
        const initials = getInitials(user.full_name || user.name);
        if (avatarUrl) {
            return `<img src="${avatarUrl}" alt="Profile" class="${imageClass}" 
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div class="avatar-initials" style="display:none;">${initials}</div>`;
        }
        return `<div class="avatar-initials">${initials}</div>`;
    }

    function renderProfileAvatar() {
        const profileAvatar = document.getElementById('profileAvatar');
        if (!profileAvatar) return;

        profileAvatar.innerHTML = buildAvatarMarkup(
            user.avatar,
            'profile-avatar-image',
            'profile-avatar-icon'
        );
    }

    function renderCurrentPhotoPreview() {
        const photoPreview = document.getElementById('photoPreview');
        if (!photoPreview) return;

        const avatarUrl = getAvatarUrl(user.avatar);
        const initials = getInitials(user.full_name || user.name);
        if (avatarUrl) {
            photoPreview.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="profile-current-photo-image"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <div class="avatar-initials" style="display:none; width:100px; height:100px; font-size:2rem; border-radius:50%;">${initials}</div>`;
        } else {
            photoPreview.innerHTML = `<div class="avatar-initials" style="width:100px; height:100px; font-size:2rem; border-radius:50%;">${initials}</div>`;
        }
    }

    // ================ DOM CONTENT LOADED ================
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Profile page loaded');

        document.getElementById('notifEmail')?.addEventListener('change', function() {
            updateNotificationSettings({
                notif_email: this.checked,
                notif_wa: document.getElementById('notifWa').checked
            });
        });

        document.getElementById('notifWa')?.addEventListener('change', function() {
            updateNotificationSettings({
                notif_email: document.getElementById('notifEmail').checked,
                notif_wa: this.checked
            });
        });
        
        // Load user profile from API
        loadUserProfile();
        
        setupEventListeners();
    });

    async function updateNotificationSettings(settings) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis, silakan login ulang', 'error');
                return;
            }

            const response = await fetch((window.__APP_CONFIG__?.API_BASE_URL || '/api') + '/user/notification-settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            const result = await response.json();
            if (result.success) {
                showToast('Pengaturan notifikasi berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal memperbarui pengaturan', 'error');
            }
        } catch (error) {
            console.error('Error updating notification settings:', error);
            showToast('Gagal menghubungi server', 'error');
        }
    }

    // ================ LOAD USER PROFILE FROM API ================
    async function loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.log('No token found, redirecting to login');
                window.location.href = '/login';
                return;
            }
            
            const API_URL = window.__APP_CONFIG__?.API_BASE_URL || '/api';
            
            console.log('📡 Fetching user profile...');
            
            const response = await fetch(`${API_URL}/user/profile/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            
            const result = await response.json();
            
            if (result.success) {
                user = result.data;
                console.log('✅ User profile loaded:', user);
                renderProfile();
            } else {
                console.error('Failed to load profile:', result.message);
                showToast('Gagal memuat profil', 'error');
            }
            
        } catch (error) {
            console.error('Error loading profile:', error);
            showToast('Gagal menghubungi server', 'error');
        }
    }

    // ================ RENDER PROFILE ================
    function renderProfile() {
        const setText = (id, value) => {
            const node = document.getElementById(id);
            if (node) node.textContent = value;
        };

        // Profile header
        setText('profileDisplayName', user.full_name || 'User');
        setText('profileDisplayRole', user.role || 'Customer');
        setText('profileHeaderEmail', user.email || 'Belum diisi');
        setText('profileHeaderPhone', user.nomor_telepon || 'Belum diisi');
        setText('profileHeaderCompany', user.nama_instansi || 'Belum diisi');
        
        // Personal info
        setText('displayName', user.full_name || '-');
        setText('displayEmail', user.email || '-');
        setText('displayPhone', user.nomor_telepon || '-');
        
        // Company info
        setText('displayCompany', user.nama_instansi || '-');
        setText('displayAddress', user.alamat || '-');
        
        renderProfileAvatar();
        renderCurrentPhotoPreview();

        // Sync avatar + identity to localStorage so all pages/partials can use latest profile data
        try {
            const currentUserRaw = localStorage.getItem('user');
            const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : {};
            localStorage.setItem('user', JSON.stringify({
                ...currentUser,
                full_name: user.full_name || currentUser.full_name,
                email: user.email || currentUser.email,
                nomor_telepon: user.nomor_telepon || currentUser.nomor_telepon,
                role: user.role || currentUser.role,
                nama_instansi: user.nama_instansi || currentUser.nama_instansi,
                alamat: user.alamat || currentUser.alamat,
                avatar: user.avatar || currentUser.avatar || null
            }));

            if (typeof window.syncUserAvatarUI === 'function') {
                window.syncUserAvatarUI(user.avatar || currentUser.avatar || '');
            }
        } catch (error) {
            console.warn('Failed to sync user cache:', error);
        }
        
        // Update notification badge
        updateNotificationBadge();
    }

    function openEditPersonalModal() {
        // Populate form with current data
        document.getElementById('editName').value = user.full_name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.nomor_telepon || '';
        
        // Show modal
        document.getElementById('editPersonalModal').classList.add('active');
    }

    async function savePersonalInfo() {
        if (isSubmitting) return;
        
        const name = document.getElementById('editName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        
        // Validation
        if (!name) {
            showToast('Nama lengkap harus diisi', 'warning');
            return;
        }
        
        if (!email) {
            showToast('Email harus diisi', 'warning');
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('Format email tidak valid', 'warning');
            return;
        }
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = window.__APP_CONFIG__?.API_BASE_URL || '/api';
            
            showToast('Menyimpan perubahan...', 'info');
            
            const response = await fetch(`${API_URL}/user/profile/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    full_name: name,
                    email: email,
                    nomor_telepon: phone
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local user object
                user = { ...user, ...result.data };
                
                // Update display
                renderProfile();
                
                // Close modal
                closeModal(document.getElementById('editPersonalModal'));
                
                showToast('Informasi pribadi berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal memperbarui profil', 'error');
            }
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function openEditCompanyModal() {
        // Populate form with current data
        document.getElementById('editCompany').value = user.nama_instansi || '';
        document.getElementById('editAddress').value = user.alamat || '';
        
        // Show modal
        document.getElementById('editCompanyModal').classList.add('active');
    }

    async function saveCompanyInfo() {
        if (isSubmitting) return;
        
        const company = document.getElementById('editCompany').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = window.__APP_CONFIG__?.API_BASE_URL || '/api';
            
            showToast('Menyimpan perubahan...', 'info');
            
            const response = await fetch(`${API_URL}/user/profile/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nama_instansi: company,
                    alamat: address
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update local user object
                user = { ...user, ...result.data };
                
                // Update display
                renderProfile();
                
                // Close modal
                closeModal(document.getElementById('editCompanyModal'));
                
                showToast('Informasi instansi berhasil diperbarui', 'success');
            } else {
                showToast(result.message || 'Gagal memperbarui profil', 'error');
            }
            
        } catch (error) {
            console.error('Error updating company:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function openChangePasswordModal() {
        // Reset form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        // Show modal
        document.getElementById('changePasswordModal').classList.add('active');
    }

    async function changePassword() {
        if (isSubmitting) return;
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!currentPassword) {
            showToast('Password saat ini harus diisi', 'warning');
            return;
        }
        
        if (!newPassword) {
            showToast('Password baru harus diisi', 'warning');
            return;
        }
        
        if (newPassword.length < 6) {
            showToast('Password minimal 6 karakter', 'warning');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('Konfirmasi password tidak cocok', 'warning');
            return;
        }
        
        isSubmitting = true;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Sesi habis. Silakan login ulang.', 'error');
                setTimeout(() => window.location.href = '/login', 1500);
                return;
            }
            
            const API_URL = window.__APP_CONFIG__?.API_BASE_URL || '/api';
            
            showToast('Mengubah password...', 'info');
            
            const response = await fetch(`${API_URL}/user/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                closeModal(document.getElementById('changePasswordModal'));
                
                showToast('Password berhasil diubah', 'success');
            } else {
                showToast(result.message || 'Gagal mengubah password', 'error');
            }
            
        } catch (error) {
            console.error('Error changing password:', error);
            showToast('Gagal menghubungi server', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showNotificationSettings() {
        showToast('Fitur notifikasi akan segera hadir!', 'info');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    function updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        const count = window.notificationCount || 0;
        badge.textContent = count > 0 ? count : '';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toast.textContent = message;
        toast.className = `custom-toast toast-${type} is-visible`;
        toast.hidden = false;

        toastTimer = setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.hidden = true;
        }, 3000);
    }

    function setupEventListeners() {
        // Edit buttons
        document.getElementById('editPersonalBtn')?.addEventListener('click', openEditPersonalModal);
        document.getElementById('editCompanyBtn')?.addEventListener('click', openEditCompanyModal);
        document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);
        document.getElementById('changePhotoBtn')?.addEventListener('click', () => {
            document.getElementById('directPhotoUpload')?.click();
        });
        
        // Direct photo upload
        document.getElementById('directPhotoUpload')?.addEventListener('change', handleDirectPhotoUpload);
        
        // Personal modal
        const personalModal = document.getElementById('editPersonalModal');
        document.getElementById('closePersonalModal')?.addEventListener('click', () => closeModal(personalModal));
        document.getElementById('cancelPersonalBtn')?.addEventListener('click', () => closeModal(personalModal));
        document.getElementById('savePersonalBtn')?.addEventListener('click', savePersonalInfo);
        
        if (personalModal) {
            personalModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(personalModal);
            });
        }
        
        // Company modal
        const companyModal = document.getElementById('editCompanyModal');
        document.getElementById('closeCompanyModal')?.addEventListener('click', () => closeModal(companyModal));
        document.getElementById('cancelCompanyBtn')?.addEventListener('click', () => closeModal(companyModal));
        document.getElementById('saveCompanyBtn')?.addEventListener('click', saveCompanyInfo);
        
        if (companyModal) {
            companyModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(companyModal);
            });
        }
        
        // Password modal
        document.getElementById('closePasswordModal')?.addEventListener('click', () => closeModal(document.getElementById('changePasswordModal')));
        document.getElementById('cancelPasswordBtn')?.addEventListener('click', () => closeModal(document.getElementById('changePasswordModal')));
        document.getElementById('savePasswordBtn')?.addEventListener('click', changePassword);
        
        const passwordModal = document.getElementById('changePasswordModal');
        if (passwordModal) {
            passwordModal.addEventListener('click', function(e) {
                if (e.target === this) closeModal(passwordModal);
            });
        }

        
        // Logout dan notification bell ditangani terpusat di public/js/sidebar.js.
    }

    // ================ EXPOSE GLOBAL FUNCTIONS ================
    window.closeModal = closeModal;

})();
