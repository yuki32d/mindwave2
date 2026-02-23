// Student Live Activity - Browse and Start Activities
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    const activitiesGrid = document.getElementById('activitiesGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const filterTabs = document.querySelectorAll('.filter-tab');

    let allActivities = [];
    let currentFilter = 'all';

    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'homepage.html';
    });

    // Filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderActivities();
        });
    });

    // Load activities
    loadActivities();

    async function loadActivities() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Get user's organization from token
            const userInfo = JSON.parse(atob(token.split('.')[1]));

            // Fetch all activities from the organization
            const response = await fetch('/api/activities/organization', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                allActivities = data.activities || [];
                renderActivities();
            } else {
                throw new Error('Failed to load activities');
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            loadingState.innerHTML = `
                <div style="text-align: center; padding: 64px 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="color: #f5f7ff; margin-bottom: 8px;">Error Loading Activities</h3>
                    <p style="color: #9ea4b6; margin-bottom: 16px;">Failed to load activities. Please try again.</p>
                    <button onclick="location.reload()" class="primary-btn">Retry</button>
                </div>
            `;
        }
    }

    function renderActivities() {
        // Filter activities
        const filtered = currentFilter === 'all'
            ? allActivities
            : allActivities.filter(a => {
                if (currentFilter === 'slide') {
                    return a.type.startsWith('slide-');
                }
                return a.type === currentFilter;
            });

        // Clear grid
        activitiesGrid.innerHTML = '';

        if (filtered.length === 0) {
            activitiesGrid.appendChild(emptyState);
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Render activity cards
        filtered.forEach(activity => {
            const card = createActivityCard(activity);
            activitiesGrid.appendChild(card);
        });
    }

    function createActivityCard(activity) {
        const card = document.createElement('div');
        card.className = 'activity-card';

        const typeColors = {
            'quiz': { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#a78bfa' },
            'poll': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
            'puzzle': { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.3)', text: '#f472b6' },
            'type-answer': { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#34d399' },
            'default': { bg: 'rgba(0, 217, 255, 0.1)', border: 'rgba(0, 217, 255, 0.3)', text: '#00d9ff' }
        };

        const typeKey = activity.type.startsWith('slide-') ? 'default' : activity.type;
        const colors = typeColors[typeKey] || typeColors.default;

        const typeIcons = {
            'quiz': '🎯',
            'poll': '📊',
            'puzzle': '🧩',
            'type-answer': '✍️',
            'pin-answer': '📍',
            'brainstorm': '💡',
            'slider': '🎚️',
            'ranking': '📋',
            'default': '📝'
        };

        const icon = typeIcons[activity.type] || typeIcons.default;
        const displayType = activity.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <span class="activity-type-badge" style="background: ${colors.bg}; border: 1px solid ${colors.border}; color: ${colors.text};">
                    ${icon} ${displayType}
                </span>
                <span style="color: #9ea4b6; font-size: 12px;">
                    ${formatDate(activity.createdAt)}
                </span>
            </div>
            <h3 style="color: #f5f7ff; font-size: 20px; margin-bottom: 8px; font-weight: 600;">
                ${activity.title}
            </h3>
            <p style="color: #9ea4b6; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">
                ${activity.description || 'No description provided'}
            </p>
            <button class="primary-btn" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                🚀 Start Activity
            </button>
        `;

        card.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            startActivity(activity);
        });

        return card;
    }

    function startActivity(activity) {
        // Store activity info
        localStorage.setItem('currentActivityId', activity._id);
        localStorage.setItem('currentActivityType', activity.type);

        // Redirect to appropriate player
        const playerPages = {
            'quiz': 'student-play-quiz.html',
            'poll': 'student-play-poll.html',
            'type-answer': 'student-play-type-answer.html',
            'pin-answer': 'student-play-pin-answer.html',
            'puzzle': 'student-play-puzzle.html',
            'slider': 'student-play-slider.html',
            'ranking': 'student-play-ranking.html',
            'brainstorm': 'student-play-brainstorm.html',
            'slide-classic': 'student-view-slide.html',
            'slide-big-title': 'student-view-slide.html',
            'slide-title-text': 'student-view-slide.html',
            'slide-bullets': 'student-view-slide.html',
            'slide-quote': 'student-view-slide.html',
            'slide-big-media': 'student-view-slide.html'
        };

        const playerPage = playerPages[activity.type] || 'student-play-generic.html';
        window.location.href = `${playerPage}?activity=${activity._id}`;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
});
