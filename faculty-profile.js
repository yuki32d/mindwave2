// Faculty Profile JavaScript
const API_BASE = 'https://mindwave2.onrender.com/api';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(targetTab).classList.add('active');
    });
});

// Edit profile button
document.querySelector('.edit-profile-btn[data-tab="settings"]').addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="settings"]').classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('settings').classList.add('active');
});

// Toggle switches
document.querySelectorAll('.switch').forEach(toggle => {
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
    });
});

// Load faculty profile data
async function loadFacultyProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'admin-login.html';
            return;
        }

        const response = await fetch(`${API_BASE}/faculty/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load profile');

        const data = await response.json();
        updateProfileUI(data);
    } catch (error) {
        console.error('Error loading profile:', error);
        // Use fallback data from localStorage
        const email = localStorage.getItem('userEmail') || 'faculty@example.com';
        const name = localStorage.getItem('userName') || 'Faculty Member';
        updateProfileUI({ email, name });
    }
}

function updateProfileUI(data) {
    // Update profile header
    const name = data.name || data.displayName || 'Faculty Member';
    const email = data.email || 'faculty@example.com';

    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = email;

    // Update avatar initials
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('avatarInitials').textContent = initials;

    // Update role badge
    const role = data.role || 'Faculty';
    const roleEmoji = role === 'admin' ? '👨‍💼' : '👨‍🏫';
    document.getElementById('roleBadge').innerHTML = `${roleEmoji} ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    // Update stats
    document.getElementById('totalClasses').textContent = data.totalClasses || 0;
    document.getElementById('totalStudents').textContent = data.totalStudents || 0;
    document.getElementById('gamesCreated').textContent = data.gamesCreated || 0;
    document.getElementById('avgEngagement').textContent = `${data.avgEngagement || 0}%`;
    document.getElementById('totalTeachingTime').textContent = `${data.totalTeachingTime || 0}h`;
    document.getElementById('completionRate').textContent = `${data.completionRate || 0}%`;

    // Update department and bio
    if (data.department) {
        document.getElementById('department').textContent = data.department;
    }
    if (data.bio) {
        document.getElementById('bioInfo').textContent = data.bio;
    }

    // Update settings form
    document.getElementById('displayName').value = name;
    document.getElementById('emailInput').value = email;
    document.getElementById('departmentInput').value = data.department || '';
    document.getElementById('bioInput').value = data.bio || '';
    document.getElementById('officeHours').value = data.officeHours || '';
}

// Load classes
async function loadClasses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/classes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load classes');

        const classes = await response.json();
        displayClasses(classes);
    } catch (error) {
        console.error('Error loading classes:', error);
        displayClasses([]);
    }
}

function displayClasses(classes) {
    const container = document.getElementById('classesGrid');

    if (classes.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 48px; color: #9ea4b6;">
                <p style="font-size: 48px; margin-bottom: 16px;">📚</p>
                <p>No classes yet. Create your first class to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = classes.map(cls => `
        <div class="class-card">
            <div class="class-header">
                <div>
                    <div class="class-name">${cls.name || 'Untitled Class'}</div>
                    <div class="class-code">${cls.code || 'N/A'}</div>
                </div>
            </div>
            <div class="class-stats">
                <div class="class-stat">
                    <span>👥</span>
                    <span>${cls.studentCount || 0} students</span>
                </div>
                <div class="class-stat">
                    <span>🎮</span>
                    <span>${cls.gameCount || 0} games</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Load recent activity
async function loadActivity() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/activity`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load activity');

        const activities = await response.json();
        displayActivity(activities);
    } catch (error) {
        console.error('Error loading activity:', error);
        displayActivity([]);
    }
}

function displayActivity(activities) {
    const container = document.getElementById('activityList');

    if (activities.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #9ea4b6;">
                <p style="font-size: 48px; margin-bottom: 16px;">📊</p>
                <p>No recent activity to display.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon || '📝'}</div>
            <div class="activity-info">
                <h4>${activity.title || 'Activity'}</h4>
                <p>${activity.description || ''}</p>
            </div>
            <div class="activity-time">${formatTime(activity.timestamp)}</div>
        </div>
    `).join('');
}

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

// Photo upload
document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
    document.getElementById('profilePhotoInput').click();
});

document.getElementById('profilePhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const avatarDiv = document.getElementById('profileAvatar');
        avatarDiv.innerHTML = `<img src="${e.target.result}" alt="Profile Photo">`;
    };
    reader.readAsDataURL(file);

    // TODO: Upload to server
    console.log('Photo selected:', file.name);
});

// Save settings
document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const displayName = document.getElementById('displayName').value;
    const department = document.getElementById('departmentInput').value;
    const bio = document.getElementById('bioInput').value;
    const officeHours = document.getElementById('officeHours').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                displayName,
                department,
                bio,
                officeHours
            })
        });

        if (!response.ok) throw new Error('Failed to save settings');

        // Update localStorage
        localStorage.setItem('userName', displayName);

        // Update UI
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('department').textContent = department || 'Not set';
        document.getElementById('bioInfo').textContent = bio || 'No bio available. Add one in settings!';

        alert('✅ Profile updated successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('❌ Failed to save settings. Please try again.');
    }
});

// Change password
document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Please fill in all password fields');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password');
        }

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        alert('✅ Password changed successfully!');
    } catch (error) {
        console.error('Error changing password:', error);
        alert(`❌ ${error.message}`);
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFacultyProfile();
    loadClasses();
    loadActivity();
});
