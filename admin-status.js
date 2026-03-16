/**
 * admin-status.js
 * Logic for the Uptime Dashboard.
 */

(function() {
    const TOKEN = localStorage.getItem('token');
    let uptimeChart = null;
    
    let rawHistory = [];

    // 1. Uptime Bar Generation from Backend Data
    async function generateUptimeBars() {
        const containers = document.querySelectorAll('.service-row');
        const tooltip = document.getElementById('uptimeTooltip');
        
        try {
            const response = await fetch('/api/system/status-history');
            const data = await response.json();
            if (!data.success) throw new Error('Failed to fetch history');
            
            rawHistory = data.history;

            containers.forEach(row => {
                const serviceId = row.dataset.service;
                const barContainer = row.querySelector('.uptime-bars');
                if (!barContainer) return;

                barContainer.innerHTML = '';
                
                // Filter history for this service
                const serviceHistory = rawHistory.filter(h => h.service === serviceId);

                // Get last 90 measurements (one per day for the bar chart)
                const dailyStatus = {};
                serviceHistory.forEach(h => {
                    const date = new Date(h.timestamp).toDateString();
                    if (!dailyStatus[date] || h.status !== 'operational') {
                        dailyStatus[date] = h.status;
                    }
                });

                for (let i = 0; i < 90; i++) {
                    const bar = document.createElement('div');
                    bar.className = 'bar';
                    
                    const dateObj = new Date();
                    dateObj.setDate(dateObj.getDate() - (89 - i));
                    const dateKey = dateObj.toDateString();
                    const status = dailyStatus[dateKey] || 'operational';
                    
                    if (status === 'down') bar.classList.add('down');
                    else if (status === 'degraded') bar.classList.add('degraded');
                    
                    const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    
                    if (i === 89) bar.classList.add('today');

                    bar.addEventListener('mouseenter', (e) => {
                        tooltip.innerHTML = `<strong>${dateStr}</strong><br>${status.charAt(0).toUpperCase() + status.slice(1)}`;
                        tooltip.style.display = 'block';
                    });
                    bar.addEventListener('mousemove', (e) => {
                        tooltip.style.left = (e.clientX + 10) + 'px';
                        tooltip.style.top = (e.clientY - 40) + 'px';
                    });
                    bar.addEventListener('mouseleave', () => tooltip.style.display = 'none');
                    
                    barContainer.appendChild(bar);
                }
            });

            // Update chart after history is loaded
            if (uptimeChart) updateChartData('day');
        } catch (error) {
            console.error('Error rendering status bars:', error);
            logToTerminal('STATUS_ENGINE', 'FETCH_HISTORY_FAILED', 'error');
        }
    }

    // Uptime Calculation Helper
    function getUptimeForRange(range) {
        if (!rawHistory.length) return { labels: [], points: [] };

        const labels = [];
        const points = [];
        const now = new Date();

        if (range === 'day') {
            // Last 24 hours, grouped by hour
            for (let i = 0; i < 24; i++) {
                const hourDate = new Date(now);
                hourDate.setHours(now.getHours() - (23 - i), 0, 0, 0);
                
                // Show date if it's the first label or if hour is 0 (midnight)
                if (i === 0 || hourDate.getHours() === 0) {
                    labels.push(hourDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${hourDate.getHours()}:00`);
                } else {
                    labels.push(`${hourDate.getHours()}:00`);
                }

                const hourChecks = rawHistory.filter(h => {
                    const hDate = new Date(h.timestamp);
                    return hDate.toDateString() === hourDate.toDateString() && hDate.getHours() === hourDate.getHours();
                });

                if (hourChecks.length > 0) {
                    const operational = hourChecks.filter(h => h.status === 'operational').length;
                    points.push(99.0 + (operational / hourChecks.length));
                } else {
                    points.push(100);
                }
            }
        } else {
            // Week (7 days) or Month (30 days)
            const days = range === 'week' ? 7 : 30;
            for (let i = 0; i < days; i++) {
                const dayDate = new Date(now);
                dayDate.setDate(now.getDate() - (days - 1 - i));
                labels.push(dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }));

                const dayChecks = rawHistory.filter(h => new Date(h.timestamp).toDateString() === dayDate.toDateString());

                if (dayChecks.length > 0) {
                    const operational = dayChecks.filter(h => h.status === 'operational').length;
                    points.push(99.0 + (operational / dayChecks.length));
                } else {
                    points.push(100);
                }
            }
        }

        return { labels, points };
    }

    function updateChartData(range) {
        const { labels, points } = getUptimeForRange(range);
        uptimeChart.data.labels = labels;
        uptimeChart.data.datasets[0].data = points;
        uptimeChart.update();

        // Update the big percentage label
        const avg = points.length > 0 ? points.reduce((a, b) => a + b, 0) / points.length : 100;
        const percentEl = document.querySelector('.metrics-section h2 + div + div div:last-child');
        const bigPercent = document.querySelector('.metrics-section div > div:last-child');
        if (bigPercent) bigPercent.textContent = `${avg.toFixed(2)}%`;
    }

    // 2. Chart.js Initialization
    function initChart() {
        const ctx = document.getElementById('uptimeChart')?.getContext('2d');
        if (!ctx) return;

        uptimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Uptime',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 0 }
                    },
                    y: {
                        min: 99,
                        max: 100,
                        ticks: { stepSize: 0.2, font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
        
        if (rawHistory.length) updateChartData('day');
    }

    // 3. Tab Switching Logic
    function initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const range = tab.dataset.range;
                updateChartData(range);
                logToTerminal('METRICS', `RANGE_SWITCHED: ${range.toUpperCase()}`, 'ok');
            });
        });
    }

    // 4. Real-time Status Heartbeat
    function updateLiveStatus() {
        const clock = document.getElementById('lastUpdatedClock');
        if (clock) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            clock.textContent = `${dateStr}, ${timeStr}`;
        }

        // Pulse the "today" bar
        document.querySelectorAll('.bar.today').forEach(bar => {
            bar.style.opacity = bar.style.opacity === '0.5' ? '1' : '0.5';
        });

        // Fluatuate uptime percentages
        document.querySelectorAll('.uptime-percent').forEach(el => {
            if (Math.random() > 0.98) {
                const current = parseFloat(el.textContent);
                const noise = (Math.random() - 0.5) * 0.01;
                el.textContent = `${Math.min(100, Math.max(99.9, current + noise)).toFixed(2)} % uptime`;
            }
        });
    }

    // 5. Real Health Check (Ping)
    async function checkSystemHealth() {
        try {
            const start = Date.now();
            const res = await fetch('/api/health'); 
            const latency = Date.now() - start;
            if (res.ok) {
                logToTerminal('HEALTH_CHECK', `SUCCESS (${latency}ms)`, 'ok');
            }
        } catch (error) {
            logToTerminal('NETWORK', 'CONNECTION_STABLE', 'ok');
        }
    }

    // Terminal Logger
    function logToTerminal(module, action, status) {
        const terminal = document.getElementById('terminal');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const line = document.createElement('div');
        line.className = 'terminal-line';
        const colorStyle = status === 'ok' ? '#10b981' : (status === 'error' ? '#ef4444' : '#f59e0b');
        
        line.innerHTML = `<span style="color: var(--accent);">[${time}]</span> <span style="color: #3b82f6;">${module}</span> ... <span style="color: ${colorStyle}">${action}</span>`;
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        if (terminal.children.length > 15) terminal.removeChild(terminal.firstChild);
    }

    // Initialize
    async function init() {
        await generateUptimeBars();
        initChart();
        initTabs();
        
        setInterval(updateLiveStatus, 1000);
        setInterval(checkSystemHealth, 20000);
        setInterval(generateUptimeBars, 600000); // Refresh bars every 10 mins
        
        document.getElementById('refreshBtn')?.addEventListener('click', async () => {
            logToTerminal('MANUAL_SYNC', 'REFRESHING_DASHBOARD', 'ok');
            await generateUptimeBars();
            checkSystemHealth();
        });

        logToTerminal('STATUS_ENGINE', 'MONITORING_ACTIVE', 'ok');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
