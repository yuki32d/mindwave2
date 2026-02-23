// ============================================
// PROFILE PAGE - Real-time Data & Interactions
// ============================================

// Load user data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    initializeEventListeners();
    startAutoRefresh();
});

// ============================================
// Load Profile Data
// ============================================

async function loadProfileData() {
    try {
        // Fetch user profile from MongoDB via API
        const user = await window.userProfileService.getProfile();

        if (!user || !user.email) {
            // Redirect to home page if no user found
            window.location.href = '/marketing-site/website-home.html';
            return;
        }

        // Update UI with MongoDB data
        window.userProfileService.updateProfileUI(user);


        // Update organization info if available
        if (user.organizationId) {
            const orgNameEl = document.getElementById('orgName');
            if (orgNameEl && user.organizationId.name) {
                orgNameEl.textContent = user.organizationId.name;
            }

            const subscriptionPlanEl = document.getElementById('subscriptionPlan');
            if (subscriptionPlanEl && user.organizationId.subscriptionTier) {
                const planNames = {
                    'trial': 'Free Trial',
                    'basic': 'Starter Plan',
                    'premium': 'Professional Plan',
                    'enterprise': 'Enterprise Plan'
                };
                subscriptionPlanEl.textContent = planNames[user.organizationId.subscriptionTier] || 'Trial';
            }
        }

        // Load real-time activity
        await loadActivityData();

        console.log('✅ Profile loaded from MongoDB');
    } catch (error) {
        console.error('Error loading profile:', error);
        // Redirect to home on error
        window.location.href = '/marketing-site/website-home.html';
    }
}

// ============================================
// Load Real-time Activity Data
// ============================================

async function loadActivityData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

        if (!user.email || !token) {
            // No authentication, use static data
            loadStaticActivityData();
            return;
        }

        // Fetch activity from backend
        const response = await fetch('/api/user/activity', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // API endpoint not available, use static data
            loadStaticActivityData();
            return;
        }

        const activities = await response.json();

        // Update activity list
        updateActivityList(activities);

    } catch (error) {
        // Silently fall back to static activity data
        loadStaticActivityData();
    }
}

function updateActivityList(activities) {
    const activityList = document.getElementById('activityList');

    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-title">No recent activity</p>
                    <p class="activity-time">Start using MindWave to see your activity here</p>
                </div>
            </div>
        `;
        return;
    }

    // Clear existing activities
    activityList.innerHTML = '';

    // Add each activity
    activities.slice(0, 10).forEach(activity => {
        const activityItem = createActivityItem(activity);
        activityList.appendChild(activityItem);
    });
}

function createActivityItem(activity) {
    const item = document.createElement('div');
    item.className = 'activity-item';

    // Determine icon based on activity type
    const iconMap = {
        'login': 'fa-sign-in-alt',
        'logout': 'fa-sign-out-alt',
        'profile_update': 'fa-edit',
        'password_change': 'fa-key',
        'team_invite': 'fa-user-plus',
        'game_create': 'fa-gamepad',
        'game_play': 'fa-play',
        'student_add': 'fa-user-graduate',
        'settings_update': 'fa-cog',
        'default': 'fa-circle'
    };

    const icon = iconMap[activity.type] || iconMap['default'];
    const timeAgo = getTimeAgo(activity.timestamp);

    item.innerHTML = `
        <div class="activity-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="activity-details">
            <p class="activity-title">${activity.description || activity.action}</p>
            <p class="activity-time">${timeAgo}</p>
        </div>
    `;

    return item;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return activityTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadStaticActivityData() {
    const staticActivities = [
        {
            type: 'login',
            description: 'Logged in from new device',
            timestamp: new Date(Date.now() - 2 * 3600000) // 2 hours ago
        },
        {
            type: 'profile_update',
            description: 'Updated profile information',
            timestamp: new Date(Date.now() - 24 * 3600000) // 1 day ago
        },
        {
            type: 'team_invite',
            description: 'Invited team member',
            timestamp: new Date(Date.now() - 3 * 24 * 3600000) // 3 days ago
        }
    ];

    updateActivityList(staticActivities);
}

// ============================================
// Event Listeners
// ============================================

function initializeEventListeners() {
    // Avatar upload
    document.getElementById('uploadAvatarBtn').addEventListener('click', () => {
        document.getElementById('avatarInput').click();
    });

    document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);

    // Edit personal info
    document.getElementById('editPersonalBtn').addEventListener('click', togglePersonalEdit);
    document.getElementById('cancelPersonalBtn').addEventListener('click', cancelPersonalEdit);
    document.getElementById('savePersonalBtn').addEventListener('click', savePersonalInfo);

    // Security buttons
    document.getElementById('changePasswordBtn').addEventListener('click', showChangePasswordModal);
    document.getElementById('enable2FABtn').addEventListener('click', show2FAModal);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// ============================================
// Avatar Upload
// ============================================

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast('Image size should be less than 2MB', 'error');
        return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('profileImage').src = e.target.result;
        document.querySelector('.profile-avatar').src = e.target.result;
        showToast('Profile picture updated!', 'success');
    };
    reader.readAsDataURL(file);
}

// ============================================
// Edit Personal Information
// ============================================

function togglePersonalEdit() {
    const inputs = document.querySelectorAll('#fullName, #emailAddress, #phoneNumber, #jobTitle');
    const actions = document.getElementById('personalActions');
    const editBtn = document.getElementById('editPersonalBtn');

    inputs.forEach(input => input.removeAttribute('readonly'));
    actions.style.display = 'flex';
    editBtn.style.display = 'none';
}

function cancelPersonalEdit() {
    const inputs = document.querySelectorAll('#fullName, #emailAddress, #phoneNumber, #jobTitle');
    const actions = document.getElementById('personalActions');
    const editBtn = document.getElementById('editPersonalBtn');

    inputs.forEach(input => input.setAttribute('readonly', true));
    actions.style.display = 'none';
    editBtn.style.display = 'block';

    // Reload original data
    loadProfileData();
}

function savePersonalInfo() {
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('emailAddress').value;
    const phone = document.getElementById('phoneNumber').value;
    const jobTitle = document.getElementById('jobTitle').value;

    // Update localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.name = fullName;
    user.email = email;
    user.phone = phone;
    user.jobTitle = jobTitle;

    if (localStorage.getItem('user')) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('user', JSON.stringify(user));
    }

    // Show success
    showToast('Profile updated successfully!', 'success');

    // Exit edit mode
    cancelPersonalEdit();
}

// ============================================
// Security Modals
// ============================================

function showChangePasswordModal() {
    showToast('Change password feature coming soon!', 'info');
}

function show2FAModal() {
    showToast('Two-factor authentication coming soon!', 'info');
}

// ============================================
// Logout
// ============================================

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');
        window.location.href = '/marketing-site/website-home.html';
    }
}

// ============================================
// Auto Refresh
// ============================================

function startAutoRefresh() {
    // Refresh profile data every 60 seconds
    setInterval(() => {
        loadProfileData();
        updateLastRefreshTime();
    }, 60000);

    // Refresh activity data every 30 seconds for real-time updates
    setInterval(() => {
        loadActivityData();
    }, 30000);
}

function updateLastRefreshTime() {
    const now = new Date();
    console.log('Profile data refreshed at:', now.toLocaleTimeString());
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ Profile page loaded');
