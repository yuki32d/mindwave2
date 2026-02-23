// Super Admin Dashboard - User and Organization Management
// Only accessible to super admin

let currentAction = null;
let currentData = null;

document.addEventListener('DOMContentLoaded', function () {
    // Check super admin access
    checkSuperAdminAccess();

    // Initialize tabs
    initializeTabs();

    // Load initial data
    loadStats();
    loadUsers();

    // Initialize event listeners
    initializeEventListeners();
});

// ===================================
// Authentication
// ===================================
async function checkSuperAdminAccess() {
    try {
        const response = await fetch('/api/superadmin/verify', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            alert('Access denied. Super admin only.');
            window.location.href = 'website-home.html';
            return;
        }

        const data = await response.json();
        if (data.ok) {
            document.getElementById('adminEmail').textContent = data.email;
        }
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = 'website-home.html';
    }
}

// ===================================
// Tab Management
// ===================================
function initializeTabs() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tabName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for tab
    switch (tabName) {
        case 'users':
            loadUsers();
            break;
        case 'organizations':
            loadOrganizations();
            break;
        case 'blocked':
            loadBlockedEmails();
            break;
        case 'stats':
            loadStatistics();
            break;
    }
}

// ===================================
// Load Data
// ===================================
async function loadStats() {
    try {
        const response = await fetch('/api/superadmin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            document.getElementById('totalUsers').textContent = data.stats.totalUsers;
            document.getElementById('totalOrgs').textContent = data.stats.totalOrgs;
            document.getElementById('totalBlocked').textContent = data.stats.totalBlocked;
            document.getElementById('activeUsers').textContent = data.stats.activeUsers;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/api/superadmin/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${user.organizationName || 'N/A'}</td>
            <td><span class="badge badge-${user.orgRole}">${user.orgRole || user.role}</span></td>
            <td><span class="status-badge ${user.suspended ? 'suspended' : 'active'}">${user.suspended ? 'Suspended' : 'Active'}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-action="view" data-user-id="${user._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${!user.suspended ? `
                        <button class="btn-action btn-suspend" data-action="suspend" data-user-id="${user._id}" data-email="${user.email}" title="Suspend">
                            <i class="fas fa-pause"></i>
                        </button>
                    ` : `
                        <button class="btn-action btn-activate" data-action="activate" data-user-id="${user._id}" data-email="${user.email}" title="Activate">
                            <i class="fas fa-play"></i>
                        </button>
                    `}
                    <button class="btn-action btn-block" data-action="block" data-email="${user.email}" title="Block Email">
                        <i class="fas fa-ban"></i>
                    </button>
                    <button class="btn-action btn-delete" data-action="delete" data-user-id="${user._id}" data-email="${user.email}" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event delegation for user action buttons
    tbody.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', handleUserAction);
    });
}

// Handle user action button clicks
function handleUserAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const userId = btn.dataset.userId;
    const email = btn.dataset.email;

    switch (action) {
        case 'view':
            viewUser(userId);
            break;
        case 'suspend':
            suspendUser(userId, email);
            break;
        case 'activate':
            activateUser(userId, email);
            break;
        case 'block':
            blockEmail(email);
            break;
        case 'delete':
            deleteUser(userId, email);
            break;
    }
}

async function loadOrganizations() {
    try {
        const response = await fetch('/api/superadmin/organizations', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            displayOrganizations(data.organizations);
        }
    } catch (error) {
        console.error('Error loading organizations:', error);
    }
}

function displayOrganizations(orgs) {
    const tbody = document.getElementById('orgsTableBody');

    if (orgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No organizations found</td></tr>';
        return;
    }

    tbody.innerHTML = orgs.map(org => `
        <tr>
            <td><strong>${org.name}</strong></td>
            <td>${org.type}</td>
            <td>${org.ownerEmail || 'N/A'}</td>
            <td>${org.memberCount || 0}</td>
            <td><span class="badge badge-plan">${org.subscriptionTier}</span></td>
            <td><span class="status-badge ${org.subscriptionStatus}">${org.subscriptionStatus}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" data-action="view-org" data-org-id="${org._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-delete" data-action="delete-org" data-org-id="${org._id}" data-org-name="${org.name}" title="Delete Organization">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event delegation for org action buttons
    tbody.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', handleOrgAction);
    });
}

// Handle organization action button clicks
function handleOrgAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const orgId = btn.dataset.orgId;
    const orgName = btn.dataset.orgName;

    switch (action) {
        case 'view-org':
            viewOrganization(orgId);
            break;
        case 'delete-org':
            deleteOrganization(orgId, orgName);
            break;
    }
}

async function loadBlockedEmails() {
    try {
        const response = await fetch('/api/superadmin/blocked-emails', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            displayBlockedEmails(data.blocked);
        }
    } catch (error) {
        console.error('Error loading blocked emails:', error);
    }
}

function displayBlockedEmails(blocked) {
    const tbody = document.getElementById('blockedTableBody');

    if (blocked.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No blocked emails</td></tr>';
        return;
    }

    tbody.innerHTML = blocked.map(item => `
        <tr>
            <td><code>${item.email}</code></td>
            <td>${item.reason || 'N/A'}</td>
            <td>${formatDate(item.blockedAt)}</td>
            <td>
                <button class="btn-action btn-unblock" data-action="unblock" data-blocked-id="${item._id}" data-email="${item.email}" title="Unblock">
                    <i class="fas fa-check"></i> Unblock
                </button>
            </td>
        </tr>
    `).join('');

    // Add event delegation for unblock buttons
    tbody.querySelectorAll('.btn-unblock').forEach(btn => {
        btn.addEventListener('click', handleUnblockAction);
    });
}

// Handle unblock action
function handleUnblockAction(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.blockedId;
    const email = btn.dataset.email;
    unblockEmail(id, email);
}

// ===================================
// User Actions
// ===================================
function deleteUser(userId, email) {
    currentAction = 'deleteUser';
    currentData = { userId, email };
    showConfirmModal(`Delete user <strong>${email}</strong>? This will permanently remove all their data.`);
}

async function confirmDeleteUser() {
    try {
        const response = await fetch(`/api/superadmin/users/${currentData.userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('User deleted successfully');
            loadUsers();
            loadStats();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to delete user');
    }
}

function suspendUser(userId, email) {
    currentAction = 'suspendUser';
    currentData = { userId, email };
    showConfirmModal(`Suspend user <strong>${email}</strong>? They will not be able to login.`);
}

async function confirmSuspendUser() {
    try {
        const response = await fetch('/api/superadmin/suspend-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ userId: currentData.userId })
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('User suspended');
            loadUsers();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to suspend user');
    }
}

function activateUser(userId, email) {
    currentAction = 'activateUser';
    currentData = { userId, email };
    showConfirmModal(`Activate user <strong>${email}</strong>?`);
}

async function confirmActivateUser() {
    try {
        const response = await fetch('/api/superadmin/activate-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ userId: currentData.userId })
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('User activated');
            loadUsers();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to activate user');
    }
}

function deleteOrganization(orgId, orgName) {
    currentAction = 'deleteOrganization';
    currentData = { orgId, orgName };
    showConfirmModal(`Delete organization <strong>${orgName}</strong>? This will delete ALL members and data.`);
}

async function confirmDeleteOrganization() {
    try {
        const response = await fetch(`/api/superadmin/organizations/${currentData.orgId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('Organization deleted successfully');
            loadOrganizations();
            loadStats();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to delete organization');
    }
}

// ===================================
// Block Email
// ===================================
function blockEmail(email) {
    document.getElementById('blockEmailInput').value = email;
    document.getElementById('blockEmailModal').style.display = 'flex';
}

async function confirmBlockEmail() {
    const email = document.getElementById('blockEmailInput').value.trim();
    const reason = document.getElementById('blockReasonInput').value.trim();

    if (!email) {
        alert('Please enter an email or domain');
        return;
    }

    try {
        const response = await fetch('/api/superadmin/block-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({ email, reason })
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('Email blocked successfully');
            document.getElementById('blockEmailModal').style.display = 'none';
            document.getElementById('blockEmailInput').value = '';
            document.getElementById('blockReasonInput').value = '';
            loadBlockedEmails();
            loadStats();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to block email');
    }
}

async function unblockEmail(id, email) {
    if (!confirm(`Unblock ${email}?`)) return;

    try {
        const response = await fetch(`/api/superadmin/blocked-emails/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            showSuccess('Email unblocked');
            loadBlockedEmails();
            loadStats();
        } else {
            showError(data.message);
        }
    } catch (error) {
        showError('Failed to unblock email');
    }
}

// ===================================
// Modals
// ===================================
function showConfirmModal(message) {
    document.getElementById('confirmMessage').innerHTML = message;
    document.getElementById('confirmModal').style.display = 'flex';
}

function initializeEventListeners() {
    // Block email modal
    document.getElementById('addBlockBtn')?.addEventListener('click', () => {
        document.getElementById('blockEmailModal').style.display = 'flex';
    });

    document.getElementById('closeBlockModal')?.addEventListener('click', () => {
        document.getElementById('blockEmailModal').style.display = 'none';
    });

    document.getElementById('cancelBlockBtn')?.addEventListener('click', () => {
        document.getElementById('blockEmailModal').style.display = 'none';
    });

    document.getElementById('confirmBlockBtn')?.addEventListener('click', confirmBlockEmail);

    // Confirm modal
    document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
        document.getElementById('confirmModal').style.display = 'none';
    });

    document.getElementById('cancelConfirmBtn')?.addEventListener('click', () => {
        document.getElementById('confirmModal').style.display = 'none';
    });

    document.getElementById('confirmActionBtn')?.addEventListener('click', () => {
        document.getElementById('confirmModal').style.display = 'none';
        executeAction();
    });

    // Search
    document.getElementById('userSearch')?.addEventListener('input', (e) => {
        // Implement search filter
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'website-home.html';
    });
}

function executeAction() {
    switch (currentAction) {
        case 'deleteUser':
            confirmDeleteUser();
            break;
        case 'suspendUser':
            confirmSuspendUser();
            break;
        case 'activateUser':
            confirmActivateUser();
            break;
        case 'deleteOrganization':
            confirmDeleteOrganization();
            break;
    }
}

// ===================================
// Utility Functions
// ===================================
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

function viewUser(userId) {
    alert('View user details: ' + userId);
}

function viewOrganization(orgId) {
    alert('View organization details: ' + orgId);
}

function loadStatistics() {
    // Implement charts
    alert('Statistics view coming soon');
}
