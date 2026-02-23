// Student Courses Page - Google Classroom Integration

let courses = [];
let selectedCourseId = null;
let currentFilter = 'all';
let courseSearchQuery = '';

// Accent color palette for course cards
const COURSE_COLORS = [
    { bg: 'rgba(99,102,241,.15)', fg: '#6366f1', emoji: '📘' },
    { bg: 'rgba(16,185,129,.15)', fg: '#10b981', emoji: '📗' },
    { bg: 'rgba(245,158,11,.15)', fg: '#f59e0b', emoji: '📙' },
    { bg: 'rgba(239,68,68,.15)', fg: '#ef4444', emoji: '📕' },
    { bg: 'rgba(59,130,246,.15)', fg: '#3b82f6', emoji: '📓' },
    { bg: 'rgba(168,85,247,.15)', fg: '#a855f7', emoji: '📔' },
];
function courseColor(idx) { return COURSE_COLORS[idx % COURSE_COLORS.length]; }

async function init() {
    await loadCourses();
}

async function loadCourses() {
    const grid = document.getElementById('panelGrid');
    if (grid) grid.innerHTML = '<div style="padding:60px 0;text-align:center;color:var(--muted)">Loading courses…</div>';
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('mindwave_token');
        const response = await fetch('/api/classroom/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!data.connected) {
            showConnectPrompt();
            // Show connect button in topbar
            const connectBtn = document.getElementById('connectGcrBtn');
            if (connectBtn) connectBtn.style.display = '';
            return;
        }

        courses = data.courses || [];
        renderCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses');
    }
}

function showConnectPrompt() {
    const container = document.getElementById('panelGrid');
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
        <div class="mw-courses-empty">
            <div style="
                width:72px;height:72px;border-radius:20px;
                background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(168,85,247,.25));
                border:1px solid rgba(99,102,241,.35);
                display:flex;align-items:center;justify-content:center;
                margin:0 auto 20px;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                    stroke="url(#gcr-grad)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <defs>
                        <linearGradient id="gcr-grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#6366f1"/>
                            <stop offset="100%" stop-color="#a855f7"/>
                        </linearGradient>
                    </defs>
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
            </div>
            <h2 style="font-size:1.4rem;margin:0 0 10px;">Connect Google Classroom</h2>
            <p style="max-width:400px;line-height:1.7;">
                Link your Google Classroom account to view all your courses,
                assignments, and materials — right here in MindWave.
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:8px 0 20px;">
                <span style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);background:var(--surface-alt,rgba(255,255,255,.05));border:1px solid var(--border);border-radius:20px;padding:5px 14px;">
                    <i data-lucide="book-open" style="width:13px;height:13px;"></i> Courses
                </span>
                <span style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);background:var(--surface-alt,rgba(255,255,255,.05));border:1px solid var(--border);border-radius:20px;padding:5px 14px;">
                    <i data-lucide="clipboard-list" style="width:13px;height:13px;"></i> Assignments
                </span>
                <span style="display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);background:var(--surface-alt,rgba(255,255,255,.05));border:1px solid var(--border);border-radius:20px;padding:5px 14px;">
                    <i data-lucide="megaphone" style="width:13px;height:13px;"></i> Announcements
                </span>
            </div>
            <button onclick="window.location.href='/auth/google'" class="mw-btn mw-btn-primary"
                style="font-size:.95rem;padding:.75rem 2rem;border-radius:12px;">
                <i data-lucide="link"></i>&nbsp; Connect Google Classroom
            </button>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderCourses() {
    const container = document.getElementById('panelGrid');
    if (!container) return;
    container.style.display = '';

    // Filter
    let list = courses;
    if (currentFilter !== 'all') {
        list = list.filter(c => c.courseState === currentFilter);
    }
    // Search
    if (courseSearchQuery) {
        const q = courseSearchQuery;
        list = list.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.section || '').toLowerCase().includes(q)
        );
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="mw-courses-empty" style="grid-column:1/-1;">
                <div class="mw-courses-empty-icon">📭</div>
                <h2>No courses found</h2>
                <p>${courseSearchQuery ? 'No courses match your search.' : 'No courses match the selected filter.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((course, idx) => {
        const color = courseColor(idx);
        const active = course.courseState === 'ACTIVE';
        return `
        <div class="mw-course-card" data-course-id="${course.id}">
            <div class="mw-course-card-top">
                <div class="mw-course-accent" style="background:${color.bg};color:${color.fg};">${color.emoji}</div>
                <h3 class="mw-course-name">${escapeHtml(course.name)}</h3>
                <p class="mw-course-section">${escapeHtml(course.section || 'No section')}</p>
                ${course.descriptionHeading ? `<p style="margin:8px 0 0;font-size:.8rem;color:var(--muted);">${escapeHtml(course.descriptionHeading)}</p>` : ''}
            </div>
            <div class="mw-course-card-foot">
                <span class="mw-course-badge">
                    <span class="mw-course-badge-dot" style="background:${active ? 'var(--green,#30d158)' : 'var(--muted,#888)'}"></span>
                    ${active ? 'Active' : 'Inactive'}
                </span>
                <a href="${course.alternateLink}" target="_blank" class="mw-course-link classroom-link">
                    Open in Classroom <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>
                </a>
            </div>
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons();

    // Attach click to open detail modal (skip if clicking the GCR link)
    document.querySelectorAll('.mw-course-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.classroom-link')) return;
            selectCourse(card.dataset.courseId);
        });
    });
}


async function selectCourse(courseId) {
    selectedCourseId = courseId;
    const course = courses.find(c => c.id === courseId);

    // Show course details modal
    showCourseDetails(course);
}

async function showCourseDetails(course) {
    const modal = document.createElement('div');
    modal.className = 'course-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: #1c1f26; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
            <div style="padding: 32px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; background: #1c1f26; z-index: 1;">
                <button id="closeModalBtn" style="position: absolute; top: 24px; right: 24px; background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 8px;">×</button>
                <h2 style="margin: 0 0 8px;">${course.name}</h2>
                <p style="margin: 0; color: var(--text-muted);">${course.section || 'No section'}</p>
            </div>
            <div id="courseDetailsContent" style="padding: 32px;">
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    Loading course details...
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Attach close button event listener
    document.getElementById('closeModalBtn').addEventListener('click', () => modal.remove());

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Load coursework and materials
    await loadCourseDetails(course.id);
}

async function loadCourseDetails(courseId) {
    const content = document.getElementById('courseDetailsContent');

    try {
        // Fetch assignments, materials, and announcements from Google Classroom API
        const [assignmentsRes, materialsRes, announcementsRes] = await Promise.all([
            fetch(`/api/google-classroom/courses/${courseId}/assignments`, {
                credentials: 'include'
            }),
            fetch(`/api/google-classroom/courses/${courseId}/materials`, {
                credentials: 'include'
            }),
            fetch(`/api/google-classroom/courses/${courseId}/announcements`, {
                credentials: 'include'
            })
        ]);

        const assignmentsData = await assignmentsRes.json();
        const materialsData = await materialsRes.json();
        const announcementsData = await announcementsRes.json();

        const assignments = assignmentsData.assignments || [];
        const materials = materialsData.materials || [];
        const announcements = announcementsData.announcements || [];

        content.innerHTML = `
            <div style="display: grid; gap: 32px;">
                <div>
                    <h3 style="margin: 0 0 16px; font-size: 18px;">📢 Announcements (${announcements.length})</h3>
                    ${announcements.length > 0 ? `
                        <div style="display: grid; gap: 12px;">
                            ${announcements.map(announcement => `
                                <div style="padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                        <h4 style="margin: 0; font-size: 16px;">${escapeHtml(announcement.text || 'Announcement')}</h4>
                                        ${announcement.creationTime ? `<span style="font-size: 13px; color: var(--text-muted);">${formatDateTime(announcement.creationTime)}</span>` : ''}
                                    </div>
                                    ${announcement.materials && announcement.materials.length > 0 ? `
                                        <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
                                            ${announcement.materials.map((m) => {
            if (m.driveFile) {
                const link = m.driveFile.alternateLink || m.driveFile.driveFile?.alternateLink || '#';
                const title = m.driveFile.title || m.driveFile.driveFile?.title || 'View File';
                return `<a href="${link}" target="_blank" style="background: rgba(15,98,254,0.1); color: #0f62fe; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">📄 ${escapeHtml(title)}</a>`;
            } else if (m.link) {
                return `<a href="${m.link.url}" target="_blank" style="background: rgba(15,98,254,0.1); color: #0f62fe; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">🔗 ${escapeHtml(m.link.title || 'View Link')}</a>`;
            }
            return '';
        }).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px;">No announcements yet</p>'}
                </div>

                <div>
                    <h3 style="margin: 0 0 16px; font-size: 18px;">📝 Assignments (${assignments.length})</h3>
                    ${assignments.length > 0 ? `
                        <div style="display: grid; gap: 12px;">
                            ${assignments.map(work => `
                                <div style="padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                        <h4 style="margin: 0; font-size: 16px;">${escapeHtml(work.title)}</h4>
                                        ${work.dueDate ? `<span style="font-size: 13px; color: #ff9500; background: rgba(255,149,0,0.1); padding: 4px 12px; border-radius: 999px;">Due: ${formatDate(work.dueDate)}</span>` : ''}
                                    </div>
                                    ${work.description ? `<p style="margin: 8px 0 0; color: var(--text-muted); font-size: 14px;">${escapeHtml(work.description)}</p>` : ''}
                                    <div style="margin-top: 12px; display: flex; gap: 12px;">
                                        <button class="view-assignment-btn" data-course-id="${courseId}" data-assignment-id="${work.id}" style="background: #0f62fe; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;">
                                            View Assignment
                                        </button>
                                        ${work.maxPoints ? `<span style="color: var(--text-muted); font-size: 13px; align-self: center;">Points: ${work.maxPoints}</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px;">No assignments yet</p>'}
                </div>

                <div>
                    <h3 style="margin: 0 0 16px; font-size: 18px;">📚 Materials (${materials.length})</h3>
                    ${materials.length > 0 ? `
                        <div style="display: grid; gap: 12px;">
                            ${materials.map(material => `
                                <div style="padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                                    <h4 style="margin: 0 0 8px; font-size: 16px;">${escapeHtml(material.title)}</h4>
                                    ${material.description ? `<p style="margin: 0 0 12px; color: var(--text-muted); font-size: 14px;">${escapeHtml(material.description)}</p>` : ''}
                                    ${material.materials && material.materials.length > 0 ? `
                                        <div style="display: flex; flex-wrap: gap; gap: 8px;">
                                            ${material.materials.map((m, idx) => {
            console.log(`Material ${material.title} - File ${idx}:`, m);
            if (m.driveFile) {
                // Try multiple possible structures
                const link = m.driveFile.alternateLink ||
                    m.driveFile.driveFile?.alternateLink ||
                    m.driveFile.shareableLink ||
                    m.alternateLink ||
                    '#';
                const title = m.driveFile.title || m.driveFile.driveFile?.title || 'View File';
                console.log('Drive file link:', link, 'title:', title);
                return `<a href="${link}" target="_blank" style="background: rgba(15,98,254,0.1); color: #0f62fe; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">📄 ${escapeHtml(title)}</a>`;
            } else if (m.link) {
                return `<a href="${m.link.url}" target="_blank" style="background: rgba(15,98,254,0.1); color: #0f62fe; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">🔗 ${escapeHtml(m.link.title || 'View Link')}</a>`;
            }
            return '';
        }).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px;">No materials yet</p>'}
                </div>
            </div>
        `;

        // Add event listeners to View Assignment buttons
        setTimeout(() => {
            document.querySelectorAll('.view-assignment-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    // Use closest to ensure we get the button, not child elements
                    const button = e.target.closest('.view-assignment-btn');
                    const courseId = button.dataset.courseId;
                    const assignmentId = button.dataset.assignmentId;
                    console.log('Button clicked:', { courseId, assignmentId });
                    viewAssignmentInApp(courseId, assignmentId);
                });
            });
        }, 100);

    } catch (error) {
        console.error('Error loading course details:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff3b30;">
                <p>Failed to load course details</p>
            </div>
        `;
    }
}

// View assignment in-app (instead of redirecting to Google Classroom)
function viewAssignmentInApp(courseId, assignmentId) {
    // Store assignment info and navigate to assignment page
    sessionStorage.setItem('currentCourseId', courseId);
    sessionStorage.setItem('currentAssignmentId', assignmentId);
    window.location.href = 'student-assignment.html';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateObj) {
    if (!dateObj) return '';
    const { year, month, day } = dateObj;
    return `${month}/${day}/${year}`;
}

function formatDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

function showError(message) {
    const container = document.getElementById('panelGrid');
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #ff3b30;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <p>${message}</p>
        </div>
    `;
}

// Initialize on page load
init();
