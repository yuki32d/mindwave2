// Student GitHub Projects Page — Redesigned
// Uses toast notifications and modal dialogs instead of browser alerts/confirms

document.addEventListener('DOMContentLoaded', () => {
    loadMyProjects();

    // Submit modal triggers
    document.getElementById('submitNewProjectBtn')?.addEventListener('click', openSubmitModal);
    document.getElementById('cancelSubmitBtn')?.addEventListener('click', closeSubmitModal);
    document.getElementById('cancelSubmitBtn2')?.addEventListener('click', closeSubmitModal);

    // Delete modal cancel
    document.getElementById('deleteCancelBtn')?.addEventListener('click', () => {
        document.getElementById('deleteModal').classList.remove('open');
    });

    // Submit form
    document.getElementById('submitForm')?.addEventListener('submit', handleSubmit);
});

// ── Load Projects ──────────────────────────────────────────────────────────────
async function loadMyProjects() {
    try {
        const response = await fetch('/api/projects/my', { credentials: 'include' });
        const data = await response.json();

        if (data.ok) {
            renderProjects(data.projects);
            updateStats(data.projects);
        } else {
            showPageError('Failed to load projects. Please refresh.');
        }
    } catch (error) {
        console.error('Load projects error:', error);
        showPageError('Network error — check your connection.');
    }
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function updateStats(projects) {
    const total = projects.length;
    const pending = projects.filter(p => p.status === 'pending').length;
    const reviewed = projects.filter(p => p.status === 'reviewed').length;
    const graded = projects.filter(p => p.status === 'graded').length;

    setStatEl('statTotal', total);
    setStatEl('statPending', pending);
    setStatEl('statReviewed', reviewed);
    setStatEl('statGraded', graded);
}

function setStatEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ── Render Projects ───────────────────────────────────────────────────────────
function renderProjects(projects) {
    const container = document.getElementById('projectsList');

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="gh-empty">
                <div class="gh-empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                        <path d="M9 18c-4.51 2-5-2-7-2"/>
                    </svg>
                </div>
                <h3>No Projects Yet</h3>
                <p>Submit your first project and get feedback from your faculty.</p>
                <button class="mw-btn mw-btn-primary" onclick="openSubmitModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Submit First Project
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map((project, i) => `
        <div class="gh-card" style="animation-delay:${i * 0.05}s">
            <div class="gh-card-top">
                <div>
                    <h3 class="gh-card-title">${escapeHtml(project.projectName)}</h3>
                    <span class="gh-badge ${getBadgeClass(project.status)}">
                        ${getStatusIcon(project.status)} ${formatStatus(project.status)}
                    </span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                    ${project.grade !== null && project.grade !== undefined
            ? `<div class="gh-grade">${project.grade}<span style="font-size:.9rem;opacity:.6;">/100</span></div>`
            : ''}
                    <button class="gh-delete-btn" data-project-id="${project._id}" data-project-name="${escapeHtml(project.projectName)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>

            <p class="gh-card-desc">${escapeHtml(project.description)}</p>

            ${renderTags(project.techTags)}

            <div class="gh-link-row">
                <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" rel="noopener" class="gh-link-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                        <path d="M9 18c-4.51 2-5-2-7-2"/>
                    </svg>
                    View on GitHub
                </a>
                ${project.liveDemoUrl ? `
                    <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" rel="noopener" class="gh-link-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Live Demo
                    </a>
                ` : ''}
            </div>

            ${project.feedback ? `
                <div class="gh-feedback">
                    <div class="gh-feedback-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        Faculty Feedback
                    </div>
                    <div class="gh-feedback-text">${escapeHtml(project.feedback)}</div>
                    ${project.reviewedBy ? `
                        <div class="gh-feedback-by">
                            Reviewed by ${escapeHtml(project.reviewedBy.name || project.reviewedBy.email)}
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <div class="gh-timestamp">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                Submitted ${formatDate(project.submittedAt)}
            </div>
        </div>
    `).join('');

    // Wire delete buttons
    document.querySelectorAll('.gh-delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            openDeleteModal(this.dataset.projectId, this.dataset.projectName);
        });
    });
}

// ── Tag Rendering ─────────────────────────────────────────────────────────────
function renderTags(tags) {
    if (!tags || (Array.isArray(tags) && tags.length === 0)) return '';
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length === 0) return '';
    return `<div class="gh-tags">${tagList.map(t => `<span class="gh-tag">${escapeHtml(t)}</span>`).join('')}</div>`;
}

// ── Submit Modal ──────────────────────────────────────────────────────────────
function openSubmitModal() {
    document.getElementById('submitModal').classList.add('open');
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('open');
    document.getElementById('submitForm').reset();
}

async function handleSubmit(e) {
    e.preventDefault();

    const projectName = document.getElementById('projectName').value.trim();
    const description = document.getElementById('description').value.trim();
    const githubRepoUrl = document.getElementById('githubRepoUrl').value.trim();
    const liveDemoUrl = document.getElementById('liveDemoUrl').value.trim();
    const techTagsRaw = document.getElementById('techTags').value.trim();
    const techTags = techTagsRaw ? techTagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!githubRepoUrl.includes('github.com')) {
        showToast('Please enter a valid GitHub repository URL', 'error');
        return;
    }

    const btn = document.getElementById('submitProjectBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        style="animation:spin 1s linear infinite">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
    </svg> Submitting…`;

    try {
        const response = await fetch('/api/projects/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ projectName, description, githubRepoUrl, liveDemoUrl: liveDemoUrl || null, techTags })
        });

        const data = await response.json();

        if (data.ok) {
            showToast('Project submitted successfully!', 'success');
            closeSubmitModal();
            loadMyProjects();
        } else {
            showToast(data.message || 'Failed to submit project', 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Network error — please try again.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg> Submit Project`;
    }
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
let _deleteId = null;
let _deleteName = null;

function openDeleteModal(projectId, projectName) {
    _deleteId = projectId;
    _deleteName = projectName;

    const sub = document.getElementById('deleteModalSub');
    if (sub) sub.textContent = `"${projectName}" will be permanently removed.`;

    document.getElementById('deleteModal').classList.add('open');

    // Wire confirm button (replace to remove old listeners)
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', () => deleteProject(_deleteId, _deleteName));
}

async function deleteProject(projectId, projectName) {
    document.getElementById('deleteModal').classList.remove('open');
    showToast('Deleting project…', 'info');

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.ok) {
            showToast('Project deleted successfully', 'success');
            loadMyProjects();
        } else {
            showToast(data.message || 'Failed to delete project', 'error');
        }
    } catch (error) {
        console.error('Delete project error:', error);
        showToast('Network error — please try again.', 'error');
    }
}

// ── Toast System ──────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('gh-toast-container');
    if (!container) return;

    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`
    };

    const toast = document.createElement('div');
    toast.className = `gh-toast gh-toast-${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3500);
}

// ── Page Error ─────────────────────────────────────────────────────────────────
function showPageError(message) {
    const container = document.getElementById('projectsList');
    container.innerHTML = `
        <div class="gh-empty">
            <div class="gh-empty-icon" style="background:rgba(244,63,94,0.1);color:#f43f5e;">
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <h3>Something went wrong</h3>
            <p>${escapeHtml(message)}</p>
            <button class="mw-btn mw-btn-primary" onclick="loadMyProjects()">Retry</button>
        </div>
    `;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getBadgeClass(status) {
    return { pending: 'gh-badge-pending', reviewed: 'gh-badge-reviewed', graded: 'gh-badge-graded' }[status] || '';
}

function getStatusIcon(status) {
    const icons = {
        pending: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
        </svg>`,
        reviewed: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`,
        graded: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`
    };
    return icons[status] || '';
}

function formatStatus(status) {
    return { pending: 'Pending Review', reviewed: 'Reviewed', graded: 'Graded' }[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modals on overlay click
['submitModal', 'deleteModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('open');
    });
});

// Escape key closes top-most open modal
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        ['deleteModal', 'submitModal'].forEach(id => {
            document.getElementById(id)?.classList.remove('open');
        });
    }
});
