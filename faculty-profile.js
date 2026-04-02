// ═══════════════════════════════════════════
// MINDWAVE — FACULTY PROFILE JS
// Supports dual role: Faculty & HOD
// Role detected from email format:
//   Faculty → name.initial@cmrit.ac.in
//   HOD     → hod.dept@cmrit.ac.in
// ═══════════════════════════════════════════

const API_BASE = window.location.origin + '/api';

// ── ROLE DETECTION ──────────────────────────────────────
const FACULTY_REGEX = /^[a-z]+\.[a-z]@cmrit\.ac\.in$/i;
const HOD_REGEX     = /^hod\.([a-z]+)@cmrit\.ac\.in$/i;

function detectRole(email) {
    if (!email) return 'faculty';
    if (HOD_REGEX.test(email)) return 'hod';
    return 'faculty';
}

function extractHODDepartment(email) {
    if (!email) return null;
    const match = email.match(HOD_REGEX);
    if (match) return match[1].toUpperCase(); // e.g. "mca" → "MCA"
    return null;
}

const DEPT_LABELS = {
    MCA:   'MCA — Master of Computer Applications',
    CSE:   'CSE — Computer Science & Engineering',
    ECE:   'ECE — Electronics & Communication',
    ISE:   'ISE — Information Science & Engineering',
    AIML:  'AIML — AI & Machine Learning',
    MECH:  'MECH — Mechanical Engineering',
    CIVIL: 'CIVIL — Civil Engineering',
    EEE:   'EEE — Electrical & Electronics',
    BCA:   'BCA — Bachelor of Computer Applications',
    MBA:   'MBA — Master of Business Administration'
};

// ── GLOBAL STATE ─────────────────────────────────────────
let currentRole = 'faculty';
let currentEmail = '';
let hodDept = null;

// ── TABS ─────────────────────────────────────────────────
function initTabs() {
    const tabBtns     = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetEl = document.getElementById(target);
            if (targetEl) targetEl.classList.add('active');
        });
    });
}

// ── THEME ────────────────────────────────────────────────
function initTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const cur   = document.documentElement.getAttribute('data-theme') || 'light';
        const next  = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('admin-theme', next);
    });
}

// ── LOGOUT ───────────────────────────────────────────────
function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
        btn.addEventListener('click', e => {
            e.preventDefault();
            if (window.performLogout) {
                performLogout();
            } else {
                localStorage.clear();
                window.location.href = 'marketing-site/admin-login.html';
            }
        });
    }
}

// ── SWITCHES (Notification Toggles) ─────────────────────
function initSwitches() {
    document.querySelectorAll('.switch').forEach(sw => {
        sw.addEventListener('click', () => sw.classList.toggle('active'));
    });
}

// ── AVATAR UPLOAD ────────────────────────────────────────
function initAvatarUpload() {
    const hint  = document.getElementById('avatarUploadHint');
    const input = document.getElementById('profilePhotoInput');
    const uploadBtn = document.getElementById('uploadPhotoBtn');

    [hint, uploadBtn].forEach(el => {
        if (el) el.addEventListener('click', () => input && input.click());
    });

    if (input) {
        input.addEventListener('change', async () => {
            const file = input.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                return showToast('File too large — max 2MB', 'error');
            }
            const reader = new FileReader();
            reader.onload = async (e) => {
                const dataUrl = e.target.result;
                // Update UI previews
                updateAvatarImage(dataUrl);
                // Upload to server
                try {
                    const token = localStorage.getItem('token');
                    const formData = new FormData();
                    formData.append('photo', file);
                    const res = await fetch(`${API_BASE}/faculty/profile/photo`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (res.ok) showToast('Photo updated!', 'success');
                } catch (_) {
                    showToast('Could not upload — saved locally only', 'warn');
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

function updateAvatarImage(src) {
    const heroAvatar = document.getElementById('profileAvatar');
    const smPreview  = document.getElementById('settingsAvatarPreview');
    const imgHtml    = `<img src="${src}" alt="Profile Photo" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">`;
    if (heroAvatar) heroAvatar.innerHTML = imgHtml;
    if (smPreview) smPreview.innerHTML = `<img src="${src}" alt="Profile Photo" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
}

// ── ROLE-BASED UI SETUP ──────────────────────────────────
function applyRoleUI(role, email, dept) {
    currentRole  = role;
    currentEmail = email;
    hodDept      = dept;

    const isHOD = role === 'hod';

    // Portal label
    const label = document.getElementById('portalLabel');
    if (label) label.textContent = isHOD ? 'HOD Profile' : 'Faculty Profile';

    // Hero card class
    const heroCard = document.getElementById('heroCard');
    if (heroCard && isHOD) heroCard.classList.add('hod');

    // Role pill
    const pill     = document.getElementById('rolePill');
    const pillText = document.getElementById('rolePillText');
    if (pill && pillText) {
        if (isHOD) {
            pill.className = 'role-pill hod';
            pillText.textContent = 'Head of Department';
        } else {
            pill.className = 'role-pill faculty';
            pillText.textContent = 'Faculty Member';
        }
    }

    // Dept badge in hero
    const heroDeptBadge = document.getElementById('heroDeptBadge');
    const heroDeptText  = document.getElementById('heroDeptText');
    if (isHOD && dept) {
        const fullLabel = DEPT_LABELS[dept] || dept + ' Department';
        if (heroDeptBadge) {
            heroDeptBadge.style.display = '';
            heroDeptBadge.classList.add('hod');
        }
        if (heroDeptText) heroDeptText.textContent = fullLabel;

        // Fill HOD dept label in dept tab
        const hodDeptFull = document.getElementById('hodDeptFull');
        if (hodDeptFull) hodDeptFull.textContent = (DEPT_LABELS[dept] || dept + ' Department');

        // HOD readonly
        const roGroup = document.getElementById('deptReadOnlyGroup');
        const selGroup = document.getElementById('deptSelectGroup');
        const roInput  = document.getElementById('hodDeptReadOnly');
        if (roGroup)  roGroup.style.display = '';
        if (selGroup) selGroup.style.display = 'none';
        if (roInput)  roInput.value = DEPT_LABELS[dept] || dept + ' Department';
    }

    // Stats grids
    const facultyGrid = document.getElementById('facultyStatsGrid');
    const hodGrid     = document.getElementById('hodStatsGrid');
    const hodOverview = document.getElementById('hodOverviewSection');

    if (isHOD) {
        if (facultyGrid) facultyGrid.style.display = 'none';
        if (hodGrid)     hodGrid.style.display     = '';
        if (hodOverview) hodOverview.style.display  = '';
    }

    // HOD-only tabs
    const tabDept = document.getElementById('tabDepartment');
    if (tabDept && isHOD) tabDept.style.display = '';

    // Colour active tab borders
    const activeTabs = document.querySelectorAll('.tab-btn.active');
    activeTabs.forEach(t => { if (isHOD) t.classList.add('hod-mode'); });

    // HOD quick link: manage students
    const msLink = document.getElementById('manageStudentsLink');
    if (msLink && isHOD) {
        msLink.innerHTML = '<i data-lucide="users-2"></i> Manage Faculty';
        msLink.href = 'admin-students.html';
    }

    // HOD avatar gets teal gradient
    const avatar = document.getElementById('profileAvatar');
    if (avatar && isHOD) avatar.classList.add('hod-variant');
    const smPreview = document.getElementById('settingsAvatarPreview');
    if (smPreview && isHOD) smPreview.classList.add('hod-variant');

    // Re-render icons after DOM changes
    if (window.lucide) lucide.createIcons();
}

// ── LOAD PROFILE ─────────────────────────────────────────
async function loadFacultyProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'marketing-site/admin-login.html'; return; }

        const response = await fetch(`${API_BASE}/faculty/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Profile fetch failed');
        const data = await response.json();
        renderProfile(data);
    } catch (err) {
        console.warn('Profile API failed, using local fallback:', err.message);
        // Local localStorage fallback for demo/dev
        const email = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';
        const name  = localStorage.getItem('userName')  || localStorage.getItem('name')  || 'Faculty Member';
        renderProfile({ email, name });
    }
}

function renderProfile(data) {
    const email = data.email || '';
    const name  = data.name || data.displayName || 'Faculty Member';
    const role  = detectRole(email);
    const dept  = extractHODDepartment(email) || data.department || '';

    // Apply role-specific UI changes
    applyRoleUI(role, email, dept.toUpperCase ? dept.toUpperCase() : dept);

    // Hero name + email
    const nameEl  = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl)  nameEl.textContent  = name;
    if (emailEl) emailEl.textContent = email;

    // Initials
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'FA';
    const avatarInit   = document.getElementById('avatarInitials');
    const smPreview    = document.getElementById('settingsAvatarPreview');
    if (avatarInit && !document.getElementById('profileAvatar').querySelector('img')) {
        avatarInit.textContent = initials;
    }
    if (smPreview && !smPreview.querySelector('img')) smPreview.textContent = initials;

    // Photo
    if (data.photoUrl) updateAvatarImage(data.photoUrl);

    // Determine dept label
    let deptKey   = (data.department || dept || '').toUpperCase();
    let deptLabel = DEPT_LABELS[deptKey] || data.department || 'Not set';

    // Stats
    const statMap = {
        totalClasses:   data.totalClasses   || 0,
        totalStudents:  data.totalStudents   || 0,
        gamesCreated:   data.gamesCreated    || 0,
        avgEngagement:  `${data.avgEngagement   || 0}%`,
        completionRate: `${data.completionRate  || 0}%`,
        hodFacultyCount: data.hodFacultyCount   || 0,
        hodStudentCount: data.hodStudentCount   || 0,
        hodEngagement:   data.hodEngagement ? `${data.hodEngagement}%` : '—',
        hodGamesTotal:   data.hodGamesTotal     || 0
    };
    Object.entries(statMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Progress bars
    const engPct  = data.avgEngagement  || 0;
    const cmpPct  = data.completionRate || 0;
    const deptPct = data.hodEngagement  || 0;
    setBar('engagementBar',   engPct);
    setBar('completionBar',   cmpPct);
    setBar('deptEngagementBar', deptPct);

    const deptEngPctEl = document.getElementById('deptEngagementPct');
    if (deptEngPctEl) deptEngPctEl.textContent = `${deptPct}%`;

    // About section
    setText('deptDisplay',       deptLabel);
    setText('officeHoursDisplay', data.officeHours || 'Not set');
    setText('bioDisplay',         data.bio         || 'No bio added yet.');

    // HOD ratio
    const ratio = data.hodFacultyCount
        ? Math.round((data.hodStudentCount || 0) / data.hodFacultyCount) + ':1'
        : '—';
    setText('st_ratio', ratio);

    // Form fields
    const fields = {
        displayName:      name,
        emailInput:       email,
        officeHours:      data.officeHours || '',
        bioInput:         data.bio         || ''
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });

    // Department control
    if (currentRole === 'faculty') {
        const sel = document.getElementById('departmentSelect');
        if (sel) sel.value = deptKey;
    }

    if (window.lucide) lucide.createIcons();
}

function setBar(id, pct) {
    const el = document.getElementById(id);
    if (el) setTimeout(() => { el.style.width = Math.min(100, pct) + '%'; }, 200);
}
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ── LOAD CLASSES ─────────────────────────────────────────
async function loadClasses() {
    const container = document.getElementById('classesGrid');
    if (!container) return;

    try {
        const token   = localStorage.getItem('token');
        const res     = await fetch(`${API_BASE}/faculty/classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Classes fetch failed');
        const classes = await res.json();
        renderClasses(classes, container);
    } catch (_) {
        renderClasses([], container);
    }
}

function renderClasses(classes, container) {
    if (!classes || classes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <i data-lucide="book-x"></i>
                <p>No classes registered yet.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = classes.map(c => `
        <div class="class-card">
            <div class="class-card-header">
                <div class="class-icon"><i data-lucide="book-open"></i></div>
                <div>
                    <div class="class-name">${c.name || 'Untitled Class'}</div>
                    <div class="class-code">${c.code || 'N/A'}</div>
                </div>
            </div>
            <div class="class-stats">
                <span class="class-stat"><i data-lucide="users"></i>${c.studentCount || 0} Students</span>
                <span class="class-stat"><i data-lucide="gamepad-2"></i>${c.gameCount || 0} Games</span>
                <span class="class-stat"><i data-lucide="calendar"></i>${c.semester || 'Sem?'}</span>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// ── LOAD ACTIVITY ────────────────────────────────────────
async function loadActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE}/faculty/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Activity fetch failed');
        const activities = await res.json();
        renderActivity(activities, container);
    } catch (_) {
        renderActivity([], container);
    }
}

function renderActivity(activities, container) {
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No recent activity logged.</p>
            </div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = activities.map(item => `
        <div class="activity-item">
            <div class="activity-dot">${item.icon || '📝'}</div>
            <div class="activity-content">
                <h4>${item.title || 'System Action'}</h4>
                <p>${item.description || ''}</p>
            </div>
            <div class="activity-time">${formatTime(item.timestamp)}</div>
        </div>
    `).join('');
}

// ── LOAD HOD DEPARTMENT FACULTY ───────────────────────────
async function loadDeptFaculty() {
    if (currentRole !== 'hod') return;
    const containers = ['deptFacultyList', 'departmentFacultyListFull'];
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`${API_BASE}/faculty/department-faculty`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Dept faculty fetch failed');
        const faculty = await res.json();
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) renderDeptFaculty(faculty, el);
        });
    } catch (_) {
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="empty-state"><i data-lucide="users-x"></i><p>Could not load department faculty.</p></div>`;
        });
    }
}

function renderDeptFaculty(faculty, container) {
    if (!faculty || faculty.length === 0) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="users-x"></i><p>No faculty found in this department.</p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = faculty.map(f => {
        const initials = (f.name || 'F').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        return `
            <div class="faculty-row">
                <div class="faculty-avatar-sm">${initials}</div>
                <div class="faculty-row-info">
                    <h4>${f.name || 'Unknown'}</h4>
                    <p>${f.email || ''}</p>
                </div>
                <span class="faculty-row-badge">${f.totalClasses || 0} Classes</span>
            </div>
        `;
    }).join('');
}

// ── SAVE SETTINGS ────────────────────────────────────────
function initSave() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const saveStatus = document.getElementById('saveStatus');

    // Track changes
    ['displayName','officeHours','bioInput','departmentSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            if (saveStatus) saveStatus.textContent = 'Unsaved changes…';
        });
    });

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const dept = currentRole === 'hod'
                ? hodDept
                : (document.getElementById('departmentSelect')?.value || '');

            const payload = {
                displayName: document.getElementById('displayName')?.value || '',
                department:  dept,
                bio:         document.getElementById('bioInput')?.value     || '',
                officeHours: document.getElementById('officeHours')?.value  || ''
            };

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i data-lucide="loader-2"></i> Saving…';
            if (window.lucide) lucide.createIcons();

            try {
                const token = localStorage.getItem('token');
                const res   = await fetch(`${API_BASE}/faculty/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Save failed');
                localStorage.setItem('userName', payload.displayName);
                // Sync bio/dept/officeHours in overview
                setText('deptDisplay',        DEPT_LABELS[payload.department] || payload.department || 'Not set');
                setText('officeHoursDisplay', payload.officeHours || 'Not set');
                setText('bioDisplay',         payload.bio         || 'No bio added yet.');
                if (saveStatus) saveStatus.textContent = 'All changes saved ✓';
                showToast('Profile updated!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to save profile', 'error');
                if (saveStatus) saveStatus.textContent = 'Save failed — check connection';
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i data-lucide="save"></i> Save All Changes';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    // Password change
    const passBtn = document.getElementById('changePasswordBtn');
    if (passBtn) {
        passBtn.addEventListener('click', async () => {
            const oldPass  = document.getElementById('currentPassword')?.value  || '';
            const newPass  = document.getElementById('newPassword')?.value       || '';
            const confPass = document.getElementById('confirmPassword')?.value   || '';

            if (!oldPass || !newPass) return showToast('Fill in all password fields', 'error');
            if (newPass !== confPass)  return showToast('Passwords do not match', 'error');
            if (newPass.length < 6)   return showToast('New password must be ≥ 6 chars', 'error');

            passBtn.disabled = true;
            try {
                const token = localStorage.getItem('token');
                const res   = await fetch(`${API_BASE}/faculty/change-password`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ currentPassword: oldPass, newPassword: newPass })
                });
                if (!res.ok) throw new Error('Password change failed');
                ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                showToast('Password changed successfully!', 'success');
            } catch (err) {
                showToast('Password update failed', 'error');
            } finally {
                passBtn.disabled = false;
            }
        });
    }
}

// ── TOAST NOTIFICATION ───────────────────────────────────
function showToast(msg, type = 'success') {
    const existing = document.getElementById('mw-toast');
    if (existing) existing.remove();

    const colors = {
        success: ['var(--green-lo)', 'var(--green)',  'rgba(22,163,74,0.2)'],
        error:   ['var(--red-lo)',   'var(--red)',    'rgba(220,38,38,0.2)'],
        warn:    ['var(--accent-lo)','var(--accent)', 'var(--accent-bdr)']
    };
    const [bg, color, border] = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.id = 'mw-toast';
    toast.style.cssText = `
        position:fixed;bottom:32px;right:32px;z-index:9999;
        padding:12px 20px;border-radius:12px;
        background:${bg};color:${color};border:1px solid ${border};
        font-size:13px;font-weight:700;font-family:'Inter',sans-serif;
        display:flex;align-items:center;gap:8px;
        box-shadow:0 4px 20px rgba(0,0,0,0.12);
        animation:slideInToast .3s cubic-bezier(0.16,1,0.3,1);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);

    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id = 'toast-style';
        s.textContent = `@keyframes slideInToast{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}`;
        document.head.appendChild(s);
    }

    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

// ── TIME FORMATTER ───────────────────────────────────────
function formatTime(ts) {
    if (!ts) return 'Recent';
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initTabs();
    initTheme();
    initLogout();
    initSwitches();
    initAvatarUpload();
    initSave();
    loadFacultyProfile();
    loadClasses();
    loadActivity();
});
