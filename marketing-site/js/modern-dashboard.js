// ============================================
// MODERN DASHBOARD - Chart.js Implementation
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Chart.js default configuration
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';

    // ============================================
    // NEW STUDENTS CHART (Small Line Chart)
    // ============================================
    const newStudentsCtx = document.getElementById('newStudentsChart');
    if (newStudentsCtx) {
        new Chart(newStudentsCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [20, 35, 25, 45, 30, 50, 40],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // TOTAL INCOME CHART (Small Line Chart)
    // ============================================
    const totalIncomeCtx = document.getElementById('totalIncomeChart');
    if (totalIncomeCtx) {
        new Chart(totalIncomeCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [15, 25, 20, 35, 28, 42, 38],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // TOTAL STUDENTS CHART (Bar Chart)
    // ============================================
    const totalStudentsCtx = document.getElementById('totalStudentsChart');
    if (totalStudentsCtx) {
        new Chart(totalStudentsCtx, {
            type: 'bar',
            data: {
                labels: ['', '', '', '', '', ''],
                datasets: [{
                    data: [40, 55, 45, 70, 60, 80],
                    backgroundColor: '#6366f1',
                    borderRadius: 4,
                    barThickness: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // WORKING HOURS SMALL CHART (Line Chart)
    // ============================================
    const workingHoursSmallCtx = document.getElementById('workingHoursSmallChart');
    if (workingHoursSmallCtx) {
        new Chart(workingHoursSmallCtx, {
            type: 'line',
            data: {
                labels: ['', '', '', '', '', '', ''],
                datasets: [{
                    data: [25, 30, 28, 35, 32, 40, 38],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    // ============================================
    // WORKING HOURS STATISTICS (Main Chart)
    // ============================================
    const workingHoursCtx = document.getElementById('workingHoursChart');
    if (workingHoursCtx) {
        new Chart(workingHoursCtx, {
            type: 'line',
            data: {
                labels: ['8h', '10h', '12h', '14h', '16h', '18h', '20h'],
                datasets: [
                    {
                        label: 'This Month',
                        data: [12, 14, 16, 18, 17, 19, 17],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#3b82f6',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    },
                    {
                        label: 'Last Month',
                        data: [10, 11, 13, 15, 14, 16, 15],
                        borderColor: '#94a3b8',
                        backgroundColor: 'rgba(148, 163, 184, 0.05)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#94a3b8',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#334155',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                return context.dataset.label + ': ' + context.parsed.y + 'h';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#f1f5f9',
                            drawBorder: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                size: 12
                            },
                            callback: function (value) {
                                return value + 'h';
                            }
                        }
                    }
                }
            }
        });
    }
});

// ============================================
// INTERACTIVE FEATURES
// ============================================

// Smooth scroll for navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
        // Add active class to clicked item
        e.currentTarget.classList.add('active');
    });
});

// Performance card navigation
const navArrows = document.querySelectorAll('.nav-arrow');
navArrows.forEach(arrow => {
    arrow.addEventListener('click', () => {
        // Add animation effect
        arrow.style.transform = 'scale(0.9)';
        setTimeout(() => {
            arrow.style.transform = 'scale(1)';
        }, 150);
    });
});


// Console welcome message
console.log('%c🌊 MindWave Dashboard', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%c✨ Modern Dashboard Loaded Successfully!', 'font-size: 12px; color: #8b5cf6;');

// ============================================
// TRIAL & SUBSCRIPTION MANAGEMENT
// ============================================

// Check trial status on page load
async function checkTrialStatus() {
    try {
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
            console.warn('No auth token found');
            return;
        }

        const response = await fetch('/api/organizations/trial-status', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch trial status');
            return;
        }

        const data = await response.json();
        console.log('Trial status:', data);

        if (data.isTrialExpired) {
            showPaymentRequiredModal();
            return;
        }

        if (data.isTrialActive) {
            showTrialBanner(data.daysRemaining);
        }

        updateDashboardMetrics(data);

    } catch (error) {
        console.error('Trial status check failed:', error);
    }
}

function showTrialBanner(daysRemaining) {
    // Check if banner already exists
    if (document.getElementById('trialBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'trialBanner';
    banner.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 24px;
        text-align: center;
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Inter', sans-serif;
    `;

    const daysText = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
    const urgencyClass = daysRemaining <= 3 ? 'urgent' : '';

    banner.innerHTML = `
        <span style="font-size: 14px;">
            🎉 You're on a 14-day free trial! <strong>${daysText} remaining</strong>.
        </span>
        <button onclick="window.location.href='/marketing-site/checkout.html?plan=Professional&currency=INR'" 
                style="margin-left: 16px; background: white; color: #667eea; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; transition: transform 0.2s;">
            Upgrade Now
        </button>
    `;

    document.body.prepend(banner);

    // Add hover effect to button
    const upgradeBtn = banner.querySelector('button');
    upgradeBtn.addEventListener('mouseenter', () => {
        upgradeBtn.style.transform = 'scale(1.05)';
    });
    upgradeBtn.addEventListener('mouseleave', () => {
        upgradeBtn.style.transform = 'scale(1)';
    });
}

function showPaymentRequiredModal() {
    // Check if modal already exists
    if (document.getElementById('paymentModal')) return;

    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 48px; border-radius: 20px; max-width: 500px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
            <h2 style="margin: 0 0 16px; color: #1a1d2e; font-size: 24px;">Your 14-Day Trial Has Ended</h2>
            <p style="color: #666; margin-bottom: 32px; font-size: 15px;">Continue enjoying MindWave by upgrading to a paid plan.</p>
            <button onclick="window.location.href='/marketing-site/checkout.html?plan=Professional&currency=INR'" 
                    style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 16px 32px; border-radius: 999px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 8px; transition: transform 0.2s; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                Upgrade to Professional - ₹2,499/month
            </button>
            <br>
            <button onclick="window.location.href='/marketing-site/checkout.html?plan=Personal&currency=INR'" 
                    style="background: rgba(0,0,0,0.1); color: #333; border: none; padding: 16px 32px; border-radius: 999px; font-size: 16px; font-weight: 600; cursor: pointer; margin: 8px; transition: transform 0.2s;">
                Start with Starter - ₹499/month
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Add hover effects
    modal.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
        });
    });
}

function updateDashboardMetrics(data) {
    // Update organization name
    const orgNameEl = document.getElementById('orgName');
    if (orgNameEl && data.organization) {
        orgNameEl.textContent = data.organization.name;
    }

    // Update subscription card based on trial status
    const subscriptionCard = document.getElementById('subscriptionCard');
    const subscriptionIcon = document.getElementById('subscriptionIcon');
    const planNameEl = document.getElementById('planName');
    const subscriptionStatusEl = document.getElementById('subscriptionStatus');
    const planPriceEl = document.getElementById('planPrice');
    const subscriptionDetailsEl = document.getElementById('subscriptionDetails');
    const viewInvoicesBtn = document.getElementById('viewInvoicesBtn');
    const updatePaymentBtn = document.getElementById('updatePaymentBtn');

    if (data.isTrialActive) {
        // TRIAL MODE
        subscriptionIcon.textContent = '⏰';

        const planNames = {
            'basic': 'Starter Plan',
            'premium': 'Professional Plan'
        };
        planNameEl.textContent = planNames[data.subscriptionTier] || 'Free Trial';

        subscriptionStatusEl.textContent = `${data.daysRemaining} Days Free Trial Remaining`;
        subscriptionStatusEl.style.color = data.daysRemaining <= 3 ? '#f59e0b' : '#10b981';

        const planPrices = {
            'basic': '₹499',
            'premium': '₹2,499'
        };
        planPriceEl.textContent = `${planPrices[data.subscriptionTier] || '₹499'}/month after trial`;

        const trialEndDate = new Date(data.trialEndsAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        subscriptionDetailsEl.innerHTML = `
            Your <strong>14-day free trial</strong> ends on <strong>${trialEndDate}</strong>. 
            You have full access to all ${planNames[data.subscriptionTier] || 'plan'} features. 
            No payment required until trial ends.
        `;

        // Update buttons for trial
        viewInvoicesBtn.textContent = '🎉 Enjoying the Trial?';
        viewInvoicesBtn.onclick = () => {
            window.location.href = '/marketing-site/checkout.html?plan=' + (data.subscriptionTier === 'basic' ? 'Personal' : 'Professional') + '&currency=INR';
        };

        updatePaymentBtn.textContent = '⚡ Upgrade Now';
        updatePaymentBtn.onclick = () => {
            window.location.href = '/marketing-site/checkout.html?plan=' + (data.subscriptionTier === 'basic' ? 'Personal' : 'Professional') + '&currency=INR';
        };

    } else {
        // ACTIVE SUBSCRIPTION MODE
        subscriptionIcon.textContent = '💎';

        const planNames = {
            'basic': 'Starter Plan',
            'premium': 'Professional Plan'
        };
        planNameEl.textContent = planNames[data.subscriptionTier] || 'Active Plan';

        subscriptionStatusEl.textContent = 'Active Subscription';
        subscriptionStatusEl.style.color = '#10b981';

        const planPrices = {
            'basic': '₹499',
            'premium': '₹2,499'
        };
        planPriceEl.textContent = `${planPrices[data.subscriptionTier] || '₹499'}/month`;

        // For active subscriptions, show renewal date
        const renewalDate = data.trialEndsAt ? new Date(data.trialEndsAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'N/A';

        subscriptionDetailsEl.innerHTML = `
            Your subscription renews on <strong>${renewalDate}</strong>. 
            You have access to all ${planNames[data.subscriptionTier] || 'plan'} features 
            including ${data.subscriptionTier === 'premium' ? 'unlimited AI calls and priority support' : 'essential features and email support'}.
        `;

        // Reset buttons for active subscription
        viewInvoicesBtn.textContent = '📄 View Invoices';
        viewInvoicesBtn.onclick = () => alert('View Invoices');

        updatePaymentBtn.textContent = '💳 Update Payment';
        updatePaymentBtn.onclick = () => alert('Update Payment');
    }

    // Update AI API calls
    const aiCallsEl = document.getElementById('aiCalls');
    if (aiCallsEl && data.usage) {
        aiCallsEl.textContent = data.usage.aiCallsThisMonth.toLocaleString();

        // Update usage limit text
        const usageLimitEls = document.querySelectorAll('.usage-limit');
        if (usageLimitEls.length > 0) {
            usageLimitEls[0].textContent = `of ${data.usage.aiCallsLimit.toLocaleString()} this month`;
        }

        // Update progress bar
        const progressBars = document.querySelectorAll('.progress-bar-fill');
        if (progressBars.length > 0) {
            progressBars[0].style.width = `${data.usage.aiCallsPercentage}%`;

            // Change color based on usage
            if (data.usage.aiCallsPercentage > 80) {
                progressBars[0].style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
            } else if (data.usage.aiCallsPercentage > 50) {
                progressBars[0].style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
            } else {
                progressBars[0].style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
            }
        }

        // Update stat change text
        const statChanges = document.querySelectorAll('.stat-change');
        if (statChanges.length > 0) {
            const remaining = data.usage.aiCallsLimit - data.usage.aiCallsThisMonth;
            statChanges[0].innerHTML = `<span>${data.usage.aiCallsPercentage}% used • ${remaining.toLocaleString()} remaining</span>`;
        }

        // Show warning if approaching limit
        if (data.usage.aiCallsPercentage > 80) {
            showLimitWarning('AI API calls', data.usage.aiCallsThisMonth, data.usage.aiCallsLimit);
        }
    }

    // Update storage
    if (data.usage && data.usage.storageLimit > 0) {
        const storageUsedGB = (data.usage.storageUsed / 1024).toFixed(1);
        const storageLimitGB = (data.usage.storageLimit / 1024).toFixed(0);

        const storageValueEls = document.querySelectorAll('.stat-value');
        if (storageValueEls.length > 1) {
            storageValueEls[1].textContent = `${storageUsedGB} GB`;
        }

        const usageLimitEls = document.querySelectorAll('.usage-limit');
        if (usageLimitEls.length > 1) {
            usageLimitEls[1].textContent = `of ${storageLimitGB} GB`;
        }

        const progressBars = document.querySelectorAll('.progress-bar-fill');
        if (progressBars.length > 1) {
            progressBars[1].style.width = `${data.usage.storagePercentage}%`;

            // Change color based on usage
            if (data.usage.storagePercentage > 80) {
                progressBars[1].style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
            } else if (data.usage.storagePercentage > 50) {
                progressBars[1].style.background = 'linear-gradient(90deg, #8b5cf6, #ec4899)';
            } else {
                progressBars[1].style.background = 'linear-gradient(90deg, #10b981, #8b5cf6)';
            }
        }

        const statChanges = document.querySelectorAll('.stat-change');
        if (statChanges.length > 1) {
            const remainingGB = ((data.usage.storageLimit - data.usage.storageUsed) / 1024).toFixed(1);
            statChanges[1].innerHTML = `<span>${data.usage.storagePercentage}% used • ${remainingGB} GB remaining</span>`;
        }
    }

    // Update student count
    const studentCountEl = document.getElementById('studentCount');
    if (studentCountEl && data.usage) {
        studentCountEl.textContent = data.usage.studentCount || 0;
    }

    // Update team count (would come from separate API call)
    const teamCountEl = document.getElementById('teamCount');
    if (teamCountEl) {
        // Keep existing value or fetch from API
    }
}

function showLimitWarning(resourceName, used, limit) {
    // Check if warning already exists
    if (document.getElementById('limitWarning')) return;

    const warning = document.createElement('div');
    warning.id = 'limitWarning';
    warning.style.cssText = `
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 12px 16px;
        margin: 16px 0;
        border-radius: 4px;
        font-family: 'Inter', sans-serif;
    `;
    warning.innerHTML = `
        <strong>⚠️ Approaching Limit:</strong> You've used ${used.toLocaleString()} of ${limit.toLocaleString()} ${resourceName} this month.
        <a href="/marketing-site/checkout.html?plan=Professional&currency=INR" style="color: #0066ff; font-weight: 600; margin-left: 8px; text-decoration: none;">
            Upgrade to Professional
        </a>
    `;

    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent) {
        mainContent.prepend(warning);
    }
}

// Initialize trial checking
document.addEventListener('DOMContentLoaded', () => {
    checkTrialStatus();

    // Start auto-refresh for real-time updates
    if (typeof orgDataService !== 'undefined') {
        console.log('🚀 Starting real-time data service...');

        // Initial data load
        orgDataService.refreshAll();

        // Set up event listeners for data updates
        orgDataService.on('trialStatus', (data) => {
            console.log('📊 Trial status updated');
            updateDashboardMetrics(data);
        });

        orgDataService.on('students', (data) => {
            console.log('🎓 Student data updated:', data.total);
            const studentCountEl = document.getElementById('studentCount');
            if (studentCountEl) {
                studentCountEl.textContent = data.total || 0;
            }
        });

        orgDataService.on('teamMembers', (data) => {
            console.log('👥 Team members updated:', data.total);
            const teamCountEl = document.getElementById('teamCount');
            if (teamCountEl) {
                teamCountEl.textContent = data.total || 0;
            }
        });

        orgDataService.on('games', (data) => {
            console.log('🎮 Games data updated:', data.total);
            // Update games count if element exists
        });

        // Start auto-refresh every 30 seconds
        orgDataService.startAutoRefresh(30000);

        console.log('✅ Real-time data service initialized');
    } else {
        console.warn('⚠️ org-data-service.js not loaded - real-time updates disabled');
    }
});

// Refresh trial status every 5 minutes
setInterval(checkTrialStatus, 5 * 60 * 1000);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (typeof orgDataService !== 'undefined') {
        orgDataService.stopAutoRefresh();
    }
});


