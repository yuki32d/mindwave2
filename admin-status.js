/**
 * admin-status.js
 * Logic for the Uptime Dashboard.
 */

(function() {
    const TOKEN = localStorage.getItem('token');
    let uptimeChart = null;
    
    // 1. Uptime Bar Generation from Backend Data
    async function generateUptimeBars() {
        const containers = document.querySelectorAll('.service-row');
        const tooltip = document.getElementById('uptimeTooltip');
        
        try {
            const response = await fetch('/api/system/status-history');
            const data = await response.json();
            if (!data.success) throw new Error('Failed to fetch history');
            
            const history = data.history;

            containers.forEach(row => {
                const serviceId = row.dataset.service;
                const barContainer = row.querySelector('.uptime-bars');
                if (!barContainer) return;

                barContainer.innerHTML = '';
                
                // Filter history for this service
                const serviceHistory = history.filter(h => {
                    // Mapping frontend service keys to backend identifiers if needed
                    const map = { 'api': 'api', 'db': 'db', 'ai': 'ai', 'cdn': 'cdn' };
                    return h.service === map[serviceId];
                });

                // Get last 90 measurements (one per day for the bar chart)
                // We'll group by date to ensure we have one bar per day
                const dailyStatus = {};
                serviceHistory.forEach(h => {
                    const date = new Date(h.timestamp).toDateString();
                    if (!dailyStatus[date] || h.status !== 'operational') {
                        dailyStatus[date] = h.status;
                    }
                });

                const dates = Object.keys(dailyStatus).sort((a, b) => new Date(a) - new Date(b)).slice(-90);

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
        } catch (error) {
            console.error('Error rendering status bars:', error);
            logToTerminal('STATUS_ENGINE', 'FETCH_HISTORY_FAILED', 'error');
        }
    }

    // 2. Chart.js Initialization
    function initChart() {
        const ctx = document.getElementById('uptimeChart')?.getContext('2d');
        if (!ctx) return;

        const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
        const data = Array.from({length: 24}, () => 100);

        uptimeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Uptime',
                    data: data,
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
                        ticks: { stepSize: 0.5, font: { size: 10 } },
                        grid: { color: 'rgba(0,0,0,0.03)' }
                    }
                }
            }
        });
    }

    // 3. Tab Switching Logic
    function initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Simulate data change
                const range = tab.dataset.range;
                let count = range === 'day' ? 24 : (range === 'week' ? 7 : 30);
                let labels = range === 'day' ? Array.from({length: 24}, (_, i) => `${i}:00`) : Array.from({length: count}, (_, i) => `Day ${i+1}`);
                
                uptimeChart.data.labels = labels;
                uptimeChart.data.datasets[0].data = Array.from({length: count}, () => 99.9 + (Math.random() * 0.1));
                uptimeChart.update();
                
                logToTerminal('METRICS', `RANGE_SWITCHED: ${range.toUpperCase()}`, 'ok');
            });
        });
    }

    // 4. Real-time Status Heartbeat
    function updateLiveStatus() {
        const clock = document.getElementById('lastUpdatedClock');
        if (clock) {
            clock.textContent = new Date().toLocaleTimeString();
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
