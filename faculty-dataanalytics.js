// Faculty Data Analytics - MINDWAVE
// Displays student activity, game performance, and engagement metrics

const API_BASE = window.location.origin;

// Fetch helper with auth
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { ok: false };
    }
}

function formatTime(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

async function renderAnalytics() {
    const data = await fetchAPI('/api/analytics/overview');

    if (!data || !data.ok) {
        document.getElementById('analyticsGrid').innerHTML = '<p style="color: #9ea4b6;">Failed to load analytics data</p>';
        return;
    }

    const { gamesPlayed, totalEngagement, activeStudents, totalStudents, topPerformer, consistentStudents } = data;

    const analyticsGrid = document.getElementById('analyticsGrid');
    analyticsGrid.innerHTML = `
        <article class="insight-card">
            <h3>Games Played</h3>
            <strong>${gamesPlayed}</strong>
            <div class="trend">Total attempts across all games</div>
            <div class="bar-meter">
                <div class="bar-fill" style="width: ${Math.min(100, (gamesPlayed / 50) * 100)}%;"></div>
            </div>
        </article>
        <article class="insight-card">
            <h3>Total Engagement</h3>
            <strong>${totalEngagement}%</strong>
            <div class="trend">${activeStudents} of ${totalStudents} students active</div>
            <div class="bar-meter">
                <div class="bar-fill" style="width: ${totalEngagement}%;"></div>
            </div>
        </article>
        <article class="insight-card">
            <h3>Top Performer</h3>
            <strong>${topPerformer ? topPerformer.name : 'N/A'}</strong>
            <div class="trend">${topPerformer ? topPerformer.totalScore : 0} games completed</div>
            <div class="bar-meter">
                <div class="bar-fill" style="width: ${topPerformer ? Math.min(100, (topPerformer.totalScore / 20) * 100) : 0}%;"></div>
            </div>
        </article>
        <article class="insight-card">
            <h3>Consistent Students</h3>
            <strong>${consistentStudents}</strong>
            <div class="trend">Completed 3+ games</div>
            <div class="bar-meter">
                <div class="bar-fill" style="width: ${totalStudents > 0 ? Math.min(100, (consistentStudents / totalStudents) * 100) : 0}%;"></div>
            </div>
        </article>
    `;
}

async function renderGameBreakdown() {
    const data = await fetchAPI('/api/analytics/games');

    const gameBreakdownTable = document.getElementById('gameBreakdownTable');

    if (!data || !data.ok || !data.games || data.games.length === 0) {
        gameBreakdownTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No game data available yet</td></tr>';
        return;
    }

    gameBreakdownTable.innerHTML = data.games.map(game => {
        return `
            <tr>
                <td><span class="tag blue">${game.title}</span></td>
                <td>${game.completions}</td>
                <td>${game.avgScore}%</td>
                <td>${formatTime(game.avgTime)}</td>
                <td>${game.topScorer ? `${game.topScorer.name} (${game.topScorer.score}%)` : 'N/A'}</td>
            </tr>
        `;
    }).join('');
}

function getFilters() {
    const filterForm = document.getElementById('filterForm');
    return {
        timeRange: filterForm.timeRange.value,
        topPerformerOnly: filterForm.topPerformerOnly.checked,
        engagementDetails: filterForm.engagementDetails.checked,
        bottomLiners: filterForm.bottomLiners.checked
    };
}

async function renderTopPerformers() {
    const filters = getFilters();
    const data = await fetchAPI(`/api/analytics/students?timeRange=${filters.timeRange}`);

    const topPerformersTable = document.getElementById('topPerformersTable');

    if (!data || !data.ok || !data.students || data.students.length === 0) {
        topPerformersTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No student activity yet</td></tr>';
        return;
    }

    let students = data.students;

    // Apply filters
    if (filters.topPerformerOnly) {
        students = students.filter(s => s.avgScore >= 70);
    }

    // Sort by avg score and take top 10
    students = students.sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);

    // Identify top and bottom performers
    const topPerformers = students.slice(0, 3).map(s => s.email);
    const bottomPerformers = students.slice(-3).map(s => s.email);

    topPerformersTable.innerHTML = students.map(student => {
        let highlightClass = '';
        if (topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';

        return `
            <tr class="${highlightClass}">
                <td><strong>${student.name}</strong></td>
                <td>${student.email}</td>
                <td>${student.gamesCompleted}</td>
                <td>${student.avgScore}%</td>
                <td>${formatTime(student.totalTime)}</td>
            </tr>
        `;
    }).join('');
}

async function renderStudentActivity() {
    const filters = getFilters();
    const data = await fetchAPI(`/api/analytics/students?timeRange=${filters.timeRange}`);

    const studentActivityTable = document.getElementById('studentActivityTable');

    if (!data || !data.ok || !data.students || data.students.length === 0) {
        studentActivityTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No student activity tracked yet</td></tr>';
        return;
    }

    let students = data.students;

    // Apply filters
    if (filters.engagementDetails) {
        students = students.filter(s => s.completionRate > 70);
    }

    if (filters.bottomLiners) {
        students = students.sort((a, b) => a.avgScore - b.avgScore).slice(0, 10);
    } else {
        students = students.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    }

    // Identify top and bottom performers for highlighting
    const allStudents = data.students.sort((a, b) => b.avgScore - a.avgScore);
    const topPerformers = allStudents.slice(0, 3).map(s => s.email);
    const bottomPerformers = allStudents.slice(-3).map(s => s.email);

    studentActivityTable.innerHTML = students.map(student => {
        const lastActive = new Date(student.lastActive).toLocaleString();
        let highlightClass = '';
        if (topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';

        return `
            <tr class="${highlightClass}">
                <td><strong>${student.name}</strong></td>
                <td>${student.email}</td>
                <td>${lastActive}</td>
                <td>${student.gamesPlayed}</td>
                <td>${student.completionRate}%</td>
            </tr>
        `;
    }).join('');
}

async function updateDashboard() {
    await Promise.all([
        renderAnalytics(),
        renderGameBreakdown(),
        renderTopPerformers(),
        renderStudentActivity()
    ]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();

    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    filterToggleBtn.addEventListener('click', () => {
        const isHidden = filterPanel.style.display === 'none';
        filterPanel.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (!filterToggleBtn.contains(e.target) && !filterPanel.contains(e.target)) {
            filterPanel.style.display = 'none';
        }
    });

    const filterForm = document.getElementById('filterForm');
    filterForm.addEventListener('change', () => { updateDashboard(); });

    // Auto-refresh every 30 seconds (reduced from 3 seconds to avoid excessive DB queries)
    setInterval(updateDashboard, 30000);
});
