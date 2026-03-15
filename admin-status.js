/**
 * admin-status.js
 * Logic for the Admin System Status dashboard.
 */

(function() {
    const TOKEN = localStorage.getItem('token');
    
    // 1. Resource Simulation Logic
    function updateResources() {
        const cpu = Math.floor(Math.random() * 15) + 12; // 12-27% base
        const mem = Math.floor(Math.random() * 10) + 35; // 35-45% base
        
        document.getElementById('labelCpu').textContent = `${cpu}%`;
        document.getElementById('barCpu').style.width = `${cpu}%`;
        
        document.getElementById('labelMem').textContent = `${mem}%`;
        document.getElementById('barMem').style.width = `${mem}%`;

        // Add a "blip" to the terminal occasionally
        if (Math.random() > 0.8) {
            logToTerminal('AUTH_CHECK', 'VALIDATED', 'ok');
        }
    }

    // 2. Real-time Student Pulse
    async function fetchStudentPulse() {
        try {
            const res = await fetch('/api/admin/students', {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const data = await res.json();
            if (data.ok && data.students) {
                const onlineCount = data.students.filter(s => {
                    if (!s.lastActive) return false;
                    const diff = Date.now() - new Date(s.lastActive).getTime();
                    return diff < 300000; // 5 minutes
                }).length;
                
                document.getElementById('valOnlinePulse').textContent = onlineCount;
            }
        } catch (error) {
            console.error('Pulse check failed:', error);
        }
    }

    // 3. API Latency Check
    async function checkLatency() {
        const start = Date.now();
        try {
            await fetch('/api/health'); // Assuming health endpoint exists
            const latency = Date.now() - start;
            document.getElementById('valLatency').textContent = `${latency} ms`;
            const trend = document.getElementById('trendLatency');
            if (latency < 100) {
                trend.textContent = 'Excellent';
                trend.style.color = 'var(--green)';
            } else if (latency < 300) {
                trend.textContent = 'Good';
                trend.style.color = 'var(--accent)';
            } else {
                trend.textContent = 'Degraded';
                trend.style.color = 'var(--red)';
            }
        } catch {
            document.getElementById('valLatency').textContent = '> 1000 ms';
            document.getElementById('trendLatency').textContent = 'Timeout';
            document.getElementById('trendLatency').style.color = 'var(--red)';
        }
    }

    // 4. Terminal Logger
    function logToTerminal(module, action, status) {
        const terminal = document.getElementById('terminal');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const line = document.createElement('div');
        line.className = 'terminal-line';
        const colorClass = status === 'ok' ? 'terminal-ok' : (status === 'error' ? 'terminal-err' : '');
        
        line.innerHTML = `
            <span class="terminal-time">[${time}]</span> 
            <span class="terminal-cmd">${module}</span> ... 
            <span class="${colorClass}">${action}</span>
        `;
        
        terminal.appendChild(line);
        terminal.scrollTop = terminal.scrollHeight;
        
        // Keep logs lean
        if (terminal.children.length > 50) {
            terminal.removeChild(terminal.firstChild);
        }
    }

    // Initialize
    function init() {
        fetchStudentPulse();
        checkLatency();
        updateResources();
        
        // Registers
        setInterval(updateResources, 3000);
        setInterval(fetchStudentPulse, 30000);
        setInterval(checkLatency, 60000);
        
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            logToTerminal('MANUAL_REFRESH', 'EXECUTED', 'ok');
            fetchStudentPulse();
            checkLatency();
        });

        logToTerminal('CMD_CENTER', 'READY', 'ok');
    }

    document.addEventListener('DOMContentLoaded', init);

})();
