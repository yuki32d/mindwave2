// ============================================
// NOTIFICATION SERVICE - Real-time Notifications
// ============================================

class NotificationService {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.pollInterval = 30000; // 30 seconds
        this.pollTimer = null;
    }

    /**
     * Fetch notifications from API
     */
    async fetchNotifications(unreadOnly = false) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const url = unreadOnly
                ? '/api/notifications?unreadOnly=true'
                : '/api/notifications';

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                this.notifications = data.notifications;
                this.unreadCount = data.unreadCount;
                return data;
            } else {
                throw new Error(data.message || 'Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                // No token, user not authenticated - return 0 silently
                this.unreadCount = 0;
                return 0;
            }

            const response = await fetch('/api/notifications/unread-count', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.unreadCount = 0;
                return 0;
            }

            const data = await response.json();
            this.unreadCount = data.count || 0;
            return this.unreadCount;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            this.unreadCount = 0;
            return 0;
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                // Update local state
                await this.getUnreadCount();
                this.updateBadge();
                return data.notification;
            } else {
                throw new Error(data.message || 'Failed to mark as read');
            }
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                this.unreadCount = 0;
                this.updateBadge();
                return data.modifiedCount;
            } else {
                throw new Error(data.message || 'Failed to mark all as read');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            throw error;
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.ok) {
                // Remove from local state
                this.notifications = this.notifications.filter(n => n._id !== notificationId);
                await this.getUnreadCount();
                this.updateBadge();
                return true;
            } else {
                throw new Error(data.message || 'Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    /**
     * Update notification badge
     */
    updateBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Render notifications in dropdown
     */
    renderNotifications(notifications) {
        const container = document.getElementById('notificationList');
        if (!container) return;

        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'} priority-${notification.priority}" 
                 data-id="${notification._id}">
                <div class="notification-icon ${this.getNotificationIconClass(notification.type)}">
                    <i class="${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.getTimeAgo(new Date(notification.createdAt))}</span>
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `<button class="btn-mark-read" data-id="${notification._id}">
                        <i class="fas fa-check"></i>
                    </button>` : ''}
                    <button class="btn-delete" data-id="${notification._id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach event listeners
        this.attachNotificationListeners();
    }

    /**
     * Attach event listeners to notification items
     */
    attachNotificationListeners() {
        // Mark as read buttons
        document.querySelectorAll('.btn-mark-read').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this.markAsRead(id);
                await this.fetchNotifications();
                this.renderNotifications(this.notifications);
            });
        });

        // Delete buttons
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await this.deleteNotification(id);
                this.renderNotifications(this.notifications);
            });
        });

        // Click notification to mark as read and navigate
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const notification = this.notifications.find(n => n._id === id);

                if (!notification.read) {
                    await this.markAsRead(id);
                }

                if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                }
            });
        });
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            'trial_expiring': 'fas fa-clock',
            'trial_expired': 'fas fa-exclamation-triangle',
            'payment_failed': 'fas fa-credit-card',
            'payment_success': 'fas fa-check-circle',
            'new_student': 'fas fa-user-plus',
            'team_invite': 'fas fa-users',
            'subscription_changed': 'fas fa-sync',
            'game_created': 'fas fa-gamepad',
            'system_update': 'fas fa-info-circle',
            'security_alert': 'fas fa-shield-alt'
        };
        return icons[type] || 'fas fa-bell';
    }

    /**
     * Get notification icon class
     */
    getNotificationIconClass(type) {
        const classes = {
            'trial_expiring': 'warning',
            'trial_expired': 'danger',
            'payment_failed': 'danger',
            'payment_success': 'success',
            'new_student': 'info',
            'team_invite': 'info',
            'subscription_changed': 'info',
            'game_created': 'success',
            'system_update': 'info',
            'security_alert': 'danger'
        };
        return classes[type] || 'info';
    }

    /**
     * Calculate time ago
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    /**
     * Start polling for new notifications
     */
    startPolling() {
        // Check if user is authenticated before starting polling
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (!token) {
            console.log('⚠️ No auth token - skipping notification polling');
            return;
        }

        // Initial fetch
        this.getUnreadCount().then(() => this.updateBadge());

        // Poll every 30 seconds
        this.pollTimer = setInterval(async () => {
            await this.getUnreadCount();
            this.updateBadge();
        }, this.pollInterval);

        console.log('✓ Notification polling started (30s interval)');
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
            console.log('✓ Notification polling stopped');
        }
    }
}

// Create global instance
window.notificationService = new NotificationService();

console.log('✅ Notification Service loaded');
