// Admin Approvals Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    await loadPendingSignups();
});

async function loadPendingSignups() {
    const pendingList = document.getElementById('pendingList');
    const loadingState = document.getElementById('loadingState');

    // Show loading
    loadingState.style.display = 'flex';
    pendingList.style.display = 'none';

    try {
        const response = await fetch('/api/admin/pending-signups', {
            credentials: 'include'
        });

        const data = await response.json();

        // Hide loading
        loadingState.style.display = 'none';
        pendingList.style.display = 'flex';

        if (!data.ok) {
            pendingList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⚠️</span>
                    <h2>Error Loading Requests</h2>
                    <p>${data.message || 'Unable to load pending signups'}</p>
                </div>
            `;
            return;
        }

        if (!data.pendingSignups || data.pendingSignups.length === 0) {
            pendingList.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">✅</span>
                    <h2>No Pending Requests</h2>
                    <p>All admin signup requests have been processed</p>
                </div>
            `;
            return;
        }

        // Render pending signups
        pendingList.innerHTML = data.pendingSignups.map(signup => {
            const requestedDate = new Date(signup.requestedAt).toLocaleString();

            return `
                <div class="pending-item" data-id="${signup._id}" data-email="${signup.email}">
                    <div class="pending-info">
                        <div class="pending-email">${signup.email}</div>
                        <div class="pending-date">Requested: ${requestedDate}</div>
                    </div>
                    <div class="pending-actions">
                        <button class="approve-btn" data-action="approve">
                            ✓ Approve
                        </button>
                        <button class="reject-btn" data-action="reject">
                            ✕ Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to buttons (fixes CSP error)
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const item = this.closest('.pending-item');
                approveSignup(item.dataset.id, item.dataset.email);
            });
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const item = this.closest('.pending-item');
                rejectSignup(item.dataset.id, item.dataset.email);
            });
        });

    } catch (error) {
        console.error('Error loading pending signups:', error);
        loadingState.style.display = 'none';
        pendingList.style.display = 'flex';
        pendingList.innerHTML = `
            <div class="empty-state">
                <span class="emoji">⚠️</span>
                <h2>Connection Error</h2>
                <p>Unable to connect to server. Please try again.</p>
            </div>
        `;
    }
}

async function approveSignup(id, email) {
    if (!confirm(`Approve admin signup for ${email}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/approve-signup/${id}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            alert(data.message || 'Failed to approve signup');
            return;
        }

        alert(`Admin account approved for ${email}`);

        // Remove the item from the list
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => {
                item.remove();

                // Check if list is empty
                const pendingList = document.getElementById('pendingList');
                if (pendingList.children.length === 0) {
                    loadPendingSignups();
                }
            }, 300);
        }

    } catch (error) {
        console.error('Error approving signup:', error);
        alert('Failed to approve signup. Please try again.');
    }
}

async function rejectSignup(id, email) {
    if (!confirm(`Reject admin signup for ${email}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/reject-signup/${id}`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            alert(data.message || 'Failed to reject signup');
            return;
        }

        alert(`Admin signup rejected for ${email}`);

        // Remove the item from the list
        const item = document.querySelector(`[data-id="${id}"]`);
        if (item) {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                item.remove();

                // Check if list is empty
                const pendingList = document.getElementById('pendingList');
                if (pendingList.children.length === 0) {
                    loadPendingSignups();
                }
            }, 300);
        }

    } catch (error) {
        console.error('Error rejecting signup:', error);
        alert('Failed to reject signup. Please try again.');
    }
}
