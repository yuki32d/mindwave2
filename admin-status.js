/**
 * admin-status.js
 * Real-time system status powered by UptimeRobot API v2.
 * -------------------------------------------------------
 * Features:
 *  - Live monitor status, uptime ratios, response times
 *  - 90-day uptime bars from log/response data
 *  - Auto-refresh every 60 seconds with countdown
 *  - Response-time Chart.js integration
 *  - API key stored in localStorage (never sent to your backend)
 */

(function () {
    'use strict';

    /* ── Constants ── */
    const LS_KEY           = 'mw_uptimerobot_key';
    const REFRESH_SECS     = 60;
    // Server-side proxy (API key stays on Render, never in browser)
    const PROXY_ENDPOINT   = '/api/uptimerobot/monitors';
    // Direct UptimeRobot endpoint (fallback if no server key configured)
    const URT_DIRECT       = 'https://api.uptimerobot.com/v2/getMonitors';
    const BAR_DAYS         = 90;

    /* ── State ── */
    let apiKey          = localStorage.getItem(LS_KEY) || '';
    let monitors        = [];
    let rtChart         = null;
    let refreshTimer    = null;
    let countdown       = REFRESH_SECS;

    /* ── DOM Refs ── */
    const $             = id => document.getElementById(id);
    const $q            = sel => document.querySelector(sel);

    /* ════════════════════════════════════════
       1. API KEY MANAGEMENT
    ════════════════════════════════════════ */

    function showBanner(openForEdit = false) {
        const banner = $('apiBanner');
        if (!banner) return;
        if (openForEdit || !apiKey) {
            banner.classList.remove('hidden');
            $('apiKeyInput').value = apiKey;
            $('apiKeyInput').focus();
        } else {
            banner.classList.add('hidden');
        }
    }

    function saveKey() {
        const val = $('apiKeyInput').value.trim();
        if (!val) { tLog('CONFIG', 'API key cannot be empty.', 'warn'); return; }
        apiKey = val;
        localStorage.setItem(LS_KEY, apiKey);
        $('apiBanner').classList.add('hidden');
        tLog('CONFIG', 'API key saved. Fetching monitors...', 'ok');
        fetchAll();
    }

    /* ════════════════════════════════════════
       2. UPTIMEROBOT API FETCH
    ════════════════════════════════════════ */

    async function fetchAll() {
        setRefreshSpinner(true);

        // ── Step 1: Try the server-side proxy (API key stays on Render) ──
        try {
            tLog('API', 'POST /api/uptimerobot/monitors (server proxy)', 'info');
            const res = await fetch(PROXY_ENDPOINT, { method: 'POST' });
            const data = await res.json();

            if (res.status === 503) {
                // Server key not configured → fall through to client key
                tLog('PROXY', 'Server key not set. Trying client key...', 'warn');
                throw new Error('no_server_key');
            }

            if (!res.ok || data.stat !== 'ok') {
                throw new Error(data.error?.message || `HTTP ${res.status}`);
            }

            monitors = data.monitors || [];
            tLog('API', `SUCCESS (proxy) · ${monitors.length} monitor(s)`, 'ok');
            $('apiBanner').classList.add('hidden'); // Hide banner if was open
            renderAll();
            scheduleRefresh();
            return; // Done ✓

        } catch (proxyErr) {
            if (proxyErr.message !== 'no_server_key') {
                // Real error — report and stop
                tLog('API', `ERROR · ${proxyErr.message}`, 'err');
                renderError(proxyErr.message);
                setRefreshSpinner(false);
                return;
            }
        }

        // ── Step 2: Fallback — use localStorage API key (direct call) ──
        if (!apiKey) {
            tLog('CONFIG', 'No API key. Enter your UptimeRobot key.', 'warn');
            showNoConfig();
            setRefreshSpinner(false);
            return;
        }

        try {
            tLog('API', 'POST api.uptimerobot.com (direct, localStorage key)', 'info');
            const body = new URLSearchParams({
                api_key:              apiKey,
                format:               'json',
                logs:                 '1',
                logs_limit:           '50',
                response_times:       '1',
                response_times_limit: '48',
                custom_uptime_ratio:  '7-30-90',
                all_time_uptime_ratio: '1'
            });
            const res = await fetch(URT_DIRECT, {
                method:  'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body:    body.toString()
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.stat !== 'ok') throw new Error(data.error?.message || 'UptimeRobot error');

            monitors = data.monitors || [];
            tLog('API', `SUCCESS (direct) · ${monitors.length} monitor(s)`, 'ok');
            renderAll();
            scheduleRefresh();

        } catch (err) {
            tLog('API', `ERROR · ${err.message}`, 'err');
            renderError(err.message);
        } finally {
            setRefreshSpinner(false);
        }
    }

    /* ════════════════════════════════════════
       3. RENDER EVERYTHING
    ════════════════════════════════════════ */

    function renderAll() {
        updateGlobalBanner();
        updateStats();
        renderMonitors();
        renderChart();
        $('chartSection').style.display = monitors.length ? '' : 'none';
    }

    /* ── 3.1 Global Banner ── */
    function updateGlobalBanner() {
        const banner   = $('globalBanner');
        const bannerTxt= $('bannerText');
        const bannerSub= $('bannerSub');
        const icon     = $('bannerIcon');

        if (!monitors.length) return;

        const anyDown  = monitors.some(m => m.status === 9);
        const anyDeg   = monitors.some(m => m.status === 8);
        const allUp    = !anyDown && !anyDeg;

        banner.className = allUp ? 'ok' : anyDown ? 'down' : 'degraded';

        bannerTxt.textContent = allUp    ? 'All Systems Operational'
                              : anyDown  ? 'Partial Outage Detected'
                              : 'Some Services Degraded';

        icon.setAttribute('data-lucide', allUp ? 'check-circle-2' : anyDown ? 'alert-octagon' : 'alert-triangle');
        lucide.createIcons();

        const now = new Date();
        $('monitorCount').textContent = monitors.length;
        $('bannerLastCheck').textContent = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    }

    /* ── 3.2 Stats Cards ── */
    function updateStats() {
        if (!monitors.length) return;

        const upCount   = monitors.filter(m => m.status === 2).length;
        const downCount = monitors.filter(m => m.status === 9).length;

        $('statUp').textContent    = upCount;
        $('statTotal').textContent = monitors.length;
        $('statUp').className      = `stat-value ${upCount === monitors.length ? 'green' : downCount > 0 ? 'red' : 'yellow'}`;

        // 7-day avg uptime from custom_uptime_ratio field
        const ratios = monitors
            .map(m => {
                const r = m.custom_uptime_ratio;
                if (!r) return null;
                const parts = r.split('-');
                return parseFloat(parts[0]);
            })
            .filter(n => n !== null && !isNaN(n));

        const avg7d = ratios.length ? (ratios.reduce((a,b) => a+b, 0) / ratios.length) : null;
        const s7d   = $('stat7d');
        s7d.textContent  = avg7d !== null ? avg7d.toFixed(2) + '%' : '—';
        s7d.className    = `stat-value ${avg7d === null ? '' : avg7d >= 99.9 ? 'green' : avg7d >= 99 ? 'yellow' : 'red'}`;

        // Avg response time
        const avgResp = getAvgResponseTime();
        $('statAvgResp').textContent = avgResp !== null ? avgResp + 'ms' : '—';

        // Incident count: count monitors that have had at least one 'down' log in last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
        let incidents = 0;
        monitors.forEach(m => {
            if (!m.logs) return;
            const hadDown = m.logs.some(l => l.type === 1 && l.datetime * 1000 >= thirtyDaysAgo);
            if (hadDown) incidents++;
        });
        $('statIncidents').textContent = incidents;
        $('statIncidents').className   = `stat-value ${incidents === 0 ? 'green' : incidents <= 2 ? 'yellow' : 'red'}`;
    }

    function getAvgResponseTime() {
        let total = 0, count = 0;
        monitors.forEach(m => {
            if (m.average_response_time) {
                total += parseInt(m.average_response_time);
                count++;
            } else if (m.response_times && m.response_times.length) {
                const vals = m.response_times.map(r => r.value);
                total += vals.reduce((a,b)=>a+b,0) / vals.length;
                count++;
            }
        });
        return count ? Math.round(total / count) : null;
    }

    /* ── 3.3 Monitor Cards ── */
    function renderMonitors() {
        const container = $('monitorsContainer');
        container.innerHTML = '';

        if (!monitors.length) {
            container.innerHTML = `<div class="empty-monitors"><i data-lucide="inbox" style="width:28px;margin-bottom:10px;opacity:0.4;"></i><br>No monitors found. Add monitors in your UptimeRobot dashboard.</div>`;
            lucide.createIcons();
            return;
        }

        monitors.forEach(monitor => {
            const card = buildMonitorCard(monitor);
            container.appendChild(card);
        });

        lucide.createIcons();
    }

    function buildMonitorCard(m) {
        const statusClass = statusToClass(m.status);
        const statusLabel = statusToLabel(m.status);
        const typeName    = typeToLabel(m.type);

        // Parse custom uptime ratios (7-30-90 days)
        const ratios = (m.custom_uptime_ratio || '').split('-').map(parseFloat);
        const r7   = isNaN(ratios[0]) ? null : ratios[0];
        const r30  = isNaN(ratios[1]) ? null : ratios[1];
        const r90  = isNaN(ratios[2]) ? null : ratios[2];

        // Latest response time
        let latestRT = null;
        if (m.response_times && m.response_times.length) {
            latestRT = m.response_times[m.response_times.length - 1].value;
        } else if (m.average_response_time) {
            latestRT = parseInt(m.average_response_time);
        }

        const card = document.createElement('div');
        card.className = `monitor-card ${statusClass}`;
        card.id = `mcard-${m.id}`;

        card.innerHTML = `
            <div class="monitor-header">
                <div class="monitor-name">
                    <span>${escHtml(m.friendly_name)}</span>
                    <span class="monitor-type-badge">${typeName}</span>
                </div>
                <div class="status-pill ${statusClass}">
                    <div class="s-dot"></div>
                    ${statusLabel}
                </div>
            </div>

            <div class="uptime-bars" id="bars-${m.id}"></div>

            <div class="monitor-footer">
                <span style="font-size:11px;color:var(--muted);">${BAR_DAYS} days ago ← → Today</span>
                ${latestRT !== null ? `<span class="meta-item"><i data-lucide="activity" style="width:11px;height:11px;"></i> ${latestRT}ms</span>` : ''}
            </div>

            <div class="ratio-badges" style="margin-top:14px;">
                ${buildRatioBadge('7-day', r7)}
                ${buildRatioBadge('30-day', r30)}
                ${buildRatioBadge('90-day', r90)}
                ${m.url ? `<div style="margin-left:auto;display:flex;align-items:center;"><a href="${escHtml(m.url)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--muted);text-decoration:none;display:flex;align-items:center;gap:4px;"><i data-lucide="external-link" style="width:10px;height:10px;"></i>${truncate(m.url, 40)}</a></div>` : ''}
            </div>
        `;

        // Build uptime bars from logs
        setTimeout(() => buildBars(m, card.querySelector(`#bars-${m.id}`)), 0);

        return card;
    }

    function buildRatioBadge(label, val) {
        if (val === null) return '';
        const cls = val >= 99.9 ? 'high' : val >= 99 ? 'mid' : 'low';
        return `<div class="ratio-badge">
            <div class="ratio-badge-label">${label}</div>
            <div class="ratio-badge-val ${cls}">${val.toFixed(2)}%</div>
        </div>`;
    }

    function buildBars(monitor, container) {
        if (!container) return;
        container.innerHTML = '';

        const tooltip = $('tt');

        // Build a day-keyed map from logs (type 1 = down, 2 = started, 98/99 = down/up)
        const downDays = new Set();
        const degradedDays = new Set();

        if (monitor.logs) {
            monitor.logs.forEach(log => {
                const d = new Date(log.datetime * 1000);
                const key = dayKey(d);
                if (log.type === 1) downDays.add(key);         // DOWN
                else if (log.type === 5) degradedDays.add(key); // Alert
            });
        }

        const today = new Date();

        for (let i = 0; i < BAR_DAYS; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - (BAR_DAYS - 1 - i));
            const key = dayKey(d);

            const bar = document.createElement('div');
            bar.className = 'u-bar';

            if (downDays.has(key))     bar.classList.add('down');
            else if (degradedDays.has(key)) bar.classList.add('degraded');
            else                       bar.classList.add('up');

            const label = d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
            const stLabel = downDays.has(key) ? 'Downtime' : degradedDays.has(key) ? 'Degraded' : 'Operational';

            bar.addEventListener('mouseenter', (e) => {
                tooltip.innerHTML = `<strong>${label}</strong><br>${stLabel}`;
                tooltip.style.display = 'block';
            });
            bar.addEventListener('mousemove', (e) => {
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top  = (e.clientY - 48) + 'px';
            });
            bar.addEventListener('mouseleave', () => tooltip.style.display = 'none');

            container.appendChild(bar);
        }
    }

    /* ── 3.4 Response Time Chart ── */
    function renderChart() {
        if (!monitors.length) return;
        $('chartSection').style.display = '';

        // Rebuild tabs
        const tabsEl = $q('.chart-tabs');
        tabsEl.innerHTML = '<button class="chart-tab active" data-mid="all">All</button>';
        monitors.forEach(m => {
            const btn = document.createElement('button');
            btn.className = 'chart-tab';
            btn.dataset.mid = m.id;
            btn.textContent = truncate(m.friendly_name, 16);
            tabsEl.appendChild(btn);
        });

        tabsEl.querySelectorAll('.chart-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                tabsEl.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                drawChart(btn.dataset.mid === 'all' ? null : parseInt(btn.dataset.mid));
                tLog('CHART', `Monitor filter: ${btn.textContent.trim()}`, 'info');
            });
        });

        drawChart(null);
    }

    function drawChart(monitorId) {
        const ctx = $('rtChart');
        if (!ctx) return;

        // Collect response time data points
        let rtData = [];

        if (monitorId) {
            const m = monitors.find(x => x.id === monitorId);
            if (m && m.response_times) rtData = m.response_times.slice(-48);
        } else {
            // Merge all monitors — average by matching timestamp proximity
            const allRts = [];
            monitors.forEach(m => {
                if (m.response_times) m.response_times.forEach(r => allRts.push(r));
            });
            allRts.sort((a,b) => a.datetime - b.datetime);
            rtData = allRts.slice(-60);
        }

        const labels = rtData.map(r => {
            const d = new Date(r.datetime * 1000);
            return d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        });
        const values = rtData.map(r => r.value);

        const isDark = true;
        const gridColor = 'rgba(255,255,255,0.05)';
        const textColor = '#64748b';

        if (rtChart) {
            rtChart.data.labels = labels;
            rtChart.data.datasets[0].data = values;
            rtChart.update('active');
            return;
        }

        rtChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Response Time (ms)',
                    data: values,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.06)',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'nearest', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10,14,26,0.95)',
                        titleColor: '#94a3b8',
                        bodyColor: '#e2e8f0',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: ctx => `${ctx.parsed.y} ms`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: 10 }, maxRotation: 0, maxTicksLimit: 8 },
                        border: { display: false }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { size: 10 }, callback: v => v + 'ms' },
                        border: { display: false }
                    }
                }
            }
        });
    }

    /* ════════════════════════════════════════
       4. AUTO-REFRESH
    ════════════════════════════════════════ */

    function scheduleRefresh() {
        clearInterval(refreshTimer);
        countdown = REFRESH_SECS;
        updateCountdownEl();

        refreshTimer = setInterval(() => {
            countdown--;
            updateCountdownEl();
            if (countdown <= 0) {
                tLog('AUTO_REFRESH', 'Scheduled refresh triggered', 'info');
                fetchAll();
            }
        }, 1000);
    }

    function updateCountdownEl() {
        const el = $('countdownEl');
        if (el) el.textContent = `Next: ${countdown}s`;
    }

    /* ════════════════════════════════════════
       5. CLOCK
    ════════════════════════════════════════ */

    function tickClock() {
        const el = $('clockEl');
        if (!el) return;
        const now = new Date();
        el.textContent = `${now.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})} · ${now.toLocaleTimeString('en-GB')}`;
    }

    /* ════════════════════════════════════════
       6. TERMINAL LOGGER
    ════════════════════════════════════════ */

    function tLog(module, msg, level = 'info') {
        const term = $('terminal');
        if (!term) return;
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const line = document.createElement('div');
        line.className = 't-line';
        const lvlClass = level === 'ok' ? 't-ok' : level === 'err' ? 't-err' : level === 'warn' ? 't-warn' : 't-info';
        line.innerHTML = `<span class="t-time">[${time}]</span><span class="t-module"> ${escHtml(module)}</span> <span class="${lvlClass}">→ ${escHtml(msg)}</span>`;
        term.appendChild(line);
        term.scrollTop = term.scrollHeight;
        if (term.children.length > 40) term.removeChild(term.firstChild);
    }

    /* ════════════════════════════════════════
       7. UI HELPERS
    ════════════════════════════════════════ */

    function showNoConfig() {
        const container = $('monitorsContainer');
        container.innerHTML = `
            <div class="no-config" id="noConfigState">
                <div class="no-config-icon">
                    <i data-lucide="plug-zap" style="width:32px;height:32px;"></i>
                </div>
                <h2>Connect UptimeRobot</h2>
                <p>Enter your UptimeRobot Read-Only API key to see real-time status for all your monitored services.</p>
                <button class="btn btn-primary" id="heroConfigBtn" style="margin-top:8px;">
                    <i data-lucide="key" style="width:13px;height:13px;"></i> Enter API Key
                </button>
            </div>`;
        lucide.createIcons();
        document.getElementById('heroConfigBtn')?.addEventListener('click', () => showBanner(true));
        $('apiBanner').classList.remove('hidden');
        $('chartSection').style.display = 'none';
    }

    function renderError(msg) {
        const container = $('monitorsContainer');
        container.innerHTML = `
            <div class="empty-monitors" style="border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.04);">
                <i data-lucide="alert-triangle" style="width:24px;height:24px;color:var(--red);margin-bottom:8px;"></i>
                <div style="color:var(--red);font-weight:700;margin-bottom:6px;">Failed to fetch monitors</div>
                <div style="font-size:12px;color:var(--muted);">${escHtml(msg)}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:8px;">Check your API key or try again.</div>
            </div>`;
        lucide.createIcons();
    }

    function setRefreshSpinner(on) {
        const btn = $('refreshBtn');
        if (!btn) return;
        btn.classList.toggle('spinning', on);
        btn.disabled = on;
    }

    /* ════════════════════════════════════════
       8. UTILITY
    ════════════════════════════════════════ */

    function statusToClass(s) {
        if (s === 2) return 'up';
        if (s === 9) return 'down';
        if (s === 8) return 'degraded';
        if (s === 0) return 'paused';
        return 'up';
    }

    function statusToLabel(s) {
        const map = { 0:'Paused', 1:'Not Checked', 2:'Up', 8:'Seems Down', 9:'Down' };
        return map[s] || `Status ${s}`;
    }

    function typeToLabel(t) {
        const map = { 1:'HTTP', 2:'Keyword', 3:'Ping', 4:'Port', 5:'Heartbeat' };
        return map[t] || 'Monitor';
    }

    function dayKey(d) {
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }

    function truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '…' : str;
    }

    function escHtml(str) {
        if (typeof str !== 'string') return String(str || '');
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ════════════════════════════════════════
       9. EVENT LISTENERS
    ════════════════════════════════════════ */

    function bindEvents() {
        $('saveKeyBtn')?.addEventListener('click', saveKey);
        $('cancelKeyBtn')?.addEventListener('click', () => {
            if (monitors.length) {
                $('apiBanner').classList.add('hidden');
            }
        });
        $('configBtn')?.addEventListener('click', () => showBanner(true));
        $('heroConfigBtn')?.addEventListener('click', () => showBanner(true));

        $('apiKeyInput')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') saveKey();
        });

        $('refreshBtn')?.addEventListener('click', () => {
            if (!apiKey) { showBanner(true); return; }
            tLog('MANUAL', 'Manual refresh triggered', 'ok');
            fetchAll();
        });

        $('subscribeBtn')?.addEventListener('click', () => {
            window.open('https://status.uptimerobot.com/', '_blank');
        });
    }

    /* ════════════════════════════════════════
       10. INIT
    ════════════════════════════════════════ */

    function init() {
        bindEvents();
        tickClock();
        setInterval(tickClock, 1000);

        tLog('STATUS_ENGINE', 'MindWave Status Dashboard v2.0 initialized', 'ok');
        tLog('CONFIG', 'Checking server proxy for UptimeRobot key...', 'info');

        // Always try fetchAll() — it checks the server proxy first,
        // then falls back to the localStorage key, and only then shows the banner.
        fetchAll();
    }

    document.addEventListener('DOMContentLoaded', init);

})();
