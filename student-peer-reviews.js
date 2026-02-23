// Student Peer Reviews Page

let myReviews = [];
let currentReview = null;
let currentRatings = {
    codeQuality: 0,
    functionality: 0,
    documentation: 0,
    overall: 0
};

document.addEventListener('DOMContentLoaded', () => {
    loadMyReviews();
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
});

// Load assigned peer reviews
async function loadMyReviews() {
    try {
        const response = await fetch('/api/peer-review/my-reviews', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.reviews) {
            myReviews = data.reviews;
            updateProgress();
            renderReviews();
        } else {
            showError('Failed to load reviews');
        }
    } catch (error) {
        console.error('Load reviews error:', error);
        showError('Network error');
    }
}

// Update progress bar
function updateProgress() {
    const total = myReviews.length;
    const completed = myReviews.filter(r => r.status === 'submitted').length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    document.getElementById('progressText').textContent = `${completed}/${total} Complete`;
    document.getElementById('progressFill').style.width = `${percentage}%`;
}

// Render reviews list
function renderReviews() {
    const container = document.getElementById('reviewsList');

    if (myReviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 64px; margin-bottom: 16px;">📝</div>
                <h3>No Peer Reviews Assigned</h3>
                <p>You don't have any peer reviews to complete at this time.</p>
                <p style="margin-top: 16px;">Check back later or contact your instructor.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myReviews.map(review => {
        const isSubmitted = review.status === 'submitted';
        const deadline = new Date(review.deadline || Date.now() + 7 * 24 * 60 * 60 * 1000);
        const timeLeft = deadline - new Date();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        const isUrgent = daysLeft <= 2 && !isSubmitted;

        return `
            <div class="review-card">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 8px; font-size: 20px;">
                            ${escapeHtml(review.submissionId?.projectName || 'Project')}
                        </h3>
                        <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 8px;">
                            ${review.revieweeId?.name ? `By: ${escapeHtml(review.revieweeId.name)}` : 'Anonymous Student'}
                        </div>
                        <span class="status-badge ${isSubmitted ? 'status-submitted' : 'status-pending'}">
                            ${isSubmitted ? '✅ Submitted' : '⏳ Pending'}
                        </span>
                    </div>
                </div>

                ${review.submissionId?.description ? `
                    <p style="color: var(--text-muted); margin-bottom: 16px;">
                        ${escapeHtml(review.submissionId.description)}
                    </p>
                ` : ''}

                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                    ${review.submissionId?.githubRepoUrl ? `
                        <a href="${escapeHtml(review.submissionId.githubRepoUrl)}" target="_blank" 
                           style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #58a6ff; text-decoration: none; font-size: 14px;">
                            🐙 View Code
                        </a>
                    ` : ''}
                    ${review.submissionId?.liveDemoUrl ? `
                        <a href="${escapeHtml(review.submissionId.liveDemoUrl)}" target="_blank"
                           style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #58a6ff; text-decoration: none; font-size: 14px;">
                            🚀 Live Demo
                        </a>
                    ` : ''}
                </div>

                ${!isSubmitted ? `
                    <div class="countdown ${isUrgent ? 'urgent' : ''}">
                        ⏰ ${daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Due today!'}
                    </div>
                ` : `
                    <div style="color: #34c759; font-size: 14px; margin-top: 8px;">
                        ✅ Submitted ${formatDate(review.submittedAt)}
                    </div>
                `}

                <div style="margin-top: 16px;">
                    <button class="review-btn ${isSubmitted ? '' : ''}" 
                            onclick="openReviewModal('${review._id}')"
                            ${isSubmitted ? '' : ''}>
                        ${isSubmitted ? '👁️ View Review' : '📝 Start Review'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open review modal
function openReviewModal(reviewId) {
    currentReview = myReviews.find(r => r._id === reviewId);
    if (!currentReview) return;

    const isSubmitted = currentReview.status === 'submitted';

    // Reset ratings if not submitted
    if (!isSubmitted) {
        currentRatings = {
            codeQuality: 0,
            functionality: 0,
            documentation: 0,
            overall: 0
        };
    } else {
        currentRatings = currentReview.ratings || currentRatings;
    }

    document.getElementById('modalProjectName').textContent =
        currentReview.submissionId?.projectName || 'Review Project';

    document.getElementById('modalContent').innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="margin-top: 0;">Project Information</h3>
            <p><strong>Description:</strong> ${escapeHtml(currentReview.submissionId?.description || 'No description')}</p>
            <div style="display: flex; gap: 12px; margin-top: 12px;">
                ${currentReview.submissionId?.githubRepoUrl ? `
                    <a href="${escapeHtml(currentReview.submissionId.githubRepoUrl)}" target="_blank" class="review-btn" style="display: inline-block;">
                        🐙 View Repository
                    </a>
                ` : ''}
                ${currentReview.submissionId?.liveDemoUrl ? `
                    <a href="${escapeHtml(currentReview.submissionId.liveDemoUrl)}" target="_blank" class="review-btn" style="display: inline-block;">
                        🚀 View Demo
                    </a>
                ` : ''}
            </div>
        </div>

        <form id="reviewForm" style="background: rgba(255, 255, 255, 0.05); padding: 24px; border-radius: 12px;">
            <h3 style="margin-top: 0;">Rate This Project</h3>
            
            <!-- Code Quality -->
            <div class="form-group">
                <label>⭐ Code Quality</label>
                <div class="star-rating" data-category="codeQuality">
                    ${generateStars(currentRatings.codeQuality)}
                </div>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                    How well-written and organized is the code?
                </p>
            </div>

            <!-- Functionality -->
            <div class="form-group">
                <label>⚙️ Functionality</label>
                <div class="star-rating" data-category="functionality">
                    ${generateStars(currentRatings.functionality)}
                </div>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                    Does the project work as intended?
                </p>
            </div>

            <!-- Documentation -->
            <div class="form-group">
                <label>📝 Documentation</label>
                <div class="star-rating" data-category="documentation">
                    ${generateStars(currentRatings.documentation)}
                </div>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                    Is the project well-documented with clear README?
                </p>
            </div>

            <!-- Overall -->
            <div class="form-group">
                <label>🌟 Overall Rating</label>
                <div class="star-rating" data-category="overall">
                    ${generateStars(currentRatings.overall)}
                </div>
                <p style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
                    Your overall impression of the project
                </p>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0;">

            <h3>Written Feedback</h3>

            <!-- Strengths -->
            <div class="form-group">
                <label>💪 What did they do well?</label>
                <textarea id="strengthsInput" ${isSubmitted ? 'readonly' : 'required'} 
                          placeholder="Highlight the strong points of this project...">${currentReview.feedback?.strengths || ''}</textarea>
            </div>

            <!-- Improvements -->
            <div class="form-group">
                <label>🎯 What could be improved?</label>
                <textarea id="improvementsInput" ${isSubmitted ? 'readonly' : 'required'}
                          placeholder="Provide constructive suggestions for improvement...">${currentReview.feedback?.improvements || ''}</textarea>
            </div>

            <!-- General Comments -->
            <div class="form-group">
                <label>💬 General Comments</label>
                <textarea id="commentsInput" ${isSubmitted ? 'readonly' : ''}
                          placeholder="Any additional thoughts or feedback...">${currentReview.feedback?.generalComments || ''}</textarea>
            </div>

            ${!isSubmitted ? `
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="submit" class="review-btn">💾 Submit Review</button>
                    <button type="button" onclick="closeModal()" 
                            style="padding: 12px 24px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 999px; color: white; cursor: pointer; font-weight: 600;">
                        Cancel
                    </button>
                </div>
            ` : `
                <div style="background: rgba(52, 199, 89, 0.2); border: 1px solid #34c759; border-radius: 8px; padding: 16px; margin-top: 24px;">
                    <div style="color: #34c759; font-weight: 600; margin-bottom: 8px;">✅ Review Submitted</div>
                    <div style="color: var(--text-muted); font-size: 14px;">
                        Submitted on ${formatDate(currentReview.submittedAt)}
                    </div>
                </div>
                <button type="button" onclick="closeModal()" class="review-btn" style="margin-top: 16px;">
                    Close
                </button>
            `}
        </form>
    `;

    // Set up star rating handlers
    if (!isSubmitted) {
        setupStarRatings();
        document.getElementById('reviewForm').addEventListener('submit', submitReview);
    }

    document.getElementById('reviewModal').style.display = 'flex';
}

// Generate star HTML
function generateStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star ${i <= rating ? 'filled' : ''}" data-value="${i}">★</span>`;
    }
    return html;
}

// Setup star rating interactions
function setupStarRatings() {
    document.querySelectorAll('.star-rating').forEach(container => {
        const category = container.getAttribute('data-category');
        const stars = container.querySelectorAll('.star');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.getAttribute('data-value'));
                currentRatings[category] = value;

                // Update visual
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.classList.add('filled');
                    } else {
                        s.classList.remove('filled');
                    }
                });
            });

            star.addEventListener('mouseenter', () => {
                const value = parseInt(star.getAttribute('data-value'));
                stars.forEach((s, index) => {
                    if (index < value) {
                        s.style.color = '#ffd700';
                    }
                });
            });
        });

        container.addEventListener('mouseleave', () => {
            const currentValue = currentRatings[category];
            stars.forEach((s, index) => {
                if (index >= currentValue) {
                    s.style.color = '';
                }
            });
        });
    });
}

// Submit peer review
async function submitReview(e) {
    e.preventDefault();

    // Validate ratings
    if (currentRatings.codeQuality === 0 || currentRatings.functionality === 0 ||
        currentRatings.documentation === 0 || currentRatings.overall === 0) {
        alert('⚠️ Please rate all categories (1-5 stars)');
        return;
    }

    const feedback = {
        strengths: document.getElementById('strengthsInput').value.trim(),
        improvements: document.getElementById('improvementsInput').value.trim(),
        generalComments: document.getElementById('commentsInput').value.trim()
    };

    if (!feedback.strengths || !feedback.improvements) {
        alert('⚠️ Please provide both strengths and improvements');
        return;
    }

    try {
        const response = await fetch('/api/peer-review/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                reviewId: currentReview._id,
                ratings: currentRatings,
                feedback
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Review submitted successfully! Thank you for your feedback.');
            closeModal();
            loadMyReviews(); // Reload to update status
        } else {
            alert('❌ ' + (data.error || 'Failed to submit review'));
        }
    } catch (error) {
        console.error('Submit review error:', error);
        alert('❌ Network error. Please try again.');
    }
}

// Close modal
function closeModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentReview = null;
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const container = document.getElementById('reviewsList');
    container.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #ff3b30;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3>Error</h3>
            <p>${escapeHtml(message)}</p>
            <button class="review-btn" onclick="loadMyReviews()" style="margin-top: 16px;">Retry</button>
        </div>
    `;
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
