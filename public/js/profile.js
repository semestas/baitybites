/**
 * Baitybites Profile Page Logic
 */

function toggleEditMode(isEdit) {
    document.getElementById('profileView').style.display = isEdit ? 'none' : 'block';
    document.getElementById('profileForm').style.display = isEdit ? 'block' : 'none';
}

function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('edit-avatar-preview').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function loadProfile() {
    const { apiCall } = window.app;
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const result = await apiCall('/auth/me');
        if (result.success) {
            const user = result.data;

            // Fill View Labels
            document.getElementById('view-name').textContent = user.name || '-';
            document.getElementById('view-email').textContent = user.email || '-';
            document.getElementById('view-phone').textContent = user.phone || '-';
            document.getElementById('view-address').textContent = user.address || '-';

            // Set Avatar
            const avatarUrl = user.avatar_url || '/assets/placeholder-user.png';
            const viewAvatar = document.getElementById('view-avatar');
            const editAvatar = document.getElementById('edit-avatar-preview');

            if (viewAvatar) viewAvatar.src = avatarUrl;
            if (editAvatar) editAvatar.src = avatarUrl;

            // Handle image error for view avatar (fallback to initials handled by app.js global error listener)
            if (viewAvatar) viewAvatar.alt = user.name;

            // Fill Edit Fields
            document.getElementById('name').value = user.name || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('address').value = user.address || '';

            // Update local user data
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (e) {
        console.error('Failed to load profile');
    }
}

// Global scope for onclick
window.toggleEditMode = toggleEditMode;
window.previewAvatar = previewAvatar;

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { apiCall, showNotification } = window.app;

            const btnText = document.getElementById('btnText');
            const btnSpinner = document.getElementById('btnSpinner');
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-block';

            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('address', document.getElementById('address').value);

            const avatarInput = document.getElementById('avatar-input');
            if (avatarInput && avatarInput.files[0]) {
                formData.append('avatar', avatarInput.files[0]);
            }

            try {
                const result = await apiCall('/customer/profile', {
                    method: 'PUT',
                    body: formData
                });

                if (result.success) {
                    showNotification('Profil berhasil diperbarui!', 'success');
                    // Update local storage
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        const updatedUser = { ...user, ...result.data };
                        localStorage.setItem('user', JSON.stringify(updatedUser));

                        // Reload to reflect changes (especially avatar)
                        loadProfile();
                    }
                    toggleEditMode(false);
                }
            } catch (error) {
                console.error('Update profile failed:', error);
                showNotification('Gagal memperbarui profil: ' + error.message, 'error');
            } finally {
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        });
    }
});
