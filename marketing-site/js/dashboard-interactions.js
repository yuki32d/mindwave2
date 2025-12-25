// ============================================
// DASHBOARD INTERACTIONS
// Make all buttons and links functional
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeButtons();
    initializeRealTimeUpdates();
});

// ============================================
// Initialize All Button Handlers
// ============================================

function initializeButtons() {
    // Export button
    const exportBtn = document.querySelector('.btn-export, button[title="Export"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // Create button
    const createBtn = document.getElementById('createBtn') || document.querySelector('.btn-create');
    if (createBtn) {
        createBtn.addEventListener('click', handleCreate);
    }

    // Manage subscription button - find by onclick or text content
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('manage') && text.includes('→')) {
            btn.addEventListener('click', handleManageSubscription);
        } else if (text.includes('view invoices')) {
            btn.addEventListener('click', handleViewInvoices);
        } else if (text.includes('update payment')) {
            btn.addEventListener('click', handleUpdatePayment);
        }
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Search functionality
    const searchInput = document.querySelector('.search-input, input[placeholder*="Search"]');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    console.log('✅ Dashboard buttons initialized');
}

// ============================================
// Button Handlers
// ============================================

function handleExport() {
    showToast('Preparing export...', 'info');

    // Simulate export
    setTimeout(() => {
        showToast('Export completed! Download started.', 'success');
        // In real implementation, trigger actual export
    }, 1500);
}

function handleCreate() {
    // Show create menu
    const menu = `
        <div class="create-menu">
            <h3>What would you like to create?</h3>
            <div class="create-options">
                <button onclick="createGame()">
                    <i class="fas fa-gamepad"></i>
                    <span>New Game</span>
                </button>
                <button onclick="createCourse()">
                    <i class="fas fa-book"></i>
                    <span>New Course</span>
                </button>
                <button onclick="inviteStudent()">
                    <i class="fas fa-user-plus"></i>
                    <span>Invite Student</span>
                </button>
            </div>
        </div>
    `;

    showModal('Create New', menu);
}

function handleManageSubscription() {
    window.location.href = '/marketing-site/org-billing.html';
}

function handleViewInvoices() {
    window.location.href = '/marketing-site/org-billing.html#invoices';
}

function handleUpdatePayment() {
    showToast('Redirecting to payment settings...', 'info');
    setTimeout(() => {
        window.location.href = '/marketing-site/org-billing.html#payment-method';
    }, 1000);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');
        showToast('Logging out...', 'info');
        setTimeout(() => {
            window.location.href = '/marketing-site/website-home.html';
        }, 1000);
    }
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    if (query.length > 2) {
        console.log('Searching for:', query);
        // Implement search functionality
        showToast(`Searching for "${query}"...`, 'info');
    }
}

// ============================================
// Quick Actions
// ============================================

function createGame() {
    showToast('Redirecting to game builder...', 'info');
    setTimeout(() => {
        window.location.href = '/marketing-site/org-games.html';
    }, 1000);
}

function createCourse() {
    showToast('Course creation coming soon!', 'info');
}

function inviteStudent() {
    window.location.href = '/marketing-site/org-students.html#invite';
}

// ============================================
// Real-Time Data Updates
// ============================================

function initializeRealTimeUpdates() {
    // Update data every 30 seconds
    setInterval(() => {
        updateDashboardData();
    }, 30000);

    // Initial update
    updateDashboardData();
}

async function updateDashboardData() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

        if (!user || !user.email) {
            return;
        }

        // Update last refresh time
        const now = new Date();
        console.log('Dashboard data refreshed at:', now.toLocaleTimeString());

        // Update AI API Calls (mock data)
        const apiCallsElement = document.querySelector('.stat-value');
        if (apiCallsElement) {
            const currentCalls = parseInt(apiCallsElement.textContent.replace(/,/g, '')) || 2450;
            const newCalls = currentCalls + Math.floor(Math.random() * 10);
            apiCallsElement.textContent = newCalls.toLocaleString();
        }

        // Update storage used (mock data)
        const storageElement = document.querySelectorAll('.stat-value')[1];
        if (storageElement) {
            const currentStorage = parseFloat(storageElement.textContent) || 3.2;
            const newStorage = (currentStorage + Math.random() * 0.1).toFixed(1);
            storageElement.textContent = `${newStorage} GB`;
        }

        // Show subtle update indicator
        showUpdateIndicator();

    } catch (error) {
        console.error('Error updating dashboard data:', error);
    }
}

function showUpdateIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'update-indicator';
    indicator.innerHTML = '<i class="fas fa-sync-alt"></i> Updated';
    indicator.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: var(--success-green);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s;
    `;

    document.body.appendChild(indicator);

    setTimeout(() => indicator.style.opacity = '1', 100);
    setTimeout(() => {
        indicator.style.opacity = '0';
        setTimeout(() => indicator.remove(), 300);
    }, 2000);
}

// ============================================
// Modal System
// ============================================

function showModal(title, content) {
    // Remove existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s;
        }

        .modal-content {
            background: white;
            border-radius: 20px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideUp 0.3s;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .modal-header h2 {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
        }

        .modal-body {
            padding: 1.5rem;
        }

        .create-menu h3 {
            font-size: 1.125rem;
            margin-bottom: 1rem;
        }

        .create-options {
            display: grid;
            gap: 1rem;
        }

        .create-options button {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f8f9fa;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .create-options button:hover {
            background: white;
            border-color: #6366f1;
            transform: translateX(4px);
        }

        .create-options button i {
            font-size: 1.5rem;
            color: #6366f1;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s';
        setTimeout(() => modal.remove(), 300);
    }
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

console.log('✅ Dashboard interactions loaded');
