/**
 * Faculty Live Feedback - Interactive JavaScript
 * Real-time sentiment tracking with Chart.js and Socket.io
 */

// ===================================
// State Management
// ===================================

let feedbackActive = false;
let sentimentGauge = null;
let distributionChart = null;
let trendChart = null;
let socket = null;
let trendData = [];

// ===================================
// Initialize
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeEventListeners();
    initializeSocket();
    loadSessionHistory();
});

// ===================================
// Socket.io Setup
// ===================================

function initializeSocket() {
    socket = io();

    socket.on('feedback-submitted', (data) => {
        updateDashboard(data);
        addCommentToStream(data);
        updateTrend(data);
        generateInsights();
    });
}

// ===================================
// Event Listeners
// ===================================

function initializeEventListeners() {
    document.getElementById('toggleFeedbackBtn').addEventListener('click', toggleFeedback);
    document.getElementById('clearCommentsBtn').addEventListener('click', clearComments);
    document.getElementById('trendPeriod').addEventListener('change', updateTrendPeriod);
}

// ===================================
// Initialize Charts
// ===================================

function initializeCharts() {
    initializeSentimentGauge();
    initializeDistributionChart();
    initializeTrendChart();
}

function initializeSentimentGauge() {
    const ctx = document.getElementById('sentimentGauge').getContext('2d');

    sentimentGauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#8B5CF6', '#F3F4F6'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
}

function initializeDistributionChart() {
    const ctx = document.getElementById('distributionChart').getContext('2d');

    distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['😟 Very Confused', '😕 Confused', '😐 Neutral', '🙂 Confident', '😄 Very Confident'],
            datasets: [{
                label: 'Students',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#EF4444',
                    '#F59E0B',
                    '#6B7280',
                    '#10B981',
                    '#3B82F6'
                ],
                borderRadius: 12,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function initializeTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Average Confidence',
                data: [],
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ===================================
// Toggle Feedback Collection
// ===================================

async function toggleFeedback() {
    const btn = document.getElementById('toggleFeedbackBtn');

    feedbackActive = !feedbackActive;

    if (feedbackActive) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop Collecting';

        // Notify students via Socket.io
        socket.emit('feedback-started');

        showModal();
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-play"></i> Start Collecting';

        // Notify students
        socket.emit('feedback-stopped');

        // Save session
        await saveSession();
    }
}

// ===================================
// Update Dashboard
// ===================================

function updateDashboard(feedback) {
    // Update distribution chart
    const confidenceIndex = feedback.confidence - 1;
    distributionChart.data.datasets[0].data[confidenceIndex]++;
    distributionChart.update();

    // Calculate average
    const total = distributionChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const sum = distributionChart.data.datasets[0].data.reduce((acc, val, idx) => acc + (val * (idx + 1)), 0);
    const average = total > 0 ? (sum / total).toFixed(1) : 0;

    // Update gauge
    const percentage = (average / 5) * 100;
    sentimentGauge.data.datasets[0].data = [percentage, 100 - percentage];
    sentimentGauge.update();

    // Update display
    document.getElementById('avgConfidence').textContent = average;
    document.getElementById('totalFeedback').textContent = `${total} responses`;

    // Update quick stats
    const confused = distributionChart.data.datasets[0].data[0] + distributionChart.data.datasets[0].data[1];
    const neutral = distributionChart.data.datasets[0].data[2];
    const confident = distributionChart.data.datasets[0].data[3] + distributionChart.data.datasets[0].data[4];

    document.getElementById('confusedCount').textContent = confused;
    document.getElementById('neutralCount').textContent = neutral;
    document.getElementById('confidentCount').textContent = confident;
}

// ===================================
// Comments Stream
// ===================================

function addCommentToStream(feedback) {
    if (!feedback.comment) return;

    const stream = document.getElementById('commentsStream');
    const emptyState = stream.querySelector('.empty-state');

    if (emptyState) {
        emptyState.remove();
    }

    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';

    const confidenceLabel = getConfidenceLabel(feedback.confidence);
    const timeAgo = 'Just now';

    commentItem.innerHTML = `
        <div class="comment-header">
            <div class="comment-meta">
                <span class="comment-confidence ${confidenceLabel.class}">
                    ${confidenceLabel.emoji} ${confidenceLabel.text}
                </span>
                <span class="comment-time">${timeAgo}</span>
            </div>
        </div>
        <div class="comment-text">${escapeHtml(feedback.comment)}</div>
    `;

    stream.insertBefore(commentItem, stream.firstChild);

    // Keep only last 20 comments
    const comments = stream.querySelectorAll('.comment-item');
    if (comments.length > 20) {
        comments[comments.length - 1].remove();
    }
}

function getConfidenceLabel(confidence) {
    const labels = {
        1: { emoji: '😟', text: 'Very Confused', class: 'low' },
        2: { emoji: '😕', text: 'Confused', class: 'low' },
        3: { emoji: '😐', text: 'Neutral', class: 'medium' },
        4: { emoji: '🙂', text: 'Confident', class: 'high' },
        5: { emoji: '😄', text: 'Very Confident', class: 'high' }
    };
    return labels[confidence] || labels[3];
}

function clearComments() {
    if (!confirm('Clear all comments?')) return;

    const stream = document.getElementById('commentsStream');
    stream.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No comments yet. Students can submit anonymous questions.</p>
        </div>
    `;
}

// ===================================
// Trend Chart
// ===================================

function updateTrend(feedback) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    trendData.push({
        time: now,
        confidence: feedback.confidence,
        label: timeLabel
    });

    // Calculate rolling average
    const periodMinutes = parseInt(document.getElementById('trendPeriod').value);
    const cutoffTime = new Date(now - periodMinutes * 60000);

    const recentData = trendData.filter(d => d.time >= cutoffTime);

    // Group by minute and calculate average
    const grouped = {};
    recentData.forEach(d => {
        if (!grouped[d.label]) {
            grouped[d.label] = [];
        }
        grouped[d.label].push(d.confidence);
    });

    const labels = Object.keys(grouped);
    const averages = labels.map(label => {
        const values = grouped[label];
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    trendChart.data.labels = labels.slice(-10); // Last 10 data points
    trendChart.data.datasets[0].data = averages.slice(-10);
    trendChart.update();
}

function updateTrendPeriod() {
    // Recalculate trend with new period
    if (trendData.length > 0) {
        const lastFeedback = trendData[trendData.length - 1];
        updateTrend(lastFeedback);
    }
}

// ===================================
// AI Insights
// ===================================

function generateInsights() {
    const total = distributionChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    if (total < 5) return; // Need at least 5 responses

    const confused = distributionChart.data.datasets[0].data[0] + distributionChart.data.datasets[0].data[1];
    const confident = distributionChart.data.datasets[0].data[3] + distributionChart.data.datasets[0].data[4];

    const confusedPercent = (confused / total) * 100;
    const confidentPercent = (confident / total) * 100;

    const insights = [];

    if (confusedPercent > 40) {
        insights.push({
            icon: '⚠️',
            text: `${Math.round(confusedPercent)}% of students are confused. Consider slowing down or reviewing the material.`,
            type: 'warning'
        });
    }

    if (confidentPercent > 70) {
        insights.push({
            icon: '✅',
            text: `Great! ${Math.round(confidentPercent)}% of students are confident. You can move forward.`,
            type: 'success'
        });
    }

    if (confusedPercent > 20 && confusedPercent < 40) {
        insights.push({
            icon: '💡',
            text: 'Some students need help. Consider a quick Q&A session.',
            type: 'info'
        });
    }

    displayInsights(insights);
}

function displayInsights(insights) {
    const container = document.getElementById('insightsList');

    if (insights.length === 0) return;

    container.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-text">${insight.text}</div>
        </div>
    `).join('');
}

// ===================================
// Session Management
// ===================================

async function saveSession() {
    const total = distributionChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const sum = distributionChart.data.datasets[0].data.reduce((acc, val, idx) => acc + (val * (idx + 1)), 0);
    const average = total > 0 ? (sum / total).toFixed(1) : 0;

    const sessionData = {
        date: new Date().toISOString(),
        averageConfidence: average,
        totalResponses: total,
        distribution: distributionChart.data.datasets[0].data,
        comments: document.querySelectorAll('.comment-item').length
    };

    try {
        await fetch('/api/feedback/save-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(sessionData)
        });

        loadSessionHistory();
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

async function loadSessionHistory() {
    try {
        const response = await fetch('/api/feedback/sessions', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (result.ok) {
            displaySessionHistory(result.sessions);
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

function displaySessionHistory(sessions) {
    const container = document.getElementById('sessionsGrid');

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p style="color: #9CA3AF; text-align: center; grid-column: 1/-1;">No sessions yet</p>';
        return;
    }

    container.innerHTML = sessions.slice(0, 6).map(session => {
        const date = new Date(session.date).toLocaleDateString();
        const time = new Date(session.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="session-card">
                <div class="session-header">
                    <div class="session-date">${date} at ${time}</div>
                    <div class="session-avg">${session.averageConfidence}</div>
                </div>
                <div class="session-stats">
                    <span class="session-stat">
                        <i class="fas fa-users"></i> ${session.totalResponses} responses
                    </span>
                    <span class="session-stat">
                        <i class="fas fa-comments"></i> ${session.comments} comments
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// Utility Functions
// ===================================

function showModal() {
    document.getElementById('activeModal').classList.add('active');
}

function closeModal() {
    document.getElementById('activeModal').classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
