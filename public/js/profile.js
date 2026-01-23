/**
 * BaityBites Profile Page Logic
 */

function toggleEditMode(isEdit) {
    document.getElementById('profileView').style.display = isEdit ? 'none' : 'block';
    document.getElementById('profileForm').style.display = isEdit ? 'block' : 'none';
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

            const payload = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value
            };

            try {
                const result = await apiCall('/customer/profile', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });

                if (result.success) {
                    showNotification('Profil berhasil diperbarui!', 'success');
                    // Update local storage
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const user = JSON.parse(userStr);
                        const updatedUser = { ...user, ...result.data };
                        localStorage.setItem('user', JSON.stringify(updatedUser));

                        // Refresh labels
                        document.getElementById('view-name').textContent = updatedUser.name || '-';
                        document.getElementById('view-phone').textContent = updatedUser.phone || '-';
                        document.getElementById('view-address').textContent = updatedUser.address || '-';
                    }
                    toggleEditMode(false);
                }
            } catch (error) {
                console.error('Update profile failed:', error);
            } finally {
                btnText.style.display = 'inline-block';
                btnSpinner.style.display = 'none';
            }
        });
    }
});
