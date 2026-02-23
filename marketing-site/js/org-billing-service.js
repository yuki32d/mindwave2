// ============================================
// BILLING DATA SERVICE - Real-time Updates
// ============================================

class BillingDataService {
    constructor() {
        this.cache = null;
        this.lastFetch = null;
        this.refreshInterval = 60000; // 60 seconds (billing changes less frequently)
        this.autoRefreshTimer = null;
    }

    /**
     * Fetch billing information from the backend
     */
    async fetchBillingInfo() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch('/api/organizations/billing-info', {
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
                throw new Error(data.message || 'Failed to fetch billing info');
            }
        } catch (error) {
            console.error('Error fetching billing info:', error);
            throw error;
        }
    }

    /**
     * Get billing info (uses cache if fresh)
     */
    async getBillingInfo(forceRefresh = false) {
        const cacheAge = this.lastFetch ? Date.now() - this.lastFetch : Infinity;

        // Use cache if less than 60 seconds old and not forcing refresh
        if (!forceRefresh && this.cache && cacheAge < this.refreshInterval) {
            return this.cache;
        }

        return await this.fetchBillingInfo();
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
                const data = await this.fetchBillingInfo();
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            } catch (error) {
                console.error('Auto-refresh error:', error);
            }
        }, this.refreshInterval);

        console.log('✓ Billing auto-refresh started (60s interval)');
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
            console.log('✓ Billing auto-refresh stopped');
        }
    }

    /**
     * Update billing UI with data
     */
    updateBillingUI(data) {
        if (!data || !data.billing) return;

        const { billing, paymentHistory } = data;

        // Update current plan
        this.updateCurrentPlan(billing.currentPlan, billing.status, billing.nextBillingDate);

        // Update usage stats
        this.updateUsageStats(billing.usage, billing.limits);

        // Update payment history
        if (paymentHistory && paymentHistory.length > 0) {
            this.updatePaymentHistory(paymentHistory);
        }

        console.log('✓ Billing UI updated with real-time data');
    }

    /**
     * Update current plan section
     */
    updateCurrentPlan(plan, status, nextBillingDate) {
        // Update plan name
        const planNameEl = document.querySelector('.performance-score');
        if (planNameEl) {
            planNameEl.textContent = plan.name || 'Trial Plan';
        }

        // Update plan price and renewal date
        const planLabelEl = document.querySelector('.performance-label');
        if (planLabelEl && nextBillingDate) {
            const renewalDate = new Date(nextBillingDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            if (plan.tier === 'trial') {
                planLabelEl.textContent = `Free Trial • Ends ${renewalDate}`;
            } else {
                const currency = plan.currency === 'INR' ? '₹' : '$';
                planLabelEl.textContent = `${currency}${plan.price}/month • Renews ${renewalDate}`;
            }
        }

        // Update plan status badge
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.textContent = this.formatStatus(status);
            statusBadge.className = `status-badge ${this.getStatusClass(status)}`;
        }
    }

    /**
     * Update usage statistics
     */
    updateUsageStats(usage, limits) {
        // Update students usage
        const studentsUsageEl = document.getElementById('studentsUsage');
        const studentsLimitEl = document.getElementById('studentsLimit');
        if (studentsUsageEl && usage.students !== undefined) {
            studentsUsageEl.textContent = usage.students;
        }
        if (studentsLimitEl && limits.maxStudents !== undefined) {
            studentsLimitEl.textContent = limits.maxStudents === -1 ? '∞' : limits.maxStudents;
        }

        // Update storage usage
        const storageUsageEl = document.getElementById('storageUsage');
        const storageLimitEl = document.getElementById('storageLimit');
        if (storageUsageEl && usage.storage !== undefined) {
            storageUsageEl.textContent = `${Math.round(usage.storage)} MB`;
        }
        if (storageLimitEl && limits.maxStorage !== undefined) {
            storageLimitEl.textContent = limits.maxStorage === -1 ? '∞' : `${limits.maxStorage} MB`;
        }

        // Update AI calls usage
        const aiCallsUsageEl = document.getElementById('aiCallsUsage');
        const aiCallsLimitEl = document.getElementById('aiCallsLimit');
        if (aiCallsUsageEl && usage.aiCalls !== undefined) {
            aiCallsUsageEl.textContent = usage.aiCalls;
        }
        if (aiCallsLimitEl && limits.aiCallsPerMonth !== undefined) {
            aiCallsLimitEl.textContent = limits.aiCallsPerMonth === -1 ? '∞' : limits.aiCallsPerMonth;
        }
    }

    /**
     * Update payment history table
     */
    updatePaymentHistory(history) {
        const tableBody = document.querySelector('.data-table tbody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        history.forEach((payment, index) => {
            const row = document.createElement('tr');
            const date = new Date(payment.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            const currency = '₹'; // Assuming INR, adjust based on your needs
            const amount = payment.amount > 0 ? `${currency}${(payment.amount / 100).toFixed(2)}` : '-';

            row.innerHTML = `
                <td><strong>INV-${new Date(payment.date).getFullYear()}-${String(index + 1).padStart(2, '0')}</strong></td>
                <td>${date}</td>
                <td>${amount}</td>
                <td><span class="status-badge ${payment.status === 'paid' ? 'active' : 'inactive'}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span></td>
                <td>
                    <button class="action-btn-small">Download</button>
                    <button class="action-btn-small">View</button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Format subscription status
     */
    formatStatus(status) {
        const statusMap = {
            'active': 'Active',
            'trialing': 'Trial',
            'past_due': 'Past Due',
            'canceled': 'Canceled',
            'incomplete': 'Incomplete'
        };
        return statusMap[status] || status;
    }

    /**
     * Get CSS class for status
     */
    getStatusClass(status) {
        const classMap = {
            'active': 'active',
            'trialing': 'active',
            'past_due': 'warning',
            'canceled': 'inactive',
            'incomplete': 'warning'
        };
        return classMap[status] || 'inactive';
    }
}

// Create global instance
window.billingService = new BillingDataService();

console.log('✅ Billing Data Service loaded');
