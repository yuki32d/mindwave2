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
        // Get user from localStorage
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

        if (!user || !user.email) {
            window.location.href = '/marketing-site/admin-login.html';
            return;
        }

        // Update profile UI
        document.getElementById('profileName').textContent = user.name || 'User';
        document.getElementById('profileEmail').textContent = user.email || '';
        document.getElementById('profileRole').textContent = user.orgRole || 'Member';
        document.getElementById('fullName').value = user.name || '';
        document.getElementById('emailAddress').value = user.email || '';
        document.getElementById('userRole').textContent = (user.orgRole || 'member').toUpperCase();

        // Set member since (mock data for now)
        const memberSince = new Date();
        memberSince.setMonth(memberSince.getMonth() - 3);
        document.getElementById('memberSince').textContent = memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Set last login
        document.getElementById('lastLogin').textContent = 'Just now';

        // Load organization data
        document.getElementById('orgName').textContent = 'CMRIT MCA Department';
        document.getElementById('subscriptionPlan').textContent = 'Premium Plan';
        document.getElementById('teamSize').textContent = '1 member';

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile data', 'error');
    }
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
