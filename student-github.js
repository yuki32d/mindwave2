// Student GitHub Projects Page

document.addEventListener('DOMContentLoaded', () => {
    loadMyProjects();

    // Add event listeners for buttons
    document.getElementById('submitNewProjectBtn')?.addEventListener('click', openSubmitModal);
    document.getElementById('cancelSubmitBtn')?.addEventListener('click', closeSubmitModal);
});

// Load student's submitted projects
async function loadMyProjects() {
    try {
        const response = await fetch('/api/projects/my', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.ok) {
            renderProjects(data.projects);
        } else {
            showError('Failed to load projects');
        }
    } catch (error) {
        console.error('Load projects error:', error);
        showError('Network error');
    }
}

// Render projects list
function renderProjects(projects) {
    const container = document.getElementById('projectsList');

    if (projects.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                <h3>No Projects Yet</h3>
                <p>Submit your first project to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                <div>
                    <h3 style="margin: 0 0 8px; font-size: 20px;">${escapeHtml(project.projectName)}</h3>
                    <span class="status-badge status-${project.status}">${formatStatus(project.status)}</span>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${project.grade !== null && project.grade !== undefined ? `
                        <div class="grade-display">${project.grade}/100</div>
                    ` : ''}
                    <button class="delete-project-btn" data-project-id="${project._id}" data-project-name="${escapeHtml(project.projectName)}" style="background: rgba(255, 59, 48, 0.2); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.3); padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; font-weight: 600;" title="Delete project">
                        🗑️ Delete
                    </button>
                </div>
            </div>

            <p style="color: var(--text-muted); margin-bottom: 16px;">${escapeHtml(project.description)}</p>

            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                <a href="${escapeHtml(project.githubRepoUrl)}" target="_blank" class="link-btn">
                    🐙 View on GitHub
                </a>
                ${project.liveDemoUrl ? `
                    <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" class="link-btn">
                        🚀 View Live Demo
                    </a>
                ` : ''}
            </div>

            ${project.feedback ? `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 12px; border-left: 3px solid #0f62fe;">
                    <div style="font-weight: 600; margin-bottom: 8px; color: #0f62fe;">Faculty Feedback</div>
                    <p style="margin: 0; color: var(--text-muted);">${escapeHtml(project.feedback)}</p>
                    ${project.reviewedBy ? `
                        <small style="color: var(--text-muted); margin-top: 8px; display: block;">
                            Reviewed by ${escapeHtml(project.reviewedBy.name || project.reviewedBy.email)}
                        </small>
                    ` : ''}
                </div>
            ` : ''}

            <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted);">
                Submitted ${formatDate(project.submittedAt)}
            </div>
        </div>
    `).join('');

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const projectId = this.getAttribute('data-project-id');
            const projectName = this.getAttribute('data-project-name');
            deleteProject(projectId, projectName);
        });
    });
}

// Open submit modal
function openSubmitModal() {
    document.getElementById('submitModal').style.display = 'flex';
}

// Close submit modal
function closeSubmitModal() {
    document.getElementById('submitModal').style.display = 'none';
    document.getElementById('submitForm').reset();
}

// Handle form submission
document.getElementById('submitForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const projectName = document.getElementById('projectName').value.trim();
    const description = document.getElementById('description').value.trim();
    const githubRepoUrl = document.getElementById('githubRepoUrl').value.trim();
    const liveDemoUrl = document.getElementById('liveDemoUrl').value.trim();

    // Validate GitHub URL
    if (!githubRepoUrl.includes('github.com')) {
        alert('Please enter a valid GitHub repository URL');
        return;
    }

    try {
        const response = await fetch('/api/projects/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                projectName,
                description,
                githubRepoUrl,
                liveDemoUrl: liveDemoUrl || null
            })
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Project submitted successfully!');
            closeSubmitModal();
            loadMyProjects(); // Reload projects list
        } else {
            alert('❌ ' + (data.message || 'Failed to submit project'));
        }
    } catch (error) {
        console.error('Submit error:', error);
        alert('❌ Network error. Please try again.');
    }
});

// View live demo in modal
function viewDemo(url, projectName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1200px; width: 95%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="margin: 0;">${escapeHtml(projectName)} - Live Demo</h2>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <iframe src="${escapeHtml(url)}" class="demo-preview" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            <div style="margin-top: 16px;">
                <a href="${escapeHtml(url)}" target="_blank" class="link-btn">🔗 Open in New Tab</a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Delete a project
async function deleteProject(projectId, projectName) {
    const confirmed = confirm(`Are you sure you want to delete "${projectName}"?\n\nThis action cannot be undone.`);

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Project deleted successfully!');
            loadMyProjects(); // Reload the projects list
        } else {
            alert('❌ ' + (data.message || 'Failed to delete project'));
        }
    } catch (error) {
        console.error('Delete project error:', error);
        alert('❌ Network error. Please try again.');
    }
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
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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
            <button onclick="loadMyProjects()" class="submit-btn" style="margin-top: 16px;">Retry</button>
        </div>
    `;
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSubmitModal();
    }
});
