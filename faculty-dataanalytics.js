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

    topPerformersTable.innerHTML = students.map((student, index) => {
        let highlightClass = '';
        if (topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';

        const rowId = `student-row-${index}`;
        const detailsId = `student-details-${index}`;

        return `
            <tr class="${highlightClass} student-row" data-student-id="${student._id}" data-row-id="${rowId}" style="cursor: pointer;">
                <td><strong>${student.name}</strong> <span style="font-size: 12px; color: #9ea4b6;">▼</span></td>
                <td>${student.email}</td>
                <td>${student.gamesCompleted}</td>
                <td>${student.avgScore}%</td>
                <td>${formatTime(student.totalTime)}</td>
            </tr>
            <tr id="${detailsId}" class="student-details-row" style="display: none;">
                <td colspan="5" style="padding: 0; background: rgba(255,255,255,0.02);">
                    <div style="padding: 16px; border-left: 3px solid #0f62fe;">
                        <div class="loading-details" style="text-align: center; color: #9ea4b6; padding: 20px;">
                            Loading activity details...
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Add click handlers to student rows
    document.querySelectorAll('.student-row').forEach(row => {
        row.addEventListener('click', async function () {
            const studentId = this.dataset.studentId;
            const rowId = this.dataset.rowId;
            const detailsRow = this.nextElementSibling;

            // Toggle visibility
            if (detailsRow.style.display === 'none') {
                // Collapse all other rows first
                document.querySelectorAll('.student-details-row').forEach(r => r.style.display = 'none');
                document.querySelectorAll('.student-row span').forEach(s => s.textContent = '▼');

                // Expand this row
                detailsRow.style.display = 'table-row';
                this.querySelector('span').textContent = '▲';

                // Fetch and display details
                await loadStudentDetails(studentId, detailsRow);
            } else {
                // Collapse this row
                detailsRow.style.display = 'none';
                this.querySelector('span').textContent = '▼';
            }
        });
    });
}

async function loadStudentDetails(studentId, detailsRow) {
    const detailsContainer = detailsRow.querySelector('div');

    try {
        const data = await fetchAPI(`/api/analytics/students/${studentId}/activities`);

        if (!data || !data.ok || !data.activities || data.activities.length === 0) {
            detailsContainer.innerHTML = '<p style="text-align: center; color: #9ea4b6; padding: 20px;">No activity details found</p>';
            return;
        }

        const activities = data.activities;

        detailsContainer.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(255,255,255,0.05);">
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #9ea4b6;">Activity</th>
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #9ea4b6;">Start Time</th>
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #9ea4b6;">End Time</th>
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #9ea4b6;">Duration</th>
                        <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #9ea4b6;">Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(activity => {
            const startTime = new Date(activity.startTime).toLocaleString();
            const endTime = new Date(activity.endTime).toLocaleString();
            const duration = formatTime(activity.duration);

            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 8px;">
                                    <span class="tag blue">${activity.gameName}</span>
                                </td>
                                <td style="padding: 8px; font-size: 12px; color: #9ea4b6;">${startTime}</td>
                                <td style="padding: 8px; font-size: 12px; color: #9ea4b6;">${endTime}</td>
                                <td style="padding: 8px; font-size: 12px; color: #34c759;">${duration}</td>
                                <td style="padding: 8px; font-size: 12px; font-weight: 600;">
                                    ${activity.earnedPoints}/${activity.totalPoints} 
                                    <span style="color: #9ea4b6; font-weight: 400;">(${activity.score}%)</span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading student details:', error);
        detailsContainer.innerHTML = '<p style="text-align: center; color: #ff3b30; padding: 20px;">Failed to load activity details</p>';
    }
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

    studentActivityTable.innerHTML = students.map((student, index) => {
        const lastActive = new Date(student.lastActive).toLocaleString();
        let highlightClass = '';
        if (topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';

        const rowId = `student-activity-row-${index}`;
        const detailsId = `student-activity-details-${index}`;

        return `
            <tr class="${highlightClass} student-activity-row" data-student-id="${student._id}" data-row-id="${rowId}" style="cursor: pointer;">
                <td><strong>${student.name}</strong> <span style="font-size: 12px; color: #9ea4b6;">▼</span></td>
                <td>${student.email}</td>
                <td>${lastActive}</td>
                <td>${student.gamesPlayed}</td>
                <td>${student.completionRate}%</td>
            </tr>
            <tr id="${detailsId}" class="student-activity-details-row" style="display: none;">
                <td colspan="5" style="padding: 0; background: rgba(255,255,255,0.02);">
                    <div style="padding: 16px; border-left: 3px solid #0f62fe;">
                        <div class="loading-details" style="text-align: center; color: #9ea4b6; padding: 20px;">
                            Loading activity details...
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Add click handlers to student activity rows
    document.querySelectorAll('.student-activity-row').forEach(row => {
        row.addEventListener('click', async function () {
            const studentId = this.dataset.studentId;
            const rowId = this.dataset.rowId;
            const detailsRow = this.nextElementSibling;

            // Toggle visibility
            if (detailsRow.style.display === 'none') {
                // Collapse all other rows first
                document.querySelectorAll('.student-activity-details-row').forEach(r => r.style.display = 'none');
                document.querySelectorAll('.student-activity-row span').forEach(s => s.textContent = '▼');

                // Expand this row
                detailsRow.style.display = 'table-row';
                this.querySelector('span').textContent = '▲';

                // Fetch and display details
                await loadStudentDetails(studentId, detailsRow);
            } else {
                // Collapse this row
                detailsRow.style.display = 'none';
                this.querySelector('span').textContent = '▼';
            }
        });
    });
}

async function updateDashboard() {
    await Promise.all([
        renderAnalytics(),
        renderGameBreakdown(),
        renderTopPerformers(),
        renderStudentActivity()
    ]);
}

// Export functionality
async function getStudentActivityData() {
    const filters = getFilters();
    const data = await fetchAPI(`/api/analytics/students?timeRange=${filters.timeRange}`);

    if (!data || !data.ok || !data.students || data.students.length === 0) {
        return [];
    }

    // Fetch detailed activities for each student
    const exportData = [];

    for (const student of data.students) {
        const activitiesData = await fetchAPI(`/api/analytics/students/${student._id}/activities`);

        if (activitiesData && activitiesData.ok && activitiesData.activities) {
            // Export each activity as a separate row
            for (const activity of activitiesData.activities) {
                exportData.push({
                    'Student Name': student.name,
                    'Email': student.email,
                    'Activity': activity.gameName,
                    'Start Time': new Date(activity.startTime).toLocaleString(),
                    'End Time': new Date(activity.endTime).toLocaleString(),
                    'Duration': formatTime(activity.duration),
                    'Score': `${activity.earnedPoints}/${activity.totalPoints} (${activity.score}%)`,
                    'Completion Rate': `${student.completionRate}%`,
                    'Average Score': `${student.avgScore}%`
                });
            }
        } else {
            // If no activities, still export student summary
            exportData.push({
                'Student Name': student.name,
                'Email': student.email,
                'Activity': 'No activities',
                'Start Time': '-',
                'End Time': '-',
                'Duration': '-',
                'Score': '-',
                'Completion Rate': `${student.completionRate}%`,
                'Average Score': `${student.avgScore}%`
            });
        }
    }

    return exportData;
}

function exportToCSV() {
    getStudentActivityData().then(data => {
        if (data.length === 0) {
            alert('No student activity data to export');
            return;
        }

        // Create CSV content
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in values
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];

        link.setAttribute('href', url);
        link.setAttribute('download', `student_activity_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function exportToExcel() {
    getStudentActivityData().then(data => {
        if (data.length === 0) {
            alert('No student activity data to export');
            return;
        }

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // Student Name
            { wch: 30 }, // Email
            { wch: 25 }, // Activity
            { wch: 20 }, // Start Time
            { wch: 20 }, // End Time
            { wch: 12 }, // Duration
            { wch: 20 }, // Score
            { wch: 15 }, // Completion Rate
            { wch: 15 }  // Average Score
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Student Activity');

        // Generate file and download
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `student_activity_${date}.xlsx`);
    });
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();

    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    const exportToggleBtn = document.getElementById('exportToggleBtn');
    const exportPanel = document.getElementById('exportPanel');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');

    // Filter toggle
    filterToggleBtn.addEventListener('click', () => {
        const isHidden = filterPanel.style.display === 'none';
        filterPanel.style.display = isHidden ? 'block' : 'none';
        exportPanel.style.display = 'none'; // Close export panel
    });

    // Export toggle
    exportToggleBtn.addEventListener('click', () => {
        const isHidden = exportPanel.style.display === 'none';
        exportPanel.style.display = isHidden ? 'block' : 'none';
        filterPanel.style.display = 'none'; // Close filter panel
    });

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterToggleBtn.contains(e.target) && !filterPanel.contains(e.target)) {
            filterPanel.style.display = 'none';
        }
        if (!exportToggleBtn.contains(e.target) && !exportPanel.contains(e.target)) {
            exportPanel.style.display = 'none';
        }
    });

    // Export buttons
    exportCSVBtn.addEventListener('click', () => {
        exportToCSV();
        exportPanel.style.display = 'none';
    });

    exportExcelBtn.addEventListener('click', () => {
        exportToExcel();
        exportPanel.style.display = 'none';
    });

    const filterForm = document.getElementById('filterForm');
    filterForm.addEventListener('change', () => { updateDashboard(); });

    // Auto-refresh every 30 seconds (reduced from 3 seconds to avoid excessive DB queries)
    setInterval(updateDashboard, 30000);
});
