// Student Profile JavaScript - Real-time API Integration
// This file contains all the logic for the student profile page

const API_BASE = window.location.origin;
const activityKey = 'student_activities';
let currentUser = null;

// Fetch current user data from API
async function fetchCurrentUser() {
    try {
        const response = await fetch(`${API_BASE}/api/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        const data = await response.json();

        if (data.ok && data.user) {
            currentUser = data.user;
            return data.user;
        }
    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }

    // Fallback to localStorage
    return {
        name: localStorage.getItem('firstName') || 'Student',
        email: localStorage.getItem('email') || 'student@example.com',
        profilePhoto: localStorage.getItem('profilePhoto') || null
    };
}

// Upload profile photo
async function uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append('profilePhoto', file);
    // Add email from localStorage for authentication
    const email = localStorage.getItem('email');
    if (email) {
        formData.append('email', email);
    }

    try {
        const response = await fetch(`${API_BASE}/api/upload-profile-photo`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.ok && data.photoUrl) {
            // Update UI
            updateProfilePhoto(data.photoUrl);
            // Save to localStorage as backup
            localStorage.setItem('profilePhoto', data.photoUrl);
            return data.photoUrl;
        } else {
            console.error('Server error:', data.message || 'Unknown error');
            alert('Failed to upload photo: ' + (data.message || 'Unknown error'));
            return null;
        }
    } catch (error) {
        console.error('Failed to upload photo:', error);
        alert('Network error: ' + error.message);
    }
    return null;
}

// Update profile photo in UI
function updateProfilePhoto(photoUrl) {
    const avatar = document.getElementById('profileAvatar');
    if (avatar && photoUrl) {
        avatar.style.backgroundImage = `url(${photoUrl})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.textContent = ''; // Remove initials
    }
}

function getInitials(name) {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Fetch real-time stats from API
async function fetchRealTimeStats() {
    try {
        const [leaderboardRes, gamesRes] = await Promise.all([
            fetch(`${API_BASE}/api/leaderboard`),
            fetch(`${API_BASE}/api/game-results/my-results`)
        ]);

        const leaderboardData = await leaderboardRes.json();
        const gamesData = await gamesRes.json();

        const stats = {
            totalPoints: 0,
            gamesCompleted: 0,
            avgAccuracy: 0,
            totalTime: 0,
            streak: 0,
            rank: '-'
        };

        // Calculate from API data
        if (gamesData.ok && gamesData.results) {
            const results = gamesData.results;
            stats.gamesCompleted = results.length;
            stats.totalPoints = results.reduce((sum, r) => sum + (r.rawScore || 0), 0);
            stats.avgAccuracy = results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length)
                : 0;
            stats.totalTime = results.reduce((sum, r) => sum + (r.timeTaken || 0), 0);

            // Calculate streak
            const dates = results
                .map(r => new Date(r.completedAt).toDateString())
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort();

            let streak = 0;
            const today = new Date().toDateString();
            if (dates.includes(today) || (dates.length > 0 && dates[dates.length - 1] === new Date(Date.now() - 86400000).toDateString())) {
                streak = 1;
                for (let i = dates.length - 2; i >= 0; i--) {
                    const diff = (new Date(dates[i + 1]) - new Date(dates[i])) / 86400000;
                    if (diff === 1) streak++;
                    else break;
                }
            }
            stats.streak = streak;
        }

        // Get rank from leaderboard
        if (leaderboardData.ok && leaderboardData.leaderboard && currentUser) {
            const rank = leaderboardData.leaderboard.findIndex(p => p.email === currentUser.email) + 1;
            stats.rank = rank > 0 ? rank : '-';
        }

        return stats;
    } catch (error) {
        console.error('Failed to fetch real-time stats:', error);
        return calculateStatsFromLocal();
    }
}

// Fallback to local storage
function calculateStatsFromLocal() {
    const activities = loadActivities().filter(a => currentUser && a.studentEmail === currentUser.email && a.status === 'completed');

    const totalPoints = activities.reduce((sum, a) => sum + (a.rawScore || 0), 0);
    const gamesCompleted = activities.length;
    const avgAccuracy = gamesCompleted > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.score || 0), 0) / gamesCompleted)
        : 0;
    const totalTime = activities.reduce((sum, a) => sum + (a.timeTaken || 0), 0);

    // Calculate streak
    const dates = activities.map(a => new Date(a.completedAt).toDateString()).filter((v, i, a) => a.indexOf(v) === i).sort();
    let streak = 0;
    const today = new Date().toDateString();
    if (dates.includes(today) || (dates.length > 0 && dates[dates.length - 1] === new Date(Date.now() - 86400000).toDateString())) {
        streak = 1;
        for (let i = dates.length - 2; i >= 0; i--) {
            const diff = (new Date(dates[i + 1]) - new Date(dates[i])) / 86400000;
            if (diff === 1) streak++;
            else break;
        }
    }

    return { totalPoints, gamesCompleted, avgAccuracy, totalTime, streak, rank: '-' };
}

function loadActivities() {
    try {
        return JSON.parse(localStorage.getItem(activityKey) || '[]');
    } catch {
        return [];
    }
}

async function calculateSkills() {
    try {
        const response = await fetch(`${API_BASE}/api/game-results/my-results`);
        const data = await response.json();

        if (data.ok && data.results) {
            const skills = {};
            const gameTypeMap = {
                'quiz': 'Quiz',
                'unjumble': 'Logic Unjumble',
                'code-unjumble': 'Logic Unjumble',
                'sorter': 'Tech Sorter',
                'tech-sorter': 'Tech Sorter',
                'fillin': 'Syntax Fill-in',
                'syntax-fill': 'Syntax Fill-in',
                'sql': 'SQL Builder',
                'sql-builder': 'SQL Builder'
            };

            data.results.forEach(r => {
                const type = gameTypeMap[r.gameType] || r.gameType || r.type || 'General';
                if (!skills[type]) {
                    skills[type] = { count: 0, totalScore: 0 };
                }
                skills[type].count++;
                skills[type].totalScore += r.score || 0;
            });

            return Object.entries(skills).map(([name, data]) => ({
                name,
                avgScore: Math.round(data.totalScore / data.count),
                count: data.count
            }));
        }
    } catch (error) {
        console.error('Failed to fetch skills:', error);
    }

    return [];
}

async function checkAchievements() {
    try {
        const response = await fetch(`${API_BASE}/api/game-results/my-results`);
        const data = await response.json();

        if (data.ok && data.results) {
            const activities = data.results;
            const stats = await fetchRealTimeStats();

            const achievements = [
                {
                    id: 'perfect_score',
                    name: 'Perfect Score',
                    desc: 'Score 100% on any game',
                    icon: '💯',
                    unlocked: activities.some(a => a.score === 100)
                },
                {
                    id: 'speed_demon',
                    name: 'Speed Demon',
                    desc: 'Complete a game in under 2 minutes',
                    icon: '⚡',
                    unlocked: activities.some(a => (a.timeTaken || 0) < 120)
                },
                {
                    id: 'consistent_learner',
                    name: 'Consistent Learner',
                    desc: 'Maintain a 7-day streak',
                    icon: '🔥',
                    unlocked: stats.streak >= 7
                },
                {
                    id: 'quiz_master',
                    name: 'Quiz Master',
                    desc: 'Complete 10 quizzes',
                    icon: '📚',
                    unlocked: activities.filter(a => a.gameType === 'quiz').length >= 10
                },
                {
                    id: 'sql_wizard',
                    name: 'SQL Wizard',
                    desc: 'Perfect score on SQL game',
                    icon: '🧙',
                    unlocked: activities.some(a => (a.gameType === 'sql' || a.gameType === 'sql-builder') && a.score === 100)
                },
                {
                    id: 'first_game',
                    name: 'First Steps',
                    desc: 'Complete your first game',
                    icon: '🎯',
                    unlocked: activities.length > 0
                }
            ];

            return achievements;
        }
    } catch (error) {
        console.error('Failed to fetch achievements:', error);
    }

    return [];
}

async function renderOverview() {
    const stats = await fetchRealTimeStats();

    document.getElementById('totalPoints').textContent = stats.totalPoints.toLocaleString();
    document.getElementById('currentRank').textContent = stats.rank !== '-' ? `#${stats.rank}` : '-';
    document.getElementById('gamesCompleted').textContent = stats.gamesCompleted;
    document.getElementById('avgAccuracy').textContent = `${stats.avgAccuracy}%`;
    document.getElementById('totalTime').textContent = `${Math.floor(stats.totalTime / 60)}m`;
    document.getElementById('currentStreak').textContent = stats.streak;

    // Skills
    const skills = await calculateSkills();
    const skillsGrid = document.getElementById('skillsGrid');

    if (skills.length === 0) {
        skillsGrid.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 32px;">No skills data yet. Start playing games!</p>';
        return;
    }

    skillsGrid.innerHTML = skills.map(skill => `
        <div class="skill-item">
            <div class="skill-header">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-score">${skill.avgScore}%</div>
            </div>
            <div class="skill-bar">
                <div class="skill-fill" style="width: ${skill.avgScore}%"></div>
            </div>
            <p style="margin: 8px 0 0; font-size: 12px; color: #9ea4b6;">${skill.count} games played</p>
        </div>
    `).join('');
}

async function renderActivity() {
    try {
        const response = await fetch(`${API_BASE}/api/game-results/my-results`);
        const data = await response.json();

        if (data.ok && data.results) {
            const activities = data.results
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .slice(0, 10);

            const activityList = document.getElementById('activityList');

            if (activities.length === 0) {
                activityList.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 32px;">No activity yet. Start playing games!</p>';
                return;
            }

            // Fetch game details for each activity
            const activitiesWithTitles = await Promise.all(activities.map(async (a) => {
                let gameTitle = a.gameTitle || a.title || a.gameName;

                // If no title, try to fetch from games API
                if (!gameTitle && a.gameId) {
                    try {
                        const gameResponse = await fetch(`${API_BASE}/api/games/${a.gameId}`);
                        const gameData = await gameResponse.json();
                        if (gameData.ok && gameData.game) {
                            gameTitle = gameData.game.title || gameData.game.question || gameData.game.name;
                        }
                    } catch (err) {
                        console.error('Failed to fetch game details:', err);
                    }
                }

                return { ...a, gameTitle: gameTitle || 'Game' };
            }));

            activityList.innerHTML = activitiesWithTitles.map(a => {
                const date = new Date(a.completedAt || a.createdAt || Date.now());
                const timeAgo = getTimeAgo(date);

                // Get game type with fallback
                const gameType = a.gameType || a.type || 'Game';

                // Get score with fallback
                const score = a.score !== undefined ? Math.round(a.score) : 0;

                // Get time taken with fallback
                const timeTaken = a.timeTaken || 0;
                const minutes = Math.floor(timeTaken / 60);
                const seconds = timeTaken % 60;

                return `
                    <div class="activity-item">
                        <div class="activity-icon">🎮</div>
                        <div class="activity-info">
                            <h4>${a.gameTitle}</h4>
                            <p>${gameType} • ${timeAgo}</p>
                        </div>
                        <div class="activity-score">${score}%</div>
                        <div class="activity-time">${minutes}m ${seconds}s</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to fetch activity:', error);
    }
}

async function renderAchievements() {
    const achievements = await checkAchievements();
    const achievementsGrid = document.getElementById('achievementsGrid');

    achievementsGrid.innerHTML = achievements.map(ach => `
        <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${ach.icon}</span>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
            ${ach.unlocked ? '<p style="margin-top: 8px; color: #34c759; font-size: 12px;">✓ Unlocked</p>' : '<p style="margin-top: 8px; color: #9ea4b6; font-size: 12px;">🔒 Locked</p>'}
        </div>
    `).join('');
}

function renderSettings() {
    if (currentUser) {
        document.getElementById('displayName').value = currentUser.name || '';
        document.getElementById('emailInput').value = currentUser.email || '';
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function switchTab(tabName, targetButton) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (targetButton) targetButton.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    // Render content
    if (tabName === 'overview') renderOverview();
    else if (tabName === 'activity') renderActivity();
    else if (tabName === 'achievements') renderAchievements();
    else if (tabName === 'settings') renderSettings();
}

async function saveSettings() {
    const displayName = document.getElementById('displayName').value;

    if (!displayName) {
        alert('Please enter a display name');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/update-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                name: displayName
            })
        });

        const data = await response.json();

        if (data.ok) {
            localStorage.setItem('firstName', displayName);
            document.getElementById('profileName').textContent = displayName;
            document.getElementById('profileAvatar').textContent = getInitials(displayName);
            alert('Settings saved successfully!');
        } else {
            alert('Failed to save settings: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Failed to save settings:', error);
        // Fallback to localStorage
        localStorage.setItem('firstName', displayName);
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('profileAvatar').textContent = getInitials(displayName);
        alert('Settings saved locally!');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    // Fetch current user
    currentUser = await fetchCurrentUser();

    // Event Listeners - Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName, this);
        });
    });

    // Save settings button
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Profile photo upload
    const photoInput = document.getElementById('profilePhotoInput');
    const uploadBtn = document.getElementById('uploadPhotoBtn');

    if (photoInput && uploadBtn) {
        uploadBtn.addEventListener('click', () => photoInput.click());

        photoInput.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be less than 5MB');
                    return;
                }

                // Show loading
                uploadBtn.textContent = 'Uploading...';
                uploadBtn.disabled = true;

                const photoUrl = await uploadProfilePhoto(file);

                if (photoUrl) {
                    alert('Profile photo updated successfully!');
                } else {
                    alert('Failed to upload photo. Please try again.');
                }

                uploadBtn.textContent = '📷 Change Photo';
                uploadBtn.disabled = false;
            }
        });
    }

    // Toggle switches
    const privacyToggle = document.getElementById('privacyToggle');
    const notifToggle = document.getElementById('notifToggle');

    if (privacyToggle) {
        privacyToggle.addEventListener('click', function () {
            this.classList.toggle('active');
        });
    }

    if (notifToggle) {
        notifToggle.addEventListener('click', function () {
            this.classList.toggle('active');
        });
    }

    // Initialize profile
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.name || 'Student';
        document.getElementById('profileEmail').textContent = currentUser.email || '';

        // Set profile photo or initials
        if (currentUser.profilePhoto) {
            updateProfilePhoto(currentUser.profilePhoto);
        } else {
            document.getElementById('profileAvatar').textContent = getInitials(currentUser.name || 'Student');
        }

        const stats = await fetchRealTimeStats();
        document.getElementById('rankBadge').textContent = stats.rank !== '-' ? `🏆 Rank #${stats.rank}` : '🏆 Unranked';
    }

    renderOverview();

    // Auto-refresh stats every 30 seconds
    setInterval(async () => {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'overview') {
            await renderOverview();
        }
    }, 30000);
});
