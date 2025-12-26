// ============================================
// ORGANIZATION DATA SERVICE
// Centralized service for fetching and managing organization data
// ============================================

class OrgDataService {
    constructor() {
        this.baseURL = window.location.origin;
        this.authToken = localStorage.getItem('auth_token');
        this.refreshInterval = null;
        this.listeners = new Map();
        this.cache = {
            trialStatus: null,
            teamMembers: null,
            students: null,
            games: null,
            analytics: null,
            lastUpdate: null
        };
    }

    // ============================================
    // AUTHENTICATION
    // ============================================

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
        };
    }

    // ============================================
    // TRIAL & SUBSCRIPTION DATA
    // ============================================

    async getTrialStatus() {
        try {
            const response = await fetch(`${this.baseURL}/api/organizations/trial-status`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch trial status');

            const data = await response.json();
            this.cache.trialStatus = data;
            this.cache.lastUpdate = new Date();
            this.notifyListeners('trialStatus', data);
            return data;
        } catch (error) {
            console.error('Error fetching trial status:', error);
            return null;
        }
    }

    // ============================================
    // TEAM MEMBERS DATA
    // ============================================

    async getTeamMembers() {
        try {
            const response = await fetch(`${this.baseURL}/api/organizations/team-members`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch team members');

            const data = await response.json();
            this.cache.teamMembers = data;
            this.notifyListeners('teamMembers', data);
            return data;
        } catch (error) {
            console.error('Error fetching team members:', error);
            return { teamMembers: [], total: 0 };
        }
    }

    async addTeamMember(memberData) {
        try {
            const response = await fetch(`${this.baseURL}/api/organizations/team-members`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(memberData)
            });

            if (!response.ok) throw new Error('Failed to add team member');

            const data = await response.json();
            await this.getTeamMembers(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error adding team member:', error);
            throw error;
        }
    }

    // ============================================
    // STUDENTS DATA
    // ============================================

    async getStudents(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${this.baseURL}/api/organizations/students?${queryParams}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch students');

            const data = await response.json();
            this.cache.students = data;
            this.notifyListeners('students', data);
            return data;
        } catch (error) {
            console.error('Error fetching students:', error);
            return { students: [], total: 0, active: 0, inactive: 0 };
        }
    }

    // ============================================
    // GAMES DATA
    // ============================================

    async getGames() {
        try {
            const response = await fetch(`${this.baseURL}/api/organizations/games`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch games');

            const data = await response.json();
            this.cache.games = data;
            this.notifyListeners('games', data);
            return data;
        } catch (error) {
            console.error('Error fetching games:', error);
            return { games: [], total: 0, totalPlays: 0 };
        }
    }

    // ============================================
    // ANALYTICS DATA
    // ============================================

    async getAnalytics(timeRange = '7d') {
        try {
            const response = await fetch(`${this.baseURL}/api/organizations/analytics?range=${timeRange}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch analytics');

            const data = await response.json();
            this.cache.analytics = data;
            this.notifyListeners('analytics', data);
            return data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return null;
        }
    }

    // ============================================
    // REAL-TIME UPDATES
    // ============================================

    startAutoRefresh(interval = 30000) {
        // Refresh data every 30 seconds
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(async () => {
            console.log('🔄 Auto-refreshing organization data...');
            await this.refreshAll();
        }, interval);

        console.log(`✅ Auto-refresh started (every ${interval / 1000}s)`);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ Auto-refresh stopped');
        }
    }

    async refreshAll() {
        const promises = [
            this.getTrialStatus(),
            this.getTeamMembers(),
            this.getStudents(),
            this.getGames()
        ];

        await Promise.allSettled(promises);
        console.log('✅ All data refreshed');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in listener for ${event}:`, error);
                }
            });
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    getCachedData(key) {
        return this.cache[key];
    }

    clearCache() {
        this.cache = {
            trialStatus: null,
            teamMembers: null,
            students: null,
            games: null,
            analytics: null,
            lastUpdate: null
        };
    }

    getLastUpdateTime() {
        return this.cache.lastUpdate;
    }
}

// Create singleton instance
const orgDataService = new OrgDataService();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = orgDataService;
}
