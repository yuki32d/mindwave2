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
                <h3>${escapeHtml(project.projectName)}${project.assignmentId ? `<span style="font-size:10px;background:rgba(208,128,0,0.12);color:var(--accent);border:1px solid rgba(208,128,0,0.3);padding:2px 8px;border-radius:6px;font-weight:700;margin-left:8px;">📋 ${escapeHtml(project.assignmentId.title)}</span>` : ''}</h3>
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
                        <i data-lucide="git-branch"></i>GitHub Repository
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
                        <i data-lucide="git-branch"></i>Repository
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
        document.getElementById('notifModal').style.display = 'none';
    }
});

// ── Professional Notification Modal ──
// opts: { type: 'success'|'error'|'warning', title, subtitle?, message?, errors: [] }
function showNotif(opts) {
    const modal     = document.getElementById('notifModal');
    const iconWrap  = document.getElementById('notifIconWrap');
    const iconEl    = document.getElementById('notifIcon');
    const titleEl   = document.getElementById('notifTitle');
    const subtitleEl= document.getElementById('notifSubtitle');
    const bodyEl    = document.getElementById('notifBody');
    const okBtn     = document.getElementById('notifOkBtn');

    const cfg = {
        success: { bg: 'rgba(22,163,74,.12)', color: '#16a34a', icon: 'check-circle', btnColor: '#16a34a' },
        error:   { bg: 'rgba(255,59,48,.12)',  color: '#ff3b30', icon: 'x-circle',     btnColor: '#ff3b30' },
        warning: { bg: 'rgba(208,128,0,.12)',  color: '#d08000', icon: 'alert-triangle',btnColor: '#d08000' }
    }[opts.type || 'success'];

    iconWrap.style.background = cfg.bg;
    iconEl.setAttribute('data-lucide', cfg.icon);
    iconEl.style.color = cfg.color;
    okBtn.style.background = cfg.btnColor;

    titleEl.textContent    = opts.title || '';
    subtitleEl.textContent = opts.subtitle || '';

    // Build body HTML
    let html = '';
    if (opts.message) {
        html += `<div class="notif-success-note"><i data-lucide="check-circle"></i>${escapeHtml(opts.message)}</div>`;
    }
    if (opts.errors && opts.errors.length > 0) {
        if (opts.errors.length > 0 && !opts.message) {
            // pure error mode — no success note needed
        }
        html += opts.errors.map(e =>
            `<div class="notif-error-item"><i data-lucide="alert-circle"></i><span>${escapeHtml(e)}</span></div>`
        ).join('');
    }
    bodyEl.innerHTML = html;

    modal.style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();

    okBtn.onclick = () => { modal.style.display = 'none'; if (opts.onOk) opts.onOk(); };
    modal.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; if (opts.onOk) opts.onOk(); } };
}


let wizardState = {
    step: 1,
    selectedProjects: [],
    reviewerType: null, // 'faculty' or 'student'
    selectedReviewer: null, // {id, name, email}
    weightage: 50
};

// Open peer review wizard
document.getElementById('peerReviewBtn')?.addEventListener('click', () => {
    resetWizard();
    document.getElementById('peerReviewModal').style.display = 'flex';
    renderWizardStep();
});

document.getElementById('closePeerReviewModalBtn')?.addEventListener('click', () => {
    document.getElementById('peerReviewModal').style.display = 'none';
});

// Wizard Navigation
document.getElementById('wizardPrev')?.addEventListener('click', () => {
    if (wizardState.step > 1) {
        wizardState.step--;
        renderWizardStep();
    }
});

document.getElementById('wizardNext')?.addEventListener('click', () => {
    if (validateWizardStep()) {
        if (wizardState.step < 3) {
            wizardState.step++;
            renderWizardStep();
        } else {
            finalizePeerReviewSetup();
        }
    }
});

function resetWizard() {
    wizardState = {
        step: 1,
        selectedProjects: [],
        reviewerType: null,
        selectedReviewer: null
    };
    document.getElementById('reviewerSearch').value = '';
    document.getElementById('reviewerResultsList').style.display = 'none';
    document.getElementById('selectedReviewerDisplay').style.display = 'none';
}

function renderWizardStep() {
    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const step = parseInt(dot.getAttribute('data-step'));
        dot.className = `step-dot ${step === wizardState.step ? 'active' : ''}`;
    });

    // Update visibility
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step${wizardState.step}`).classList.add('active');

    // Update buttons — now 3 steps total
    document.getElementById('wizardPrev').style.display = wizardState.step > 1 ? 'block' : 'none';
    document.getElementById('wizardNext').textContent = wizardState.step === 3 ? 'Send Invites' : 'Continue';

    // Step-specific rendering
    if (wizardState.step === 1) renderProjectSelection();
    if (wizardState.step === 2) setupReviewerTypeCards();
    if (wizardState.step === 3) setupReviewerSearch();
}

function renderProjectSelection() {
    const list = document.getElementById('projectSelectionList');
    list.innerHTML = allProjects.map(p => `
        <div class="project-selection-item" onclick="toggleProjectSelection('${p._id}')">
            <input type="checkbox" ${wizardState.selectedProjects.includes(p._id) ? 'checked' : ''} onchange="event.stopPropagation(); toggleProjectSelection('${p._id}')">
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 13px;">${escapeHtml(p.projectName)}</div>
                <div style="font-size: 11px; color: var(--muted);">${escapeHtml(p.studentName)}</div>
            </div>
            <span class="status-badge status-${p.status}" style="font-size: 9px; padding: 2px 6px;">${p.status}</span>
        </div>
    `).join('');
}

function toggleProjectSelection(id) {
    const index = wizardState.selectedProjects.indexOf(id);
    if (index === -1) wizardState.selectedProjects.push(id);
    else wizardState.selectedProjects.splice(index, 1);
    renderProjectSelection();
}

function setupReviewerTypeCards() {
    document.querySelectorAll('.reviewer-type-card').forEach(card => {
        const type = card.getAttribute('data-type');
        card.className = `reviewer-type-card ${wizardState.reviewerType === type ? 'selected' : ''}`;
        card.onclick = () => {
            wizardState.reviewerType = type;
            setupReviewerTypeCards();
        };
    });
}

function setupReviewerSearch() {
    const title = document.getElementById('step3Label');
    const role = wizardState.reviewerType; // 'faculty' or 'student'
    title.textContent = role === 'faculty' ? 'Step 3: Select Faculty Member' : 'Step 3: Select Student Group';
    
    const searchInput = document.getElementById('reviewerSearch');
    const listContainer = document.getElementById('reviewerResultsList');

    // Initial load: show first 10
    fetchReviewers('', role);
    
    searchInput.oninput = async (e) => {
        const query = e.target.value;
        fetchReviewers(query, role);
    };

    async function fetchReviewers(query, role) {
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=${role}`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.users && data.users.length > 0) {
                listContainer.innerHTML = data.users.map(u => `
                    <div class="reviewer-result-item" onclick="selectReviewer('${u.id}', '${escapeHtml(u.name)}', '${escapeHtml(u.email)}')">
                        <div class="mini-avatar">${u.name.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                            <div style="font-weight: 700; font-size: 13px;">${escapeHtml(u.name)}</div>
                            <div style="font-size: 11px; color: var(--muted);">${escapeHtml(u.email)}</div>
                        </div>
                    </div>
                `).join('');
                listContainer.style.display = 'block';
            } else {
                listContainer.innerHTML = '<div style="padding: 10px; font-size: 12px; color: var(--muted);">No results found</div>';
                listContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    document.getElementById('clearReviewer').onclick = () => {
        wizardState.selectedReviewer = null;
        document.getElementById('selectedReviewerDisplay').style.display = 'none';
        document.getElementById('reviewerSearch').style.display = 'block';
        document.getElementById('reviewerSearch').value = '';
        fetchReviewers('', role); // Reload default list
    };
}

function selectReviewer(id, name, email) {
    wizardState.selectedReviewer = {id, name, email};
    document.getElementById('reviewerResultsList').style.display = 'none';
    document.getElementById('reviewerSearch').style.display = 'none';
    
    document.getElementById('selectedReviewerDisplay').style.display = 'flex';
    document.getElementById('reviewerAvatar').textContent = name.split(' ').map(n => n[0]).join('');
    document.getElementById('reviewerName').textContent = name;
    document.getElementById('reviewerEmail').textContent = email;
}

function updateWeightageDisplay() {
    const val = parseInt(document.getElementById('markSplitRange').value);
    wizardState.weightage = val;
    document.getElementById('primaryWeightDisplay').textContent = `${100 - val}%`;
    document.getElementById('secondaryWeightDisplay').textContent = `${val}%`;
}

document.getElementById('markSplitRange')?.addEventListener('input', updateWeightageDisplay);

function validateWizardStep() {
    if (wizardState.step === 1 && wizardState.selectedProjects.length === 0) {
        showNotif({ type: 'warning', title: 'No Projects Selected', subtitle: 'Please select at least one project to continue.' });
        return false;
    }
    if (wizardState.step === 2 && !wizardState.reviewerType) {
        showNotif({ type: 'warning', title: 'Reviewer Type Required', subtitle: 'Please choose who will perform the review.' });
        return false;
    }
    if (wizardState.step === 3 && !wizardState.selectedReviewer) {
        showNotif({ type: 'warning', title: 'No Reviewer Selected', subtitle: 'Please search for and select a reviewer.' });
        return false;
    }
    return true;
}

async function finalizePeerReviewSetup() {
    try {
        const payload = {
            projectIds: wizardState.selectedProjects,
            reviewerIds: [wizardState.selectedReviewer.id]
        };

        const response = await fetch('/api/peer-review/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('peerReviewModal').style.display = 'none';
            wizardState.selectedProjects.forEach(id => {
                const p = allProjects.find(p => p._id === id);
                if(p) p.hasPeerReview = true;
            });
            loadAllProjects();

            const hasErrors = data.errors && data.errors.length > 0;
            showNotif({
                type: data.count > 0 ? (hasErrors ? 'warning' : 'success') : 'error',
                title: data.count > 0 ? 'Invites Sent!' : 'No Invites Sent',
                subtitle: `Reviewer: ${wizardState.selectedReviewer.name}`,
                message: data.count > 0 ? `${data.count} project(s) assigned successfully.` : null,
                errors: data.errors || []
            });
        } else {
            showNotif({ type: 'error', title: 'Failed to Send Invites', errors: [data.error || 'Unknown error'] });
        }
    } catch (e) {
        console.error('Invite Error:', e);
        showNotif({ type: 'error', title: 'Network Error', subtitle: 'Could not reach the server. Please try again.' });
    }
}

// ============================================
// CORE REVIEW MODAL (Updated for Split Marks)
// ============================================

async function openReviewModal(projectId) {
    try {
        const response = await fetch(`/api/projects/${projectId}`, { credentials: 'include' });
        const data = await response.json();
        if (data.ok) {
            currentProject = data.project;
            // Check if this project has a peer review assigned (simulating for UI)
            const p = allProjects.find(p => p._id === projectId);
            if (p) currentProject.hasPeerReview = p.hasPeerReview;
            showReviewModal();
        } else alert('Failed to load project');
    } catch (e) { console.error(e); alert('Network error'); }
}

function showReviewModal() {
    const project = currentProject;
    const isSplit = project.hasPeerReview;
    const peerWeight = 80; // Hardcoded example of active weightage
    const facultyWeight = 100 - peerWeight;

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
                    <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn"><i data-lucide="git-branch"></i>Repository</a>
                    ${project.liveDemoUrl ? `<a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn"><i data-lucide="external-link"></i>Demo</a>` : ''}
                </div>
            </div>
        </div>

        <form id="gradeForm" style="border-top: 1px solid var(--border); padding-top: 24px;">
            <div style="display: flex; flex-direction: column; gap: 24px;">
                <!-- Faculty Block -->
                <div style="background: var(--bg); padding: 24px; border-radius: 16px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="font-weight: 800; font-size: 14px; color: var(--text);">Faculty Evaluation (Your Section)</div>
                        <span class="status-badge" style="background: var(--surface); color: var(--accent); border: 1px solid var(--accent);">Weightage: ${isSplit ? facultyWeight : 100}%</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 20px;">
                        <div class="form-group">
                            <label>Marks (Max ${isSplit ? facultyWeight : 100})</label>
                            <input type="number" id="gradeInput" min="0" max="${isSplit ? facultyWeight : 100}" required value="${project.grade || ''}" placeholder="${isSplit ? facultyWeight : 100}">
                        </div>
                        <div class="form-group">
                            <label>Internal Comments</label>
                            <textarea id="feedbackInput" required placeholder="Faculty feedback...">${project.feedback || ''}</textarea>
                        </div>
                    </div>
                </div>

                ${isSplit ? `
                <!-- Peer Block (Visual Only for Faculty context) -->
                <div style="background: var(--surface); padding: 24px; border-radius: 16px; border: 1px dashed var(--border); opacity: 0.8;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="font-weight: 800; font-size: 14px; color: var(--muted);"><i data-lucide="lock" style="width: 14px; display: inline; vertical-align: middle; margin-right: 6px;"></i>Peer Evaluation Section</div>
                        <span class="status-badge" style="background: var(--bg); color: var(--muted);">Weightage: ${peerWeight}%</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 20px;">
                         <div class="form-group"><label>Marks</label><input type="text" disabled placeholder="Pending Peer Review"></div>
                         <div class="form-group"><label>Peer Feedback</label><textarea disabled placeholder="This section will be filled by the assigned reviewer..."></textarea></div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                <button type="button" class="btn btn-ghost" onclick="closeReviewModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i data-lucide="check"></i>${isSplit ? 'Save My Section' : 'Submit Final Grade'}</button>
            </div>
        </form>
    `;
    
    if(window.lucide) window.lucide.createIcons();
    document.getElementById('gradeForm').onsubmit = (e) => { e.preventDefault(); submitGrade(); };
    document.getElementById('reviewModal').style.display = 'flex';
}

async function submitGrade() {
    const grade = parseInt(document.getElementById('gradeInput').value);
    const feedback = document.getElementById('feedbackInput').value.trim();
    const isSplit = currentProject.hasPeerReview;
    const maxGrade = isSplit ? 20 : 100; // Simulated weight check

    if (grade < 0 || grade > maxGrade) { alert(`Grade must be between 0 and ${maxGrade}`); return; }
    if (!feedback) { alert('Please provide feedback'); return; }

    try {
        const response = await fetch(`/api/projects/${currentProject._id}/grade`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ grade, feedback, isSplit })
        });

        if ((await response.json()).ok) {
            alert('✅ Section submitted successfully!');
            closeReviewModal();
            loadAllProjects();
        } else alert('❌ Submission failed');
    } catch (e) { alert('❌ Network error'); }
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    currentProject = null;
}

// Cleanup escape handlers
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReviewModal();
        document.getElementById('peerReviewModal').style.display = 'none';
        document.getElementById('createAssignmentModal').style.display = 'none';
    }
});

// Helper functions (same as before)
function escapeHtml(t) { if(!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function formatDate(s) { return new Date(s).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); }
function formatDateShort(s) { return new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric'}); }
function getGradeColor(g) { return g >= 90 ? '#34c759' : (g >= 75 ? '#d08000' : '#ff3b30'); }
function formatStatusTag(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================
// ASSIGNMENT MANAGEMENT
// ============================================

let allAssignments = [];

async function loadAssignments() {
    try {
        const res = await fetch('/api/assignments', { credentials: 'include' });
        const data = await res.json();
        if (data.ok) {
            allAssignments = data.assignments;
            populateAssignmentFilter(data.assignments);
        }
    } catch (e) {
        console.error('Load assignments error:', e);
    }
}

function populateAssignmentFilter(assignments) {
    const filter = document.getElementById('assignmentFilter');
    if (!filter) return;
    // Keep the "All Assignments" option, rebuild the rest
    filter.innerHTML = '<option value="all">All Assignments</option>';
    assignments.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a._id;
        opt.textContent = a.title;
        filter.appendChild(opt);
    });
}

// Wire the assignment filter to reload projects
document.getElementById('assignmentFilter')?.addEventListener('change', () => {
    loadAllProjectsWithFilter();
});

async function loadAllProjectsWithFilter() {
    const assignmentFilter = document.getElementById('assignmentFilter')?.value || 'all';
    try {
        const url = assignmentFilter === 'all'
            ? '/api/projects/all'
            : `/api/projects/all?assignmentFilter=${assignmentFilter}`;
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (data.ok) {
            allProjects = data.projects;
            updateStats();
            applyFilters();
        }
    } catch (error) {
        console.error('Load projects error:', error);
        showError('Network error');
    }
}

// Open Create Assignment modal
document.getElementById('createAssignmentBtn')?.addEventListener('click', () => {
    document.getElementById('createAssignmentForm').reset();
    // Pre-fill start date to now
    const now = new Date();
    now.setSeconds(0, 0);
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('assignmentStartDate').value = localNow;
    document.getElementById('createAssignmentModal').style.display = 'flex';
    if (window.lucide) window.lucide.createIcons();
});

document.getElementById('closeAssignmentModalBtn')?.addEventListener('click', () => {
    document.getElementById('createAssignmentModal').style.display = 'none';
});

document.getElementById('cancelAssignmentBtn')?.addEventListener('click', () => {
    document.getElementById('createAssignmentModal').style.display = 'none';
});

// Submit new assignment
document.getElementById('createAssignmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('assignmentTitle').value.trim();
    const description = document.getElementById('assignmentDescription').value.trim();
    const startDate = document.getElementById('assignmentStartDate').value;
    const deadline = document.getElementById('assignmentDeadline').value;

    if (new Date(deadline) <= new Date(startDate)) {
        showNotif({ type: 'warning', title: 'Invalid Dates', subtitle: 'Deadline must be after the start date.' });
        return;
    }

    try {
        const res = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, description, startDate, deadline })
        });
        const data = await res.json();
        if (data.ok) {
            document.getElementById('createAssignmentModal').style.display = 'none';
            showNotif({ type: 'success', title: 'Assignment Created!', subtitle: `"${title}" is now visible to students.` });
            await loadAssignments();
        } else {
            showNotif({ type: 'error', title: 'Failed', errors: [data.message || 'Unknown error'] });
        }
    } catch (err) {
        showNotif({ type: 'error', title: 'Network Error', subtitle: 'Could not reach the server.' });
    }
});

// Render assignment badge on project cards (called inside renderProjects)
function getAssignmentBadge(project) {
    if (!project.assignmentId) return '';
    const a = project.assignmentId;
    return `<span style="font-size:10px; background:rgba(208,128,0,0.12); color:var(--accent); border:1px solid rgba(208,128,0,0.3); padding:2px 8px; border-radius:6px; font-weight:700; letter-spacing:.03em; margin-left:6px;">
        📋 ${escapeHtml(a.title)}
    </span>`;
}

// Load assignments immediately on page load
loadAssignments();

