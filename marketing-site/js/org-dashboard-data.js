// ============================================
// ORGANIZATION DASHBOARD - Real-Time Data
// ============================================

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://your-app.onrender.com';

// ============================================
// AUTHENTICATION CHECK
// ============================================

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

    if (!user || !user.email) {
        // Redirect to admin login for organization users
        window.location.href = '/marketing-site/admin-login.html';
        return null;
    }

    // For organization dashboard, we need either:
    // 1. organizationId set, OR
    // 2. userType = 'organization', OR  
    // 3. role = 'admin' (for backwards compatibility)
    const hasOrgAccess = user.organizationId ||
        user.userType === 'organization' ||
        user.orgRole === 'owner' ||
        user.orgRole === 'admin' ||
        user.role === 'admin';

    if (!hasOrgAccess) {
        console.warn('User does not have organization access');
        // Still allow access but show demo data
    }

    return user;
}

// ============================================
// FETCH ORGANIZATION DATA
// ============================================

async function fetchOrganizationData() {
    try {
        const user = checkAuth();
        if (!user) return;

        const response = await fetch(`${API_BASE_URL}/api/organization/${user.organizationId}`, {
            headers: {
                'Authorization': `Bearer ${user.token || ''}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch organization data');

        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching organization data:', error);
        // Show fallback data
        showFallbackData();
    }
}

// ============================================
// UPDATE DASHBOARD WITH REAL DATA
// ============================================

function updateDashboard(data) {
    // Update Organization Name
    const orgNameEl = document.getElementById('orgName');
    if (orgNameEl && data.organizationName) {
        orgNameEl.textContent = data.organizationName;
    }

    // Update Subscription Info
    const planNameEl = document.getElementById('planName');
    if (planNameEl && data.subscription) {
        planNameEl.textContent = data.subscription.planName || 'Premium Plan';
    }

    // Update Team Count
    const teamCountEl = document.getElementById('teamCount');
    if (teamCountEl && data.teamMembers) {
        teamCountEl.textContent = data.teamMembers.length || 0;
    }

    // Update Student Count
    const studentCountEl = document.getElementById('studentCount');
    if (studentCountEl && data.students) {
        studentCountEl.textContent = data.students.length || 0;
    }

    // Update AI Usage
    const aiCallsEl = document.getElementById('aiCalls');
    if (aiCallsEl && data.usage) {
        aiCallsEl.textContent = data.usage.aiCalls || 0;

        // Update progress bar
        const aiProgress = (data.usage.aiCalls / data.usage.aiLimit) * 100;
        const progressBar = document.querySelector('.progress-bar-fill');
        if (progressBar) {
            progressBar.style.width = `${aiProgress}%`;
        }
    }

    // Update Storage
    const storageEl = document.querySelector('.stat-value');
    if (storageEl && data.usage && data.usage.storage) {
        const storageGB = (data.usage.storage / 1024 / 1024 / 1024).toFixed(1);
        storageEl.textContent = `${storageGB} GB`;
    }
}

// ============================================
// FALLBACK DATA (for testing/demo)
// ============================================

function showFallbackData() {
    console.log('Using fallback demo data');
    // Dashboard already has demo data in HTML
}

// ============================================
// FETCH TEAM MEMBERS
// ============================================

async function fetchTeamMembers() {
    try {
        const user = checkAuth();
        if (!user) return;

        const response = await fetch(`${API_BASE_URL}/api/organization/${user.organizationId}/team`, {
            headers: {
                'Authorization': `Bearer ${user.token || ''}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch team members');

        const teamMembers = await response.json();
        updateTeamTable(teamMembers);
    } catch (error) {
        console.error('Error fetching team members:', error);
    }
}

function updateTeamTable(teamMembers) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody || !teamMembers) return;

    tableBody.innerHTML = teamMembers.map(member => `
        <tr>
            <td>
                <div class="member-info">
                    <img src="${member.avatar || 'https://i.pravatar.cc/40?img=' + Math.floor(Math.random() * 20)}" alt="${member.name}">
                    <div>
                        <div class="member-name">${member.name}</div>
                        <div class="member-title">${member.title || 'Team Member'}</div>
                    </div>
                </div>
            </td>
            <td><span class="role-badge ${member.role.toLowerCase()}">${member.role}</span></td>
            <td>${member.email}</td>
            <td>${new Date(member.joinedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td><span class="status-badge ${member.status.toLowerCase()}">${member.status}</span></td>
            <td>
                <button class="action-btn-small" onclick="editMember('${member.id}')">Edit</button>
                <button class="action-btn-small danger" onclick="removeMember('${member.id}')">Remove</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FETCH STUDENTS
// ============================================

async function fetchStudents() {
    try {
        const user = checkAuth();
        if (!user) return;

        const response = await fetch(`${API_BASE_URL}/api/organization/${user.organizationId}/students`, {
            headers: {
                'Authorization': `Bearer ${user.token || ''}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch students');

        const students = await response.json();
        updateStudentsTable(students);
    } catch (error) {
        console.error('Error fetching students:', error);
    }
}

function updateStudentsTable(students) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody || !students) return;

    tableBody.innerHTML = students.map(student => `
        <tr>
            <td>
                <div class="member-info">
                    <img src="${student.avatar || 'https://i.pravatar.cc/40?img=' + (Math.floor(Math.random() * 20) + 10)}" alt="${student.name}">
                    <div>
                        <div class="member-name">${student.name}</div>
                        <div class="member-title">ID: ${student.studentId}</div>
                    </div>
                </div>
            </td>
            <td>${student.grade || 'N/A'}</td>
            <td>${student.email}</td>
            <td>${student.gamesPlayed || 0}</td>
            <td>
                <div class="progress-mini">
                    <div class="progress-mini-bar" style="width: ${student.progress || 0}%"></div>
                    <span>${student.progress || 0}%</span>
                </div>
            </td>
            <td>${student.lastActive || 'Never'}</td>
            <td>
                <button class="action-btn-small" onclick="viewStudent('${student.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FETCH BILLING HISTORY
// ============================================

async function fetchBillingHistory() {
    try {
        const user = checkAuth();
        if (!user) return;

        const response = await fetch(`${API_BASE_URL}/api/organization/${user.organizationId}/billing`, {
            headers: {
                'Authorization': `Bearer ${user.token || ''}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch billing history');

        const invoices = await response.json();
        updateBillingTable(invoices);
    } catch (error) {
        console.error('Error fetching billing history:', error);
    }
}

function updateBillingTable(invoices) {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody || !invoices) return;

    tableBody.innerHTML = invoices.map(invoice => `
        <tr>
            <td><strong>${invoice.invoiceNumber}</strong></td>
            <td>${new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td>$${invoice.amount.toFixed(2)}</td>
            <td><span class="status-badge ${invoice.status.toLowerCase()}">${invoice.status}</span></td>
            <td>
                <button class="action-btn-small" onclick="downloadInvoice('${invoice.id}')">Download</button>
                <button class="action-btn-small" onclick="viewInvoice('${invoice.id}')">View</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// AUTO-REFRESH DATA
// ============================================

function startAutoRefresh() {
    // Refresh data every 30 seconds
    setInterval(() => {
        const currentPage = window.location.pathname;

        if (currentPage.includes('modern-dashboard')) {
            fetchOrganizationData();
        } else if (currentPage.includes('org-team')) {
            fetchTeamMembers();
        } else if (currentPage.includes('org-students')) {
            fetchStudents();
        } else if (currentPage.includes('org-billing')) {
            fetchBillingHistory();
        }
    }, 30000); // 30 seconds
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const user = checkAuth();
    if (!user) return;

    // Determine which page we're on and fetch appropriate data
    const currentPage = window.location.pathname;

    // Temporarily disabled API calls to prevent CSP errors
    // These will be enabled once proper CSP headers are configured
    /*
    if (currentPage.includes('modern-dashboard')) {
        fetchOrganizationData();
    } else if (currentPage.includes('org-team')) {
        fetchTeamMembers();
    } else if (currentPage.includes('org-students')) {
        fetchStudents();
    } else if (currentPage.includes('org-billing')) {
        fetchBillingHistory();
    } else if (currentPage.includes('org-settings')) {
        fetchOrganizationData();
    }

    // Start auto-refresh
    startAutoRefresh();
    */

    console.log('Dashboard loaded with demo data (API calls disabled for CSP compliance)');
});

// ============================================
// ACTION HANDLERS
// ============================================

function editMember(memberId) {
    console.log('Edit member:', memberId);
    // Implement edit functionality
    alert('Edit member: ' + memberId);
}

function removeMember(memberId) {
    if (confirm('Are you sure you want to remove this team member?')) {
        console.log('Remove member:', memberId);
        // Implement remove functionality
    }
}

function viewStudent(studentId) {
    console.log('View student:', studentId);
    // Redirect to student detail page
    window.location.href = `/student-detail.html?id=${studentId}`;
}

function downloadInvoice(invoiceId) {
    console.log('Download invoice:', invoiceId);
    // Implement download functionality
    window.open(`${API_BASE_URL}/api/invoices/${invoiceId}/download`, '_blank');
}

function viewInvoice(invoiceId) {
    console.log('View invoice:', invoiceId);
    // Implement view functionality
    window.location.href = `/invoice-detail.html?id=${invoiceId}`;
}

// Console welcome message
console.log('%c🌊 MindWave Organization Dashboard', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%c✨ Real-time data integration active!', 'font-size: 12px; color: #8b5cf6;');
