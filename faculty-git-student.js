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
            <div style="text-align: center; padding: 60px; color: var(--muted); border: 1px dashed var(--border); border-radius: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📦</div>
                <h3 style="margin-bottom: 8px;">No Projects Found</h3>
                <p style="font-size: 13px;">No student submissions match your current filters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card">
            <div class="p-info">
                <h3>${escapeHtml(project.projectName)}</h3>
                <div class="p-meta">
                    <span><i data-lucide="user"></i>${escapeHtml(project.studentName)}</span>
                    <span><i data-lucide="mail"></i>${escapeHtml(project.studentEmail)}</span>
                    <span class="status-badge status-${project.status}">${formatStatusTag(project.status)}</span>
                    ${project.grade !== null && project.grade !== undefined ? `
                        <span style="font-weight: 800; color: ${getGradeColor(project.grade)}; font-family: var(--mono); background: var(--bg); padding: 2px 8px; border-radius: 5px;">
                            ${project.grade}/100
                        </span>
                    ` : ''}
                </div>
                <p style="color: var(--muted); font-size: 13px; margin: 12px 0;">${escapeHtml(project.description)}</p>
                <div style="display: flex; gap: 15px;">
                    <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn">
                        <i data-lucide="github"></i>GitHub Repository
                    </a>
                    ${project.liveDemoUrl ? `
                        <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn">
                            <i data-lucide="external-link"></i>Live Demo
                        </a>
                    ` : ''}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; align-items: flex-end;">
                <button class="btn ${project.status === 'graded' ? 'btn-ghost' : 'btn-primary'} open-review-btn" data-project-id="${project._id}">
                    <i data-lucide="${project.status === 'graded' ? 'edit-2' : 'clipboard-check'}"></i>
                    ${project.status === 'graded' ? 'Edit Review' : 'Review & Grade'}
                </button>
                <div style="font-size: 10px; color: var(--muted); font-family: var(--mono);">
                    Submitted ${formatDateShort(project.submittedAt)}
                </div>
            </div>

            ${project.feedback ? `
                <div style="grid-column: 1 / -1; background: var(--bg); padding: 14px; border-radius: 10px; border-left: 3px solid var(--accent); margin-top: 5px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--accent); margin-bottom: 5px;">Faculty Feedback</div>
                    <p style="margin: 0; color: var(--text); font-size: 12px;">${escapeHtml(project.feedback)}</p>
                </div>
            ` : ''}
        </div>
    `).join('');

    // Initialize Lucide icons
    if (window.lucide) window.lucide.createIcons();

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
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <div style="background: var(--bg); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="user"></i>Student Information
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
                    <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">Name:</span> <span style="font-weight: 700;">${escapeHtml(project.studentName)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">Email:</span> <span style="font-weight: 700;">${escapeHtml(project.studentEmail)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span style="color: var(--muted);">Submitted:</span> <span style="font-weight: 700;">${formatDate(project.submittedAt)}</span></div>
                </div>
            </div>
            <div style="background: var(--bg); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
                 <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="info"></i>Project Context
                </div>
                <p style="color: var(--text); font-size: 13px; line-height: 1.6;">${escapeHtml(project.description)}</p>
                <div style="display: flex; gap: 15px; margin-top: 15px;">
                    <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn">
                        <i data-lucide="github"></i>Repository
                    </a>
                    ${project.liveDemoUrl ? `
                        <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn">
                            <i data-lucide="external-link"></i>Demo
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>

        <form id="gradeForm" style="border-top: 1px solid var(--border); padding-top: 24px;">
            <div style="display: grid; grid-template-columns: 180px 1fr; gap: 24px;">
                <div class="form-group">
                    <label for="gradeInput">Grade (0-100)</label>
                    <input type="number" id="gradeInput" min="0" max="100" required 
                           value="${project.grade !== null && project.grade !== undefined ? project.grade : ''}"
                           placeholder="85">
                    <p style="font-size: 10px; color: var(--muted); margin-top: 6px;">Evaluation score based on rubric.</p>
                </div>

                <div class="form-group">
                    <label for="feedbackInput">Detailed Feedback</label>
                    <textarea id="feedbackInput" required placeholder="Provide actionable feedback for the student..." style="min-height: 120px;">${project.feedback || ''}</textarea>
                </div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                <button type="button" class="btn btn-ghost" id="cancelReviewBtn">Cancel</button>
                <button type="submit" class="btn btn-primary"><i data-lucide="check"></i>Submit Final Grade</button>
            </div>
        </form>
    `;
    
    if(window.lucide) window.lucide.createIcons();

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
                <h2 style="margin: 0; font-size: 20px;">${escapeHtml(projectName)} — Live Interactive Preview</h2>
                <button class="close-demo-btn close-btn" style="color: var(--text);"><i data-lucide="x"></i></button>
            </div>
            <iframe src="${escapeHtml(url)}" class="demo-preview" style="height: 65vh; background: #fff;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
                <a href="${escapeHtml(url)}" target="_blank" class="btn btn-ghost"><i data-lucide="external-link"></i>Full Tab</a>
                <button class="btn btn-primary close-demo-btn">Dismiss Preview</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    if(window.lucide) window.lucide.createIcons();

    // Add event listener to close buttons
    modal.querySelectorAll('.close-demo-btn').forEach(b => b.addEventListener('click', () => modal.remove()));

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
        'pending': '⏳ Pending',
        'reviewed': '👀 Reviewed',
        'graded': '✅ Graded'
    };
    return statusMap[status] || status;
}

function formatStatusTag(status) {
    const statusMap = {
        'pending': 'Pending',
        'reviewed': 'Reviewed',
        'graded': 'Graded'
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

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
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
