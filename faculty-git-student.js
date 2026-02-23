// Faculty Git Student Review Page

let allProjects = [];
let currentProject = null;

document.addEventListener('DOMContentLoaded', () => {
    loadAllProjects();

    // Add event listeners for filters and buttons
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('sortFilter')?.addEventListener('change', applyFilters);
    document.getElementById('closeReviewModalBtn')?.addEventListener('click', closeReviewModal);
});

// Load all student projects
async function loadAllProjects() {
    try {
        const response = await fetch('/api/projects/all', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.ok) {
            allProjects = data.projects;
            updateStats();
            applyFilters();
        } else {
            showError('Failed to load projects');
        }
    } catch (error) {
        console.error('Load projects error:', error);
        showError('Network error');
    }
}

// Update statistics
function updateStats() {
    const total = allProjects.length;
    const pending = allProjects.filter(p => p.status === 'pending').length;
    const graded = allProjects.filter(p => p.status === 'graded').length;

    const gradedProjects = allProjects.filter(p => p.grade !== null && p.grade !== undefined);
    const avgGrade = gradedProjects.length > 0
        ? (gradedProjects.reduce((sum, p) => sum + p.grade, 0) / gradedProjects.length).toFixed(1)
        : '--';

    document.getElementById('totalProjects').textContent = total;
    document.getElementById('pendingProjects').textContent = pending;
    document.getElementById('gradedProjects').textContent = graded;
    document.getElementById('avgGrade').textContent = avgGrade !== '--' ? avgGrade : '--';
}

// Apply filters and sorting
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    let filtered = [...allProjects];

    // Filter by status
    if (statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Sort
    switch (sortFilter) {
        case 'newest':
            filtered.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
            break;
        case 'grade-high':
            filtered.sort((a, b) => (b.grade || 0) - (a.grade || 0));
            break;
        case 'grade-low':
            filtered.sort((a, b) => (a.grade || 0) - (b.grade || 0));
            break;
    }

    renderProjects(filtered);
}

// Render projects list
function renderProjects(projects) {
    const container = document.getElementById('projectsList');

    if (projects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                <h3>No Projects Found</h3>
                <p>No projects match the current filters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 8px; font-size: 20px;">${escapeHtml(project.projectName)}</h3>
                    <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 8px;">
                        👤 ${escapeHtml(project.studentName)} • ${escapeHtml(project.studentEmail)}
                    </div>
                    <span class="status-badge status-${project.status}">${formatStatus(project.status)}</span>
                    ${project.grade !== null && project.grade !== undefined ? `
                        <span style="margin-left: 8px; font-weight: 600; color: ${getGradeColor(project.grade)};">
                            ${project.grade}/100
                        </span>
                    ` : ''}
                </div>
            </div>

            <p style="color: var(--text-muted); margin-bottom: 16px;">${escapeHtml(project.description)}</p>

            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn">
                    🐙 GitHub Repo
                </a>
                ${project.liveDemoUrl ? `
                    <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn">
                        🚀 Live Demo
                    </a>
                ` : ''}
                <button class="review-btn open-review-btn" data-project-id="${project._id}">
                    ${project.status === 'graded' ? '✏️ Edit Review' : '📝 Review & Grade'}
                </button>
            </div>

            ${project.feedback ? `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 12px; border-left: 3px solid #0f62fe; margin-top: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #0f62fe;">Your Feedback</div>
                    <p style="margin: 0; color: var(--text-muted);">${escapeHtml(project.feedback)}</p>
                </div>
            ` : ''}

            <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted);">
                Submitted ${formatDate(project.submittedAt)}
                ${project.reviewedAt ? ` • Reviewed ${formatDate(project.reviewedAt)}` : ''}
            </div>
        </div>
    `).join('');

    // Add event listeners to dynamically created buttons
    document.querySelectorAll('.open-review-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const projectId = this.getAttribute('data-project-id');
            openReviewModal(projectId);
        });
    });
}

// Open review modal
async function openReviewModal(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.ok) {
            currentProject = data.project;
            showReviewModal();
        } else {
            alert('Failed to load project details');
        }
    } catch (error) {
        console.error('Load project error:', error);
        alert('Network error');
    }
}

// Show review modal with project details
function showReviewModal() {
    const project = currentProject;

    document.getElementById('modalProjectName').textContent = project.projectName;
    document.getElementById('modalContent').innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <h3 style="margin-top: 0;">Student Information</h3>
            <p><strong>Name:</strong> ${escapeHtml(project.studentName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(project.studentEmail)}</p>
            <p><strong>Submitted:</strong> ${formatDate(project.submittedAt)}</p>
        </div>

        <div style="margin-bottom: 24px;">
            <h3>Project Description</h3>
            <p style="color: var(--text-muted);">${escapeHtml(project.description)}</p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn">
                🐙 View GitHub Repository
            </a>
            ${project.liveDemoUrl ? `
                <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn">
                    🚀 Open Live Demo
                </a>
            ` : ''}
        </div>

        <form id="gradeForm" style="background: rgba(255, 255, 255, 0.05); padding: 24px; border-radius: 12px;">
            <h3 style="margin-top: 0;">Grade & Feedback</h3>
            
            <div class="form-group">
                <label for="gradeInput">Grade (0-100) *</label>
                <input type="number" id="gradeInput" min="0" max="100" required 
                       value="${project.grade !== null && project.grade !== undefined ? project.grade : ''}"
                       placeholder="Enter grade">
            </div>

            <div class="form-group">
                <label for="feedbackInput">Feedback *</label>
                <textarea id="feedbackInput" required placeholder="Provide detailed feedback to the student...">${project.feedback || ''}</textarea>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button type="submit" class="review-btn">💾 Submit Review</button>
                <button type="button" class="link-btn" id="cancelReviewBtn">Cancel</button>
            </div>
        </form>
    `;

    // Handle form submission
    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitGrade();
    });

    // Handle cancel button
    document.getElementById('cancelReviewBtn')?.addEventListener('click', closeReviewModal);

    document.getElementById('reviewModal').style.display = 'flex';
}

// Submit grade and feedback
async function submitGrade() {
    const grade = parseInt(document.getElementById('gradeInput').value);
    const feedback = document.getElementById('feedbackInput').value.trim();

    if (grade < 0 || grade > 100) {
        alert('Grade must be between 0 and 100');
        return;
    }

    if (!feedback) {
        alert('Please provide feedback');
        return;
    }

    try {
        const response = await fetch(`/api/projects/${currentProject._id}/grade`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ grade, feedback })
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Review submitted successfully!');
            closeReviewModal();
            loadAllProjects(); // Reload projects
        } else {
            alert('❌ ' + (data.message || 'Failed to submit review'));
        }
    } catch (error) {
        console.error('Submit grade error:', error);
        alert('❌ Network error. Please try again.');
    }
}

// Close review modal
function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentProject = null;
}

// View live demo in separate modal
function viewDemo(url, projectName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1400px; width: 95%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">${escapeHtml(projectName)} - Live Demo</h2>
                <button class="close-demo-btn" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <iframe src="${escapeHtml(url)}" class="demo-preview" style="height: 600px;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            <div style="margin-top: 16px;">
                <a href="${escapeHtml(url)}" target="_blank" class="link-btn">🔗 Open in New Tab</a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Add event listener to close button
    modal.querySelector('.close-demo-btn').addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Helper functions
function formatStatus(status) {
    const statusMap = {
        'pending': '⏳ Pending Review',
        'reviewed': '👀 Reviewed',
        'graded': '✅ Graded'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getGradeColor(grade) {
    if (grade >= 90) return '#34c759';
    if (grade >= 75) return '#0f62fe';
    if (grade >= 60) return '#ff9f0a';
    return '#ff3b30';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const container = document.getElementById('projectsList');
    container.innerHTML = `
        <div style="text-align: center; padding: 48px; color: #ff3b30;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h3>Error</h3>
            <p>${escapeHtml(message)}</p>
            <button class="review-btn retry-load-btn" style="margin-top: 16px;">Retry</button>
        </div>
    `;

    // Add event listener to retry button
    document.querySelector('.retry-load-btn')?.addEventListener('click', loadAllProjects);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReviewModal();
        closePeerReviewModal();
    }
});

// ============================================
// PEER REVIEW FUNCTIONALITY
// ============================================

// Open peer review modal
document.getElementById('peerReviewBtn')?.addEventListener('click', openPeerReviewModal);
document.getElementById('closePeerReviewModalBtn')?.addEventListener('click', closePeerReviewModal);
document.getElementById('cancelPeerReviewBtn')?.addEventListener('click', closePeerReviewModal);
document.getElementById('savePeerReviewBtn')?.addEventListener('click', savePeerReviewSettings);

// Enable/disable peer review settings
document.getElementById('enablePeerReview')?.addEventListener('change', function () {
    const settingsDiv = document.getElementById('peerReviewSettings');
    if (this.checked) {
        settingsDiv.style.display = 'grid';
    } else {
        settingsDiv.style.display = 'none';
    }
});

// Update grade weight display
document.getElementById('gradeWeight')?.addEventListener('input', function () {
    const value = this.value;
    document.getElementById('gradeWeightValue').textContent = value + '%';

    // Update formula display
    const facultyWeight = 100 - value;
    const formula = document.querySelector('#peerReviewSettings .form-group:nth-child(4) p');
    if (formula) {
        formula.textContent = `Final Grade = Faculty Grade (${facultyWeight}%) + Peer Review Average (${value}%)`;
    }
});

async function openPeerReviewModal() {
    // Load existing settings if any
    try {
        const response = await fetch('/api/peer-review/settings', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.settings) {
                // Populate form with existing settings
                document.getElementById('enablePeerReview').checked = data.settings.enabled;
                document.getElementById('reviewsPerStudent').value = data.settings.reviewsPerStudent || 3;
                document.getElementById('anonymousReviews').checked = data.settings.isAnonymous !== false;
                document.getElementById('gradeWeight').value = data.settings.gradeWeight || 20;

                if (data.settings.deadline) {
                    const deadline = new Date(data.settings.deadline);
                    document.getElementById('reviewDeadline').value = deadline.toISOString().slice(0, 16);
                }

                // Show/hide settings based on enabled state
                if (data.settings.enabled) {
                    document.getElementById('peerReviewSettings').style.display = 'grid';
                }

                // Update weight display
                document.getElementById('gradeWeightValue').textContent = (data.settings.gradeWeight || 20) + '%';
            }
        }
    } catch (error) {
        console.error('Error loading peer review settings:', error);
    }

    document.getElementById('peerReviewModal').style.display = 'flex';
}

function closePeerReviewModal() {
    document.getElementById('peerReviewModal').style.display = 'none';
}

async function savePeerReviewSettings() {
    const enabled = document.getElementById('enablePeerReview').checked;

    if (!enabled) {
        // Just disable peer review
        try {
            const response = await fetch('/api/peer-review/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ enabled: false })
            });

            if (response.ok) {
                alert('✅ Peer review disabled successfully!');
                closePeerReviewModal();
            } else {
                alert('❌ Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('❌ Network error');
        }
        return;
    }

    // Validate required fields
    const deadline = document.getElementById('reviewDeadline').value;
    if (!deadline) {
        alert('⚠️ Please set a review deadline');
        return;
    }

    const settings = {
        enabled: true,
        reviewsPerStudent: parseInt(document.getElementById('reviewsPerStudent').value),
        deadline: new Date(deadline).toISOString(),
        isAnonymous: document.getElementById('anonymousReviews').checked,
        gradeWeight: parseInt(document.getElementById('gradeWeight').value)
    };

    try {
        const response = await fetch('/api/peer-review/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(settings)
        });

        const data = await response.json();

        if (response.ok) {
            alert('✅ Peer review settings saved! Students will be auto-assigned reviews.');
            closePeerReviewModal();

            // Show success message with details
            if (data.assignmentsCreated) {
                alert(`🎉 ${data.assignmentsCreated} peer review assignments created!`);
            }
        } else {
            alert('❌ ' + (data.message || 'Failed to save settings'));
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('❌ Network error. Please try again.');
    }
}
