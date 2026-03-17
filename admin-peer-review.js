/**
 * Admin Peer Review Management Script
 */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

let allReviews = [];
let filteredReviews = [];
let currentFilter = 'all';

async function initDashboard() {
    setupEventListeners();
    await fetchAllReviews();
}

function setupEventListeners() {
    document.getElementById('tabAll').onclick = () => switchTab('all');
    document.getElementById('tabPending').onclick = () => switchTab('pending');
    document.getElementById('tabSubmitted').onclick = () => switchTab('submitted');
}

async function fetchAllReviews() {
    const listEl = document.getElementById('reviewList');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/peer-review/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch reviews');

        const data = await response.json();
        allReviews = data.reviews || [];
        
        // Update stats
        document.getElementById('statTotal').textContent = data.stats?.total || 0;
        document.getElementById('statPending').textContent = data.stats?.pending || 0;
        document.getElementById('statCompleted').textContent = data.stats?.submitted || 0;

        renderReviews();
    } catch (err) {
        console.error('Error fetching admin reviews:', err);
        listEl.innerHTML = `<div class="empty-state"><p style="color:var(--red);">Failed to load dashboard data. Please try again.</p></div>`;
    }
}

function switchTab(filter) {
    currentFilter = filter;
    
    // Update UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (filter === 'all') document.getElementById('tabAll').classList.add('active');
    if (filter === 'pending') document.getElementById('tabPending').classList.add('active');
    if (filter === 'submitted') document.getElementById('tabSubmitted').classList.add('active');

    renderReviews();
}

function renderReviews() {
    const listEl = document.getElementById('reviewList');
    
    filteredReviews = allReviews.filter(r => {
        if (currentFilter === 'all') return true;
        return r.status === currentFilter;
    });

    if (filteredReviews.length === 0) {
        listEl.innerHTML = `<div class="empty-state"><h3>No reviews found</h3><p>There are no reviews matching the current filter.</p></div>`;
        return;
    }

    listEl.innerHTML = filteredReviews.map(r => `
        <div class="review-card">
            <div class="review-info">
                <div class="review-icon"><i data-lucide="file-text"></i></div>
                <div class="review-details">
                    <h3>${r.submissionId?.projectName || 'Project Submission'}</h3>
                    <div class="review-participants">
                        <span class="participant">Reviewer: <b>${r.reviewerId?.name || 'Unknown'}</b></span>
                        <span class="participant">Reviewee: <b>${r.revieweeId?.name || 'Unknown'}</b></span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 20px;">
                <span class="status-pill status-${r.status}">${r.status}</span>
                ${r.status === 'submitted' ? `
                    <div style="text-align: right;">
                        <div style="font-weight: 800; color: var(--accent); font-size: 14px;">${r.ratings?.overall || 0}/5</div>
                        <div style="font-size: 10px; color: var(--muted);">Score</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}
