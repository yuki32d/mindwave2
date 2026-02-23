// Active Users Page Logic

document.addEventListener('DOMContentLoaded', async () => {
    await loadActiveUsers();

    // Auto-refresh every 30 seconds
    setInterval(loadActiveUsers, 30000);
});

async function loadActiveUsers() {
    const loadingState = document.getElementById('loadingState');
    const onlineSection = document.getElementById('onlineSection');
    const offlineSection = document.getElementById('offlineSection');

    try {
        const response = await fetch('/api/admin/active-users', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Failed to load active users:', data.message);
            return;
        }

        // Hide loading, show sections
        loadingState.style.display = 'none';
        onlineSection.style.display = 'block';
        offlineSection.style.display = 'block';

        // Update stats
        document.getElementById('onlineCount').textContent = data.totalOnline;
        document.getElementById('offlineCount').textContent = data.totalOffline;
        document.getElementById('totalCount').textContent = data.totalOnline + data.totalOffline;
        document.getElementById('onlineBadge').textContent = data.totalOnline;
        document.getElementById('offlineBadge').textContent = data.totalOffline;

        // Render online users
        const onlineContainer = document.getElementById('onlineUsers');
        if (data.online.length === 0) {
            onlineContainer.innerHTML = '<p style="color: var(--muted);">No students online right now</p>';
        } else {
            onlineContainer.innerHTML = data.online.map(user => renderUserCard(user, true)).join('');
        }

        // Render offline users
        const offlineContainer = document.getElementById('offlineUsers');
        if (data.offline.length === 0) {
            offlineContainer.innerHTML = '<p style="color: var(--muted);">All students are online!</p>';
        } else {
            offlineContainer.innerHTML = data.offline.map(user => renderUserCard(user, false)).join('');
        }

    } catch (error) {
        console.error('Error loading active users:', error);
        loadingState.innerHTML = `
            <div style="text-align: center; color: var(--muted);">
                <p>Failed to load active users</p>
                <button onclick="loadActiveUsers()" style="margin-top: 16px;">Retry</button>
            </div>
        `;
    }
}

function renderUserCard(user, isOnline) {
    const lastActiveText = user.lastActive
        ? getTimeAgo(new Date(user.lastActive))
        : 'Never';

    return `
        <div class="user-card ${isOnline ? '' : 'offline'}">
            <div class="status-indicator ${isOnline ? 'online' : 'offline'}"></div>
            <div class="user-info">
                <div class="user-name">${user.name || user.displayName || 'Unknown'}</div>
                <div class="user-email">${user.email}</div>
                <div class="user-last-active">
                    ${isOnline ? '🟢 Active now' : `Last seen: ${lastActiveText}`}
                </div>
            </div>
        </div>
    `;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}
