const API_BASE = window.location.origin;
const announcementsKey = 'announcements';
const updatesKey = 'mindwave_updates';
const gamesKey = 'mindwave_games';

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
        console.error('Failed to parse', key, error);
        return [];
    }
}

async function renderAnnouncements() {
    const container = document.getElementById('announcementFeed');
    try {
        const res = await fetch(`${API_BASE}/api/announcements`);
        const data = await res.json();

        const announcements = data.ok ? (data.announcements || []) : [];

        if (announcements.length === 0) {
            container.innerHTML = '<div class="empty-state">No announcements yet. Check back soon! 📨</div>';
            return;
        }

        container.innerHTML = announcements.map(item => {
            // Safety check: ensure content is not a full HTML page
            const body = item.body || item.text || '';
            if (body.includes('<html') || body.includes('<!DOCTYPE')) {
                return ''; // Skip corrupted items
            }
            return `
            <article class="feed-item">
                <h3>${item.title || 'Untitled Announcement'}</h3>
                <small>${item.audience || 'All Students'} • ${new Date(item.createdAt || Date.now()).toLocaleDateString()}</small>
                <p>${body}</p>
                <span class="tag green">Live</span>
            </article>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to fetch announcements:', error);
        container.innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
    }
}

function renderUpdates() {
    const container = document.getElementById('updateFeed');
    // Updates are still local for now, but we must validate them
    const updates = loadData(updatesKey).slice(-4).reverse();

    if (updates.length === 0) {
        container.innerHTML = '<div class="empty-state">Progress updates will appear here when your mentors post them. 📘</div>';
        return;
    }

    container.innerHTML = updates.map(item => {
        // Safety check: ensure content is not a full HTML page
        const summary = item.summary || '';
        if (summary.includes('<html') || summary.includes('<!DOCTYPE')) {
            return ''; // Skip corrupted items
        }
        return `
        <article class="feed-item">
            <h3>${item.headline || 'Weekly Update'}</h3>
            <small>${item.date || ''}</small>
            <p>${summary}</p>
            <span class="tag blue">Update</span>
        </article>
    `;
    }).join('');
}

async function renderGames() {
    const container = document.getElementById('gameFeed');
    try {
        const res = await fetch(`${API_BASE}/api/games/published`);
        const data = await res.json();
        const games = data.ok ? (data.games || []).slice(0, 6) : [];

        if (games.length === 0) {
            container.innerHTML = '<div class="empty-state">Faculty games drop in this space. Nothing has gone live yet. 🎮</div>';
            return;
        }

        container.innerHTML = games.map((item, index) => `
            <article class="game-card" data-game-id="${item._id || item.id}" data-game-title="${item.title || 'Untitled Challenge'}" data-game-type="${item.type || ''}">
                <h3>${item.title || 'Untitled Challenge'}</h3>
                <p>${item.type || ''} • ${item.difficulty || ''}</p>
                <p style="margin-top: 12px;">${item.brief || ''}</p>
                <span class="tag pink play-btn" style="margin-top: 12px; cursor: pointer;">Play</span>
            </article>
        `).join('');

        // Add event delegation for play buttons
        container.querySelectorAll('.game-card').forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            playBtn.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                const gameTitle = card.dataset.gameTitle;
                const gameType = card.dataset.gameType;
                startGame(gameId, gameTitle, gameType);
            });
        });
    } catch (error) {
        console.error('Failed to fetch games:', error);
        container.innerHTML = '<div class="empty-state">Failed to load games. Please refresh the page.</div>';
    }
}

// Activity tracking system
const activityKey = 'student_activities';

function getStudentEmail() {
    return localStorage.getItem('email') || 'guest@cmrit.ac.in';
}

function getStudentName() {
    return localStorage.getItem('firstName') || 'Guest';
}

function startGame(gameId, gameTitle, gameType) {
    // Navigate to student-game.html with the game ID as a query parameter
    window.location.href = `student-game.html?play=${gameId}`;
}

function completeGame(activityId, score, timeTaken) {
    const activities = loadData(activityKey);
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex !== -1) {
        activities[activityIndex].status = 'completed';
        activities[activityIndex].score = score;
        activities[activityIndex].completedAt = new Date().toISOString();
        activities[activityIndex].timeTaken = Math.floor(timeTaken / 1000); // in seconds
        localStorage.setItem(activityKey, JSON.stringify(activities));
    }
}

// Profile dropdown logic
const profileToggle = document.getElementById('profileToggle');
const profileDropdown = document.getElementById('profileDropdown');
const signOutBtn = document.getElementById('signOutBtn');

// Update profile toggle with user's name
const firstName = localStorage.getItem('firstName') || 'User';
const smallElement = profileToggle.querySelector('small');
if (smallElement) {
    smallElement.textContent = firstName;
}

if (profileToggle && profileDropdown) {
    profileToggle.addEventListener('click', () => {
        const isOpen = profileDropdown.style.display === 'flex';
        profileDropdown.style.display = isOpen ? 'none' : 'flex';
    });
    document.addEventListener('click', (event) => {
        if (!profileToggle.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.style.display = 'none';
        }
    });
}

function performLogout() {
    // Show custom logout confirmation modal instead of browser confirm()
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('active');
}

function clearAuthAndCache() {
    ['token', 'mindwave_token', 'firstName', 'lastName', 'email', 'role', 'name'].forEach(k => localStorage.removeItem(k));
}

function doLogout() {
    clearAuthAndCache();
    window.location.replace('marketing-site/student-login.html');
}

if (signOutBtn) {
    signOutBtn.addEventListener('click', performLogout);
}

function getReadAnnouncements() {
    try {
        return JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    } catch (error) {
        return [];
    }
}

function markAsRead(announcementId) {
    const read = getReadAnnouncements();
    if (!read.includes(announcementId)) {
        read.push(announcementId);
        localStorage.setItem('readAnnouncements', JSON.stringify(read));
    }
}

function getUnreadCount() {
    const announcements = loadData(announcementsKey);
    const read = getReadAnnouncements();
    return announcements.filter(ann => !read.includes(ann.id || ann.date + ann.title)).length;
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = getUnreadCount();

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

async function fetchNotifications() {
    try {
        const res = await fetch(`${API_BASE}/api/notifications`);
        const data = await res.json();
        if (data.ok) {
            const notifications = data.notifications;
            const unreadCount = notifications.filter(n => !n.read).length;

            const badge = document.getElementById('notificationBadge');
            if (badge) {
                if (unreadCount > 0) {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown) {
                if (notifications.length === 0) {
                    dropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No new notifications</div>';
                } else {
                    dropdown.innerHTML = notifications.map(n => `
                        <div class="notification-item ${n.read ? '' : 'unread'}" data-link="${n.link || ''}" style="cursor: pointer;">
                            <h4>${n.title}</h4>
                            <p>${n.message}</p>
                            <small>${new Date(n.createdAt).toLocaleTimeString()}</small>
                        </div>
                    `).join('') + `
                        <div style="padding: 12px; border-top: 0px solid rgba(255, 255, 255, 0.1); text-align: center;">
                            <a href="student-notifications.html" style="color: var(--cyan-bright); text-decoration: none; font-size: 13px; font-weight: 600;">View All Notifications →</a>
                        </div>
                    `;

                    // Add click handlers to navigate to linked content
                    dropdown.querySelectorAll('.notification-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const link = item.dataset.link;
                            if (link) {
                                window.location.href = link;
                            }
                        });
                    });
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch notifications", e);
    }
}

// Poll for notifications every 30 seconds (only if notification elements exist)
if (document.getElementById('notificationBadge') || document.getElementById('notificationDropdown')) {
    fetchNotifications();
    setInterval(fetchNotifications, 30000);
}

// Bell click handler
const notificationBell = document.getElementById('notificationBtn'); // Changed from 'notificationBell' to 'notificationBtn'
const notificationDropdown = document.getElementById('notificationDropdown');

if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notificationDropdown.classList.contains('show');
        if (isOpen) {
            notificationDropdown.classList.remove('show');
        } else {
            notificationDropdown.classList.add('show');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // Handle announcement item clicks
    notificationDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.notification-item');
        if (item) {
            const annId = item.dataset.announcementId;
            markAsRead(annId);
            updateNotificationBadge();
            window.location.href = `announcements.html?id=${encodeURIComponent(annId)}`;
        }
    });
}

// Update notification badge on page load
updateNotificationBadge();

// Update notification badge periodically (every 2 seconds) to catch new announcements
setInterval(() => {
    updateNotificationBadge();
}, 2000);

// Event listeners for navigation buttons (CSP-compliant)
document.addEventListener('DOMContentLoaded', () => {
    // Notification button handler is now in lines 266-296 (notificationBell click handler)
    // Removed old alert handler to allow proper notification dropdown functionality

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            window.location.href = 'student-settings.html';
        });
    }

    // All buttons with data-href attribute
    document.querySelectorAll('[data-href]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute('data-href');
            if (href) {
                console.log('Navigating to:', href);
                window.location.href = href;
            }
        });
    });
});

// Also add the handler outside DOMContentLoaded as a fallback
function initDataHrefButtons() {
    document.querySelectorAll('[data-href]').forEach(button => {
        button.style.cursor = 'pointer'; // Ensure cursor shows it's clickable
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const href = e.currentTarget.getAttribute('data-href');
            if (href) {
                console.log('Navigating to:', href);
                window.location.href = href;
            }
        });
    });
}

// Call it immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDataHrefButtons);
} else {
    initDataHrefButtons();
}

// ── XP LEVEL RING (real-time) ──────────────────────────────────────────
function renderXPLevel(totalXP) {
    const XP_PER_LEVEL = 400;
    const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    const xpIntoLevel = totalXP % XP_PER_LEVEL;
    const xpToNext = XP_PER_LEVEL - xpIntoLevel;
    const pct = xpIntoLevel / XP_PER_LEVEL; // 0–1
    const CIRCUMFERENCE = 314; // 2π × r(50)
    const offset = CIRCUMFERENCE * (1 - pct);

    const ringArc = document.getElementById('xpRingArc');
    const levelNum = document.getElementById('xpLevelNum');
    const xpCurrent = document.getElementById('xpCurrent');
    const xpNext = document.getElementById('xpNext');
    const xpFill = document.getElementById('xpFill');
    const xpToNextEl = document.getElementById('xpToNext');

    if (ringArc) {
        ringArc.style.transition = 'stroke-dashoffset 0.8s ease';
        ringArc.setAttribute('stroke-dashoffset', offset.toFixed(1));
    }
    if (levelNum) levelNum.textContent = level;
    if (xpCurrent) xpCurrent.textContent = totalXP.toLocaleString() + ' XP';
    if (xpNext) xpNext.textContent = (level * XP_PER_LEVEL).toLocaleString() + ' XP';
    if (xpFill) {
        xpFill.style.transition = 'width 0.8s ease';
        xpFill.style.width = (pct * 100).toFixed(1) + '%';
    }
    if (xpToNextEl) {
        xpToNextEl.textContent = xpToNext > 0
            ? `${xpToNext} XP to Level ${level + 1}`
            : `🎉 Level ${level} complete!`;
    }
}

async function fetchDashboardSparklines() {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };

    const xpEl = document.getElementById('totalXP');
    const gamesEl = document.getElementById('gamesPlayed');
    const rankEl = document.getElementById('studentRank');
    const courseEl = document.getElementById('courseCount');

    // ── Helper: render a spark chart from real daily data ──────────────
    function renderSpark(card, dayData, colorVar, unit) {
        if (!card || !dayData || !dayData.length) return;
        const bars = card.querySelectorAll('.mw-spark-bar');
        const max = Math.max(...dayData.map(d => d.value), 1);
        bars.forEach((bar, i) => {
            const day = dayData[i];
            if (!day) return;
            const pct = max > 0 ? Math.max(4, Math.round((day.value / max) * 100)) : 4;
            bar.style.height = pct + '%';
            bar.setAttribute('data-label', day.label);
            bar.setAttribute('data-value', day.value > 0
                ? `${day.value.toLocaleString()} ${unit}`
                : `No ${unit.toLowerCase()} ${day.label === 'Today' ? 'today' : 'this day'}`);
        });
    }

    // ── Helper: update the change badge ────────────────────────────────
    function setChange(card, change, noDataMsg) {
        if (!card) return;
        const badge = card.querySelector('.mw-kpi-change');
        if (!badge) return;
        if (change === null || change === undefined) {
            badge.innerHTML = noDataMsg;
            badge.className = 'mw-kpi-change';
            return;
        }
        const abs = Math.abs(change);
        if (change > 0) {
            badge.innerHTML = `▲ ${abs}% <span class="mw-kpi-sub">vs last week</span>`;
            badge.className = 'mw-kpi-change up';
        } else if (change < 0) {
            badge.innerHTML = `▼ ${abs}% <span class="mw-kpi-sub">vs last week</span>`;
            badge.className = 'mw-kpi-change down';
        } else {
            badge.innerHTML = `― Same as last week`;
            badge.className = 'mw-kpi-change';
        }
    }

    // ── 1. Sparklines (7-day daily XP + games) ─────────────────────────
    try {
        const res = await fetch(`${API_BASE}/api/dashboard/sparklines`, { headers });
        const data = await res.json();

        if (data.ok) {
            const xpCard = xpEl?.closest('.mw-kpi-card');
            const gamesCard = gamesEl?.closest('.mw-kpi-card');

            // XP spark
            renderSpark(xpCard, data.xp?.days, 'var(--accent)', 'XP');
            const xpChange = (data.xp?.lastWeek > 0 || data.xp?.thisWeek > 0) ? data.xp?.change : null;
            setChange(xpCard, xpChange, 'Play games to earn XP');

            // Games spark
            renderSpark(gamesCard, data.games?.days, 'var(--orange)', 'games');
            const gamesChange = (data.games?.lastWeek > 0 || data.games?.thisWeek > 0) ? data.games?.change : null;
            setChange(gamesCard, gamesChange, '▲ Play your first game!');
        }
    } catch (err) {
        console.error('Sparklines fetch failed:', err);
    }

    // ── 2. Leaderboard → XP total, games total, rank ───────────────────
    try {
        const res = await fetch(`${API_BASE}/api/leaderboard`, { headers });
        const data = await res.json();

        if (data.ok && data.currentUser) {
            const u = data.currentUser;

            if (xpEl && u.totalPoints != null) xpEl.textContent = Number(u.totalPoints).toLocaleString();
            if (gamesEl && u.gamesPlayed != null) gamesEl.textContent = u.gamesPlayed;

            // Update XP Level ring
            if (u.totalPoints != null) renderXPLevel(Number(u.totalPoints));

            // Rank: show — when student has no games yet (rank 0)
            if (rankEl) {
                const rankCard = rankEl.closest('.mw-kpi-card');
                const rankBadge = rankCard?.querySelector('.mw-kpi-change');
                if (u.rank && u.rank > 0) {
                    rankEl.textContent = `#${u.rank}`;
                    if (rankBadge) {
                        rankBadge.innerHTML = '▲ Climbing!';
                        rankBadge.className = 'mw-kpi-change up';
                    }
                } else {
                    rankEl.textContent = '—';
                    if (rankBadge) {
                        rankBadge.innerHTML = 'Play games to get ranked';
                        rankBadge.className = 'mw-kpi-change';
                    }
                    // Flatten rank spark bars to equal low heights (no fake data)
                    rankCard?.querySelectorAll('.mw-spark-bar').forEach((bar, i) => {
                        bar.style.height = '8%';
                        bar.setAttribute('data-value', 'Not ranked yet');
                    });
                }
            }
        }
    } catch (err) {
        console.error('Leaderboard fetch failed:', err);
    }

    // ── 3. Courses ──────────────────────────────────────────────────────
    try {
        const res = await fetch(`${API_BASE}/api/classroom/courses`, { headers });
        const data = await res.json();
        const count = data.ok && data.courses ? data.courses.length : null;

        if (courseEl && count != null) {
            courseEl.textContent = count;
            const courseCard = courseEl.closest('.mw-kpi-card');
            // Set all course bars to equal height (courses don't change daily)
            courseCard?.querySelectorAll('.mw-spark-bar').forEach(bar => {
                bar.style.height = count > 0 ? '80%' : '8%';
                bar.setAttribute('data-value', count > 0
                    ? `${count} course${count !== 1 ? 's' : ''} enrolled`
                    : 'No courses yet');
            });
            const badge = courseCard?.querySelector('.mw-kpi-change');
            if (badge) {
                badge.innerHTML = count > 0 ? '▲ Active this semester' : 'Enroll in a course';
                badge.className = count > 0 ? 'mw-kpi-change up' : 'mw-kpi-change';
            }
        }
    } catch (err) {
        console.error('Courses fetch failed:', err);
    }
}


renderAnnouncements();
renderUpdates();
renderGames();
fetchDashboardSparklines();
