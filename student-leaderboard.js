const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
let currentTimeFilter = 'all';
let currentGameFilter = 'all';

async function fetchLeaderboard() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return { leaderboard: [], currentUser: null };
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (currentTimeFilter && currentTimeFilter !== 'all') {
            params.append('timeFilter', currentTimeFilter);
        }
        if (currentGameFilter && currentGameFilter !== 'all') {
            params.append('gameType', currentGameFilter);
        }

        const response = await fetch(`${window.location.origin}/api/leaderboard?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        return {
            leaderboard: data.leaderboard || [],
            currentUser: data.currentUser || null
        };
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return { leaderboard: [], currentUser: null };
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAccuracyClass(accuracy) {
    if (accuracy >= 80) return 'high';
    if (accuracy >= 60) return 'medium';
    return 'low';
}

function renderPodium(leaderboard) {
    const podium = document.getElementById('podium');
    const top3 = leaderboard.slice(0, 3);

    if (top3.length === 0) {
        podium.innerHTML = '';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];

    podium.innerHTML = top3.map((player, idx) => `
        <div class="podium-card ${classes[idx]}">
            <span class="medal">${medals[idx]}</span>
            <div class="podium-rank">#${idx + 1}</div>
            <div class="podium-name">${player.name}</div>
            <div class="podium-points">${player.totalPoints.toLocaleString()}</div>
            <div class="podium-stats">
                <div>
                    <div style="font-weight: 600;">${player.gamesPlayed}</div>
                    <div>Games</div>
                </div>
                <div>
                    <div style="font-weight: 600;" class="accuracy ${getAccuracyClass(player.avgAccuracy)}">${player.avgAccuracy}%</div>
                    <div>Accuracy</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderLeaderboard(leaderboard) {
    const body = document.getElementById('leaderboardBody');

    if (leaderboard.length === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <h3>No data yet</h3>
                <p>Complete some games to see the leaderboard!</p>
            </div>
        `;
        return;
    }

    const maxPoints = leaderboard[0]?.totalPoints || 1;

    body.innerHTML = leaderboard.map((player, idx) => {
        const rank = idx + 1;
        const isCurrentUser = player.email === currentUserEmail;
        const progressPercent = (player.totalPoints / maxPoints) * 100;

        return `
            <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank-cell">
                    <div class="rank-badge ${rank <= 3 ? 'top' : ''}">${rank}</div>
                </div>
                <div class="player-info">
                    <div class="player-avatar">${getInitials(player.name)}</div>
                    <div class="player-name">${player.name}${isCurrentUser ? ' (You)' : ''}</div>
                </div>
                <div>
                    <div class="points-cell">${player.totalPoints.toLocaleString()}</div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="games-count">${player.gamesPlayed}</div>
                <div class="accuracy ${getAccuracyClass(player.avgAccuracy)}">${player.avgAccuracy}%</div>
            </div>
        `;
    }).join('');
}

function updatePersonalStats(currentUser) {
    if (currentUser && currentUser.rank > 0) {
        document.getElementById('yourRank').textContent = `#${currentUser.rank}`;
        document.getElementById('yourPoints').textContent = currentUser.totalPoints.toLocaleString();
        document.getElementById('yourGames').textContent = currentUser.gamesPlayed;
        document.getElementById('yourAccuracy').textContent = `${currentUser.avgAccuracy}%`;
    } else {
        document.getElementById('yourRank').textContent = '-';
        document.getElementById('yourPoints').textContent = '0';
        document.getElementById('yourGames').textContent = '0';
        document.getElementById('yourAccuracy').textContent = '0%';
    }
}

async function render() {
    const { leaderboard, currentUser } = await fetchLeaderboard();
    renderPodium(leaderboard);
    renderLeaderboard(leaderboard);
    updatePersonalStats(currentUser);
}

document.addEventListener('DOMContentLoaded', () => {
    // Filter event listeners
    document.querySelectorAll('[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeFilter = btn.dataset.time;
            render();
        });
    });

    document.querySelectorAll('[data-game]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-game]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGameFilter = btn.dataset.game;
            render();
        });
    });

    // Initial render
    render();
});
