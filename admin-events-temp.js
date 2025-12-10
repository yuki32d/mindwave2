
// Admin header event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Notification button
    const notificationBtn = document.getElementById('adminNotificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            alert('Notifications feature coming soon!');
        });
    }

    // Settings button
    const settingsBtn = document.getElementById('adminSettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'faculty-settings.html';
        });
    }

    // Profile dropdown toggle
    const profileToggle = document.getElementById('adminProfileToggle');
    const profileDropdown = document.getElementById('adminProfileDropdown');

    if (profileToggle && profileDropdown) {
        // Update profile toggle with user's name
        const firstName = localStorage.getItem('firstName') || 'Admin';
        const smallElement = profileToggle.querySelector('small');
        if (smallElement) {
            smallElement.textContent = firstName;
        }

        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = profileDropdown.style.display === 'flex';
            profileDropdown.style.display = isOpen ? 'none' : 'flex';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!profileToggle.contains(event.target) && !profileDropdown.contains(event.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }

    // Sign out button
    const signOutBtn = document.getElementById('adminSignOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                await fetch(`${API_BASE}/api/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout failed', error);
            } finally {
                localStorage.removeItem('mindwave_user');
                localStorage.removeItem('mindwave_token');
                document.cookie = 'mindwave_token=; Max-Age=0; path=/;';
                window.location.href = 'login.html';
            }
        });
    }
});
