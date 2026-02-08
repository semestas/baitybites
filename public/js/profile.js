/**
 * Baitybites Profile Page Logic
 */

function toggleEditMode(isEdit) {
    const view = document.getElementById('profileView');
    const form = document.getElementById('profileForm');

    if (isEdit) {
        view.classList.add('hidden');
        form.classList.remove('hidden');
    } else {
        view.classList.remove('hidden');
        form.classList.add('hidden');
    }
}

function previewAvatar(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('edit-avatar-preview');
            if (preview.tagName === 'DIV') {
                // If it was a letter avatar (DIV), replace it back with an IMG
                const img = document.createElement('img');
                img.id = 'edit-avatar-preview';
                img.className = preview.className.replace('letter-avatar', 'profile-avatar');
                img.src = e.target.result;
                img.alt = 'Preview';
                preview.replaceWith(img);
            } else {
                preview.src = e.target.result;
            }
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

            // Set Avatar - don't use cache buster for Google profile images to avoid rate limiting
            // Only add timestamp for non-Google/Cloudinary URLs if needed, but safer to omit for now
            const avatarUrl = user.avatar_url || '/assets/placeholder-user.png';

            const viewAvatar = document.getElementById('view-avatar');
            const editAvatar = document.getElementById('edit-avatar-preview');

            const refreshImage = (el, id) => {
                if (!el) return;
                if (el.tagName === 'DIV') {
                    const img = document.createElement('img');
                    img.id = id;
                    img.className = el.className.replace('letter-avatar', 'profile-avatar');
                    img.src = avatarUrl;
                    img.alt = user.name || 'User';
                    el.replaceWith(img);
                } else {
                    el.src = avatarUrl;
                    el.alt = user.name || 'User';
                    if (avatarUrl.includes('googleusercontent.com')) {
                        el.setAttribute('referrerpolicy', 'no-referrer');
                    }
                }
            };

            refreshImage(viewAvatar, 'view-avatar');
            refreshImage(editAvatar, 'edit-avatar-preview');

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
            btnText.classList.add('hidden');
            btnSpinner.classList.remove('hidden');

            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('address', document.getElementById('address').value);

            const avatarInput = document.getElementById('avatar-input');
            if (avatarInput && avatarInput.files[0]) {
                formData.append('avatar', avatarInput.files[0]);
            }

            try {
                console.log('Sending profile update request...');
                const result = await apiCall('/customer/profile', {
                    method: 'PUT',
                    body: formData
                });
                console.log('Profile update result:', result);

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
                btnText.classList.remove('hidden');
                btnSpinner.classList.add('hidden');
            }
        });
    }
});
