// ============================================
// DASHBOARD DATA SERVICE - Real-time Updates
// ============================================

class DashboardDataService {
    constructor() {
        this.cache = null;
        this.lastFetch = null;
        this.refreshInterval = 30000; // 30 seconds
        this.autoRefreshTimer = null;
    }

    /**
     * Fetch dashboard statistics from the backend
     */
    async fetchDashboardStats() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/organizations/dashboard-stats', {
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
                this.cache = data;
                this.lastFetch = Date.now();
                return data;
            } else {
                throw new Error(data.message || 'Failed to fetch dashboard stats');
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    /**
     * Get dashboard stats (uses cache if fresh)
     */
    async getStats(forceRefresh = false) {
        const cacheAge = this.lastFetch ? Date.now() - this.lastFetch : Infinity;

        // Use cache if less than 30 seconds old and not forcing refresh
        if (!forceRefresh && this.cache && cacheAge < this.refreshInterval) {
            return this.cache;
        }

        return await this.fetchDashboardStats();
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh(callback) {
        // Clear any existing timer
        this.stopAutoRefresh();

        // Set up new timer
        this.autoRefreshTimer = setInterval(async () => {
            try {
                const data = await this.fetchDashboardStats();
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, this.refreshInterval);

        console.log('✓ Dashboard auto-refresh started (30s interval)');
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('✓ Dashboard auto-refresh stopped');
        }
    }

    /**
     * Update dashboard UI with stats
     */
    updateDashboardUI(data) {
        if (!data || !data.stats) return;

        const { stats, recentActivity } = data;

        // Update student count
        const studentCountEl = document.getElementById('studentCount');
        if (studentCountEl) {
            studentCountEl.textContent = stats.studentCount || 0;
        }

        // Update team count
        const teamCountEl = document.getElementById('teamCount');
        if (teamCountEl) {
            teamCountEl.textContent = stats.teamCount || 0;
        }

        // Update game count
        const gameCountEl = document.getElementById('gameCount');
        if (gameCountEl) {
            gameCountEl.textContent = stats.gameCount || 0;
        }

        // Update trial status
        const trialStatusEl = document.getElementById('trialStatus');
        if (trialStatusEl && stats.trialDaysRemaining !== undefined) {
            if (stats.trialDaysRemaining > 0) {
                trialStatusEl.textContent = `${stats.trialDaysRemaining} days remaining in trial`;
                trialStatusEl.style.color = stats.trialDaysRemaining <= 3 ? '#ef4444' : '#10b981';
            } else {
                trialStatusEl.textContent = 'Trial expired';
                trialStatusEl.style.color = '#ef4444';
            }
        }

        // Update subscription plan
        const planNameEl = document.getElementById('planName');
        if (planNameEl && stats.subscriptionTier) {
            const planNames = {
                'trial': 'Free Trial',
                'basic': 'Starter Plan',
                'premium': 'Professional Plan',
                'enterprise': 'Enterprise Plan'
            };
            planNameEl.textContent = planNames[stats.subscriptionTier] || 'Trial Plan';
        }

        // Update AI calls usage
        const aiCallsEl = document.getElementById('aiCallsUsed');
        const aiCallsLimitEl = document.getElementById('aiCallsLimit');
        if (aiCallsEl && stats.aiCallsUsed !== undefined) {
            aiCallsEl.textContent = stats.aiCallsUsed;
        }
        if (aiCallsLimitEl && stats.aiCallsLimit !== undefined) {
            aiCallsLimitEl.textContent = stats.aiCallsLimit === -1 ? '∞' : stats.aiCallsLimit;
        }

        // Update storage usage
        const storageUsedEl = document.getElementById('storageUsed');
        const storageLimitEl = document.getElementById('storageLimit');
        if (storageUsedEl && stats.storageUsed !== undefined) {
            storageUsedEl.textContent = `${Math.round(stats.storageUsed)} MB`;
        }
        if (storageLimitEl && stats.storageLimit !== undefined) {
            storageLimitEl.textContent = stats.storageLimit === -1 ? '∞' : `${stats.storageLimit} MB`;
        }

        // Update recent activity (if element exists)
        if (recentActivity && recentActivity.length > 0) {
            this.updateRecentActivity(recentActivity);
        }

        console.log('✓ Dashboard UI updated with real-time data');
    }

    /**
     * Update recent activity list
     */
    updateRecentActivity(activities) {
        const activityListEl = document.getElementById('recentActivityList');
        if (!activityListEl) return;

        activityListEl.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';

            const timeAgo = this.getTimeAgo(new Date(activity.createdAt));
            const userName = activity.userId?.name || 'User';

            activityItem.innerHTML = `
                <div class="activity-icon">${this.getActivityIcon(activity.activityType)}</div>
                <div class="activity-details">
                    <p class="activity-title">${activity.description}</p>
                    <p class="activity-time">${timeAgo} • ${userName}</p>
                </div>
            `;

            activityListEl.appendChild(activityItem);
        });
    }

    /**
     * Get icon for activity type
     */
    getActivityIcon(type) {
        const icons = {
            'login': '🔐',
            'logout': '👋',
            'profile_update': '✏️',
            'password_change': '🔑',
            'team_invite': '👥',
            'game_create': '🎮',
            'game_play': '▶️',
            'game_complete': '✅',
            'student_add': '🎓',
            'settings_update': '⚙️',
            'subscription_change': '💳',
            'payment_success': '💰',
            'payment_failed': '❌'
        };
        return icons[type] || '📌';
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
}

// Create global instance
window.dashboardService = new DashboardDataService();

console.log('✅ Dashboard Data Service loaded');
