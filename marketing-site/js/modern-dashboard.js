// Modern Dashboard - Organization Management
// Handles welcome section, admin invitations, and student domain configuration

document.addEventListener('DOMContentLoaded', async function () {
    // Load organization data (includes verification)
    await loadOrganizationData();

    // Initialize modals
    initializeModals();

    // Initialize event listeners
    initializeEventListeners();

    // Initialize real-time dashboard data
    await initializeRealTimeData();

    // Initialize notification system
    initializeNotifications();
});

// ===================================
// Load Organization Data
// ===================================
async function loadOrganizationData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Try to get organization details from backend first
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

        if (token) {
            try {
                const response = await fetch('/api/organizations/details', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                // If successful, update with real data from backend
                if (response.ok) {
                    const data = await response.json();
                    if (data.ok && data.organization) {
                        // Update localStorage with fresh data from backend
                        if (data.organization._id) {
                            localStorage.setItem('organization_id', data.organization._id);
                        }
                        if (data.organization.name) {
                            localStorage.setItem('organization_name', data.organization.name);
                        }
                        if (data.organization.type) {
                            localStorage.setItem('organization_type', data.organization.type);
                        }

                        // Update dashboard UI with backend data
                        updateDashboardWithOrgData(data.organization);
                        return; // Exit early, we have real data
                    }
                }

                // If organization was deleted (404), show message
                if (response.status === 404) {
                    console.warn('No organization found for user');

                    // Clear organization data
                    localStorage.removeItem('organization_id');
                    localStorage.removeItem('organization_name');
                    localStorage.removeItem('organization_type');
                    localStorage.removeItem('orgRole');

                    // Show message in dashboard
                    if (document.getElementById('orgName')) {
                        document.getElementById('orgName').textContent = 'No Organization';
                    }
                    if (document.getElementById('planName')) {
                        document.getElementById('planName').innerHTML = '<a href="/marketing-site/organization-setup.html" style="color: #ef4444;">Create Organization</a>';
                    }
                    if (document.getElementById('trialStatus')) {
                        document.getElementById('trialStatus').textContent = 'Setup Required';
                    }
                    return;
                }
            } catch (apiError) {
                console.error('Error fetching organization from API:', apiError);
                // Fall through to use localStorage as fallback
            }
        }

        // Fallback to localStorage (only if API call failed or no token)
        const orgName = localStorage.getItem('organization_name') || 'Loading...';
        const orgType = localStorage.getItem('organization_type') || 'university';

        // Update organization name
        if (document.getElementById('orgName')) {
            document.getElementById('orgName').textContent = orgName;
        }

        // Update organization type
        if (document.getElementById('orgType')) {
            document.getElementById('orgType').textContent = formatOrgType(orgType);
        }

    } catch (error) {
        console.error('Error loading organization data:', error);
        // On network error, use localStorage as fallback
        if (document.getElementById('planName')) {
            document.getElementById('planName').textContent = 'Trial Plan';
        }
        if (document.getElementById('trialStatus')) {
            document.getElementById('trialStatus').textContent = '14 days remaining in trial';
        }
    }
}

function updateDashboardWithOrgData(org) {
    // Update organization details
    if (org.name) document.getElementById('orgName').textContent = org.name;
    if (org.type) document.getElementById('orgType').textContent = formatOrgType(org.type);
    if (org.subscriptionTier) document.getElementById('planName').textContent = formatPlanName(org.subscriptionTier);

    // Calculate trial days remaining
    if (org.currentPeriodEnd) {
        const daysRemaining = Math.ceil((new Date(org.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
        document.getElementById('trialStatus').textContent = `${daysRemaining} days remaining in trial`;
    }
}

function formatOrgType(type) {
    const types = {
        'university': 'University',
        'school': 'School',
        'training': 'Training Center',
        'corporate': 'Corporate',
        'bootcamp': 'Bootcamp',
        'other': 'Organization'
    };
    return types[type] || type;
}

function formatPlanName(plan) {
    return plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
}

// ===================================
// Modal Management
// ===================================
function initializeModals() {
    // Invite Admin Modal
    const inviteModal = document.getElementById('inviteAdminModal');
    const closeInviteModal = document.getElementById('closeInviteModal');
    const cancelInviteBtn = document.getElementById('cancelInviteBtn');

    closeInviteModal?.addEventListener('click', () => {
        inviteModal.style.display = 'none';
        resetInviteForm();
    });

    cancelInviteBtn?.addEventListener('click', () => {
        inviteModal.style.display = 'none';
        resetInviteForm();
    });

    // Configure Students Modal
    const studentsModal = document.getElementById('configureStudentsModal');
    const closeStudentsModal = document.getElementById('closeStudentsModal');
    const cancelStudentsBtn = document.getElementById('cancelStudentsBtn');

    closeStudentsModal?.addEventListener('click', () => {
        studentsModal.style.display = 'none';
    });

    cancelStudentsBtn?.addEventListener('click', () => {
        studentsModal.style.display = 'none';
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === inviteModal) {
            inviteModal.style.display = 'none';
            resetInviteForm();
        }
        if (e.target === studentsModal) {
            studentsModal.style.display = 'none';
        }
    });
}

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    // Invite Admin Button
    document.getElementById('inviteAdminBtn')?.addEventListener('click', openInviteAdminModal);

    // Configure Students Button
    document.getElementById('configureStudentsBtn')?.addEventListener('click', openConfigureStudentsModal);

    // Invite Admin Form
    document.getElementById('inviteAdminForm')?.addEventListener('submit', handleInviteAdmin);

    // Configure Students Form
    document.getElementById('configureStudentsForm')?.addEventListener('submit', handleConfigureStudents);

    // Add Domain Button
    document.getElementById('addDomainBtn')?.addEventListener('click', addDomainInput);

    // Copy Password Button
    document.getElementById('copyPasswordBtn')?.addEventListener('click', copyPassword);

    // Logout Button
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// ===================================
// Invite Admin Functionality
// ===================================
function openInviteAdminModal() {
    document.getElementById('inviteAdminModal').style.display = 'flex';
}

async function handleInviteAdmin(e) {
    e.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const role = document.getElementById('adminRole').value;
    const autoGenerate = document.getElementById('autoGeneratePassword').checked;

    if (!email) {
        alert('Please enter an email address');
        return;
    }

    try {
        const response = await fetch('/api/organizations/invite-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                email: email,
                role: role,
                autoGeneratePassword: autoGenerate
            })
        });

        const data = await response.json();

        if (data.ok) {
            // Show generated credentials
            if (data.credentials) {
                displayCredentials(data.credentials);
            } else {
                alert('Admin invited successfully!');
                document.getElementById('inviteAdminModal').style.display = 'none';
                resetInviteForm();
            }
        } else {
            alert(data.message || 'Failed to invite admin');
        }
    } catch (error) {
        console.error('Error inviting admin:', error);
        alert('An error occurred. Please try again.');
    }
}

function displayCredentials(credentials) {
    document.getElementById('displayEmail').textContent = credentials.email;
    document.getElementById('displayPassword').textContent = credentials.password;
    document.getElementById('credentialsDisplay').style.display = 'block';
    document.getElementById('sendInviteBtn').textContent = 'Done';
    document.getElementById('sendInviteBtn').onclick = () => {
        document.getElementById('inviteAdminModal').style.display = 'none';
        resetInviteForm();
    };
}

function copyPassword() {
    const password = document.getElementById('displayPassword').textContent;
    navigator.clipboard.writeText(password).then(() => {
        const btn = document.getElementById('copyPasswordBtn');
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });
}

function resetInviteForm() {
    document.getElementById('inviteAdminForm').reset();
    document.getElementById('credentialsDisplay').style.display = 'none';
    document.getElementById('sendInviteBtn').textContent = 'Send Invitation';
    document.getElementById('sendInviteBtn').type = 'submit';
}

// ===================================
// Configure Students Functionality
// ===================================
function openConfigureStudentsModal() {
    document.getElementById('configureStudentsModal').style.display = 'flex';
    loadExistingDomains();
}

async function loadExistingDomains() {
    try {
        const response = await fetch('/api/organizations/student-domains', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.ok && data.domains && data.domains.length > 0) {
                const domainList = document.getElementById('domainList');
                domainList.innerHTML = '';
                data.domains.forEach(domain => {
                    addDomainInput(domain);
                });
            }
        }
    } catch (error) {
        console.error('Error loading domains:', error);
    }
}

function addDomainInput(value = '') {
    const domainList = document.getElementById('domainList');
    const domainItem = document.createElement('div');
    domainItem.className = 'domain-item';
    domainItem.innerHTML = `
        <input type="text" class="domain-input" placeholder="@student.org.ac.in" value="${value}" required>
        <button type="button" class="btn-remove-domain">
            <i class="fas fa-times"></i>
        </button>
    `;

    domainItem.querySelector('.btn-remove-domain').addEventListener('click', () => {
        if (domainList.children.length > 1) {
            domainItem.remove();
        } else {
            alert('At least one domain is required');
        }
    });

    domainList.appendChild(domainItem);
}

async function handleConfigureStudents(e) {
    e.preventDefault();

    const domainInputs = document.querySelectorAll('.domain-input');
    const domains = Array.from(domainInputs)
        .map(input => input.value.trim())
        .filter(domain => domain.length > 0);

    if (domains.length === 0) {
        alert('Please add at least one email domain');
        return;
    }

    // Validate domain format
    for (const domain of domains) {
        if (!domain.startsWith('@')) {
            alert('Email domains must start with @');
            return;
        }
    }

    try {
        const response = await fetch('/api/organizations/configure-student-domains', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                allowedDomains: domains
            })
        });

        const data = await response.json();

        if (data.ok) {
            alert('Student email domains configured successfully!');
            document.getElementById('configureStudentsModal').style.display = 'none';
        } else {
            alert(data.message || 'Failed to configure domains');
        }
    } catch (error) {
        console.error('Error configuring domains:', error);
        alert('An error occurred. Please try again.');
    }
}

// ===================================
// Utility Functions
// ===================================
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'website-signup.html';
    }
}

// Generate secure password (utility)
function generateSecurePassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ===================================
// Real-time Data Integration
// ===================================
async function initializeRealTimeData() {
    try {
        // Fetch initial dashboard stats
        const data = await window.dashboardService.getStats();

        // Skip if no data (user not set up)
        if (!data) {
            console.warn('Dashboard stats not available - skipping real-time updates');
            return;
        }

        // Update UI with real-time data
        window.dashboardService.updateDashboardUI(data);

        // Start auto-refresh (updates every 30 seconds)
        window.dashboardService.startAutoRefresh((newData) => {
            if (newData) {
                window.dashboardService.updateDashboardUI(newData);
                console.log('✓ Dashboard data auto-refreshed');
            }
        });

        console.log('✅ Real-time dashboard data initialized');
    } catch (error) {
        console.error('Failed to initialize real-time data:', error);
        // Fallback to static data from localStorage if API fails
        console.log('Using cached organization data as fallback');
    }
}

// ===================================
// Initialize Notifications
// ===================================
function initializeNotifications() {
    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const markAllReadBtn = document.getElementById('markAllRead');

    if (!notificationBell || !notificationDropdown) {
        console.warn('Notification elements not found');
        return;
    }

    // Toggle notification dropdown
    notificationBell.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isVisible = notificationDropdown.style.display === 'block';

        if (isVisible) {
            notificationDropdown.style.display = 'none';
        } else {
            // Fetch and display notifications
            try {
                const data = await window.notificationService.fetchNotifications();
                window.notificationService.renderNotifications(data.notifications);
                notificationDropdown.style.display = 'block';
            } catch (error) {
                console.error('Failed to load notifications:', error);
            }
        }
    });

    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                await window.notificationService.markAllAsRead();
                const data = await window.notificationService.fetchNotifications();
                window.notificationService.renderNotifications(data.notifications);
            } catch (error) {
                console.error('Failed to mark all as read:', error);
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.style.display = 'none';
        }
    });

    // Start polling for new notifications
    window.notificationService.startPolling();

    console.log('✅ Notification system initialized');
}
