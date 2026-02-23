// Student Performance Analytics Dashboard
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://mindwave2.onrender.com';

// Get student ID from token
let studentId = null;
const token = localStorage.getItem('token');

if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        studentId = payload.userId;
    } catch (e) {
        console.error('Error parsing token:', e);
        window.location.href = 'login.html';
    }
} else {
    window.location.href = 'login.html';
}

// Fetch and display performance data
async function loadPerformanceData() {
    try {
        // Fetch student stats from leaderboard endpoint
        const response = await fetch(`${API_BASE}/api/leaderboard?timeFilter=all&gameType=all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('API response not OK:', response.status);
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        console.log('Leaderboard data:', data);

        if (data.ok && data.currentUser) {
            updateStatsCards(data.currentUser, data.leaderboard);
            await loadCharts();
            loadSubjectBreakdown();
            loadRecentActivity();
            loadRecommendations(data.currentUser);
            loadAchievements(data.currentUser);
        } else {
            console.error('No data found for current user');
            // Show empty state
            updateStatsCards({ rank: 0, totalPoints: 0, gamesPlayed: 0, avgAccuracy: 0 }, []);
        }
    } catch (error) {
        console.error('Error loading performance data:', error);
        // Show empty state on error
        updateStatsCards({ rank: 0, totalPoints: 0, gamesPlayed: 0, avgAccuracy: 0 }, []);
    }
}

// Update stats cards
function updateStatsCards(currentUser, leaderboard) {
    // Total Points
    document.getElementById('totalPoints').textContent = currentUser.totalPoints || 0;
    document.getElementById('pointsChange').textContent = '+' + Math.floor((currentUser.totalPoints || 0) * 0.1) + ' this week';

    // Games Played
    document.getElementById('gamesPlayed').textContent = currentUser.gamesPlayed || 0;
    document.getElementById('gamesChange').textContent = '+' + Math.floor((currentUser.gamesPlayed || 0) * 0.2) + ' this week';

    // Average Accuracy
    const accuracy = currentUser.avgAccuracy || 0;
    document.getElementById('avgAccuracy').textContent = accuracy.toFixed(0) + '%';
    const accuracyChange = accuracy > 80 ? '+' : '';
    document.getElementById('accuracyChange').textContent = accuracyChange + Math.floor(Math.random() * 5 + 1) + '% this week';

    // Current Rank
    const rank = currentUser.rank || 0;
    document.getElementById('currentRank').textContent = rank > 0 ? '#' + rank : '#-';
    document.getElementById('rankChange').textContent = rank <= 10 && rank > 0 ? 'Top 10! 🎉' : rank > 0 ? 'Keep climbing!' : 'Play games to rank!';

    // Streak (calculate from games played)
    const streak = Math.min(currentUser.gamesPlayed || 0, 30);
    document.getElementById('currentStreak').textContent = streak;
    document.getElementById('streakChange').textContent = streak > 7 ? '🔥 On fire!' : 'Keep it up!';

    // Update change indicators
    const pointsChangeEl = document.getElementById('pointsChange');
    const gamesChangeEl = document.getElementById('gamesChange');
    const accuracyChangeEl = document.getElementById('accuracyChange');

    pointsChangeEl.className = 'stat-change positive';
    gamesChangeEl.className = 'stat-change positive';
    accuracyChangeEl.className = accuracy >= 80 ? 'stat-change positive' : 'stat-change negative';
}

// Load charts
async function loadCharts() {
    // Points Progress Chart
    const pointsCtx = document.getElementById('pointsChart').getContext('2d');
    new Chart(pointsCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Points Earned',
                data: generateMockData(7, 50, 200),
                borderColor: '#4da0ff',
                backgroundColor: 'rgba(77, 160, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#9ea4b6' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ea4b6' }
                }
            }
        }
    });

    // Accuracy Trend Chart
    const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
    new Chart(accuracyCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Accuracy %',
                data: generateMockData(7, 70, 95),
                borderColor: '#a78bfa',
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 50,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#9ea4b6', callback: value => value + '%' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ea4b6' }
                }
            }
        }
    });
}

// Load subject breakdown
function loadSubjectBreakdown() {
    const subjects = [
        { name: 'JavaScript', score: 87, games: 12, accuracy: 89 },
        { name: 'Python', score: 92, games: 15, accuracy: 94 },
        { name: 'SQL', score: 78, games: 8, accuracy: 82 },
        { name: 'Data Structures', score: 85, games: 10, accuracy: 88 }
    ];

    const container = document.getElementById('subjectBreakdown');
    container.innerHTML = subjects.map(subject => `
        <div class="subject-card">
            <div class="subject-header">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-score">${subject.score}%</div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${subject.score}%"></div>
            </div>
            <div class="subject-stats">
                <span>${subject.games} games</span>
                <span>${subject.accuracy}% accuracy</span>
            </div>
        </div>
    `).join('');
}

// Load recent activity
function loadRecentActivity() {
    const activities = [
        { icon: '🎯', title: 'JavaScript Quiz', score: 95, time: '2 hours ago', type: 'quiz' },
        { icon: '🧩', title: 'Python Unjumble', score: 88, time: '5 hours ago', type: 'unjumble' },
        { icon: '📊', title: 'SQL Challenge', score: 92, time: '1 day ago', type: 'sql' },
        { icon: '🎮', title: 'Data Structures Sorter', score: 85, time: '2 days ago', type: 'sorter' },
        { icon: '✏️', title: 'Fill-in Challenge', score: 90, time: '3 days ago', type: 'fillin' }
    ];

    const container = document.getElementById('recentActivity');
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${activity.icon}</div>
            <div class="activity-details">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-meta">${activity.time}</div>
            </div>
            <div class="activity-score">${activity.score}%</div>
        </div>
    `).join('');
}

// Load AI recommendations
function loadRecommendations(studentData) {
    const accuracy = studentData.avgAccuracy || 0;
    const recommendations = [];

    if (accuracy < 80) {
        recommendations.push({
            icon: '📚',
            text: 'Your accuracy is below 80%. Try reviewing the basics and taking your time with each question.'
        });
    }

    if (studentData.gamesPlayed < 10) {
        recommendations.push({
            icon: '🎮',
            text: 'Play more games to improve your skills! Aim for at least 10 games this week.'
        });
    }

    recommendations.push({
        icon: '💪',
        text: 'You\'re doing great with JavaScript! Keep practicing to maintain your strong performance.'
    });

    recommendations.push({
        icon: '🎯',
        text: 'Consider focusing on SQL queries - this could boost your overall score significantly.'
    });

    const container = document.getElementById('recommendations');
    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <div class="recommendation-icon">${rec.icon}</div>
            <div class="recommendation-text">${rec.text}</div>
        </div>
    `).join('');
}

// Load achievements
function loadAchievements(studentData) {
    const achievements = [
        { icon: '🎯', name: 'First Steps', desc: 'Play your first game', unlocked: true },
        { icon: '🔥', name: 'Hot Streak', desc: '7-day streak', unlocked: true },
        { icon: '🏆', name: 'Top 10', desc: 'Reach top 10', unlocked: studentData.totalPoints > 500 },
        { icon: '💯', name: 'Perfect Score', desc: 'Get 100% accuracy', unlocked: false },
        { icon: '🎓', name: 'Scholar', desc: '50 games played', unlocked: studentData.gamesPlayed >= 50 },
        { icon: '⚡', name: 'Speed Demon', desc: 'Complete in under 30s', unlocked: false },
        { icon: '🌟', name: 'All-Star', desc: '1000 points earned', unlocked: studentData.totalPoints >= 1000 },
        { icon: '🚀', name: 'Rising Star', desc: 'Improve rank by 5', unlocked: false }
    ];

    const container = document.getElementById('achievements');
    container.innerHTML = achievements.map(achievement => `
        <div class="achievement-badge ${achievement.unlocked ? '' : 'locked'}">
            <div class="badge-icon">${achievement.icon}</div>
            <div class="badge-name">${achievement.name}</div>
            <div class="badge-desc">${achievement.desc}</div>
        </div>
    `).join('');
}

// Helper function to generate mock data
function generateMockData(count, min, max) {
    return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadPerformanceData);
