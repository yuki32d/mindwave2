// student-leaderboard.js — synced with student-leaderboard.html
// Fixes: wrong element IDs, missing podium/table rendering, search filter

let currentTimeFilter = 'all';
let currentGameFilter = 'all';
let cachedLeaderboard = [];
let cachedCurrentUser = null;

// ── AVATAR COLOURS ──────────────────────────────────────────────
const AVATAR_COLOURS = [
    '#6366f1', '#a855f7', '#ec4899', '#14b8a6',
    '#f59e0b', '#22c55e', '#3b82f6', '#ef4444'
];
function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return AVATAR_COLOURS[Math.abs(h) % AVATAR_COLOURS.length];
}
function getInitials(name) {
    const parts = (name || 'AN').trim().split(' ').filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.substring(0, 2)).toUpperCase();
}

// ── FETCH ────────────────────────────────────────────────────────
async function fetchLeaderboard() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return { leaderboard: [], currentUser: null };

        const params = new URLSearchParams();
        if (currentTimeFilter && currentTimeFilter !== 'all') params.append('timeFilter', currentTimeFilter);
        if (currentGameFilter && currentGameFilter !== 'all') params.append('gameType', currentGameFilter);

        const res = await fetch(`/api/leaderboard?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return { leaderboard: data.leaderboard || [], currentUser: data.currentUser || null };
    } catch (err) {
        console.error('Leaderboard fetch error:', err);
        return { leaderboard: [], currentUser: null };
    }
}

// ── PODIUM (top 3) ───────────────────────────────────────────────
function renderPodium(leaderboard, currentUser) {
    const el = document.getElementById('lbPodium');
    if (!el) return;

    const top3 = leaderboard.slice(0, 3);
    if (top3.length === 0) { el.innerHTML = ''; return; }

    // Order: 2nd | 1st | 3rd  (visual podium layout)
    const orders = [2, 1, 3];
    const stepH  = [48, 70, 36];
    const ptsCls  = ['rank-1', 'rank-2', 'rank-3'];

    el.innerHTML = `<div class="lb-podium-wrap">
        ${top3.map((p, i) => {
            const isYou = currentUser && p.studentId && p.studentId.toString() === currentUser.studentId;
            const initials = getInitials(p.name);
            const colour = avatarColor(p.name);
            const rank = i + 1;
            return `
            <div class="lb-podium-lane ${ptsCls[i]}">
                <div class="lb-podium-card">
                    ${rank === 1 ? '<div class="lb-crown">👑</div>' : ''}
                    <div class="lb-podium-avatar" style="background:${colour}">${initials}</div>
                    <div class="lb-podium-name">${p.name}</div>
                    ${isYou ? '<div class="lb-podium-you">You</div>' : ''}
                    <div class="lb-podium-pts">${(p.totalPoints || 0).toLocaleString()}</div>
                    <div class="lb-podium-meta">
                        <div class="lb-podium-meta-item">
                            <div class="lb-podium-meta-val">${p.gamesPlayed || 0}</div>
                            <div class="lb-podium-meta-lbl">Games</div>
                        </div>
                        <div class="lb-podium-meta-item">
                            <div class="lb-podium-meta-val">${p.avgAccuracy || 0}%</div>
                            <div class="lb-podium-meta-lbl">Accuracy</div>
                        </div>
                    </div>
                </div>
                <div class="lb-podium-step">#${rank}</div>
            </div>`;
        }).join('')}
    </div>`;
}

// ── TABLE (rank 4+) ──────────────────────────────────────────────
function renderTable(leaderboard, currentUser, searchText) {
    const el = document.getElementById('lbTableBody');
    if (!el) return;

    let rows = leaderboard;

    // Apply client-side search filter
    if (searchText) {
        const q = searchText.toLowerCase();
        rows = rows.filter(p => (p.name || '').toLowerCase().includes(q));
    }

    if (rows.length === 0) {
        el.innerHTML = `<div class="lb-empty">
            <div style="font-size:2.5rem;margin-bottom:12px">🏆</div>
            <h3>No players yet</h3>
            <p>Be the first to complete a game!</p>
        </div>`;
        return;
    }

    const maxPts = rows[0]?.totalPoints || 1;

    el.innerHTML = rows.map((p, i) => {
        const rank = i + 1;
        const isYou = currentUser && p.studentId && p.studentId.toString() === currentUser.studentId;
        const initials = getInitials(p.name);
        const colour = avatarColor(p.name);
        const pct = Math.round((p.totalPoints / maxPts) * 100);
        const badgeCls = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const accCls = p.avgAccuracy >= 80 ? 'lb-acc-hi' : p.avgAccuracy >= 50 ? 'lb-acc-mid' : 'lb-acc-lo';

        return `<div class="lb-row${isYou ? ' is-me' : ''}">
            <div class="lb-row-rank">
                <div class="lb-rank-badge ${badgeCls}">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</div>
            </div>
            <div class="lb-row-player">
                <div class="lb-row-avatar" style="background:${colour}">${initials}</div>
                <div>
                    <div class="lb-row-name">${p.name}${isYou ? '<span class="lb-row-you">You</span>' : ''}</div>
                </div>
            </div>
            <div class="lb-row-pts">
                ${(p.totalPoints || 0).toLocaleString()}
                <div class="lb-pts-bar-wrap"><div class="lb-pts-bar" style="width:${pct}%"></div></div>
            </div>
            <div class="lb-row-games">${p.gamesPlayed || 0}</div>
            <div class="lb-row-acc ${accCls}">${p.avgAccuracy || 0}%</div>
        </div>`;
    }).join('');
}

// ── MY STATS BANNER ──────────────────────────────────────────────
function renderMyStats(currentUser) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    if (currentUser && currentUser.rank > 0) {
        set('myRank',     `#${currentUser.rank}`);
        set('myPoints',   (currentUser.totalPoints || 0).toLocaleString());
        set('myGames',    currentUser.gamesPlayed || 0);
        set('myAccuracy', `${currentUser.avgAccuracy || 0}%`);
    } else {
        set('myRank', '—'); set('myPoints', '0'); set('myGames', '0'); set('myAccuracy', '0%');
    }
}

// ── RENDER ALL ───────────────────────────────────────────────────
async function render(searchText) {
    // Show loading state in table
    const tableEl = document.getElementById('lbTableBody');
    if (tableEl) {
        tableEl.innerHTML = `<div class="lb-empty" style="padding:40px;">
            <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.08);border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
            <p style="color:var(--muted)">Loading rankings…</p>
        </div>`;
    }

    const { leaderboard, currentUser } = await fetchLeaderboard();
    cachedLeaderboard = leaderboard;
    cachedCurrentUser = currentUser;

    renderPodium(leaderboard, currentUser);
    renderTable(leaderboard, currentUser, searchText);
    renderMyStats(currentUser);
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Time filter buttons
    document.querySelectorAll('[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeFilter = btn.dataset.time;
            render();
        });
    });

    // Game type filter buttons
    document.querySelectorAll('[data-game]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-game]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGameFilter = btn.dataset.game;
            render();
        });
    });

    // Live search (client-side filter on cached data)
    const searchEl = document.getElementById('lbSearch');
    if (searchEl) {
        searchEl.addEventListener('input', () => {
            renderTable(cachedLeaderboard, cachedCurrentUser, searchEl.value.trim());
        });
    }

    // Initial render
    render();
});
