// ═══════════════════════════════════════════════════════════
// MINDWAVE — FACULTY PROFILE JS
// Real-time MongoDB data | Role: Faculty / HOD
// Email patterns (same as admin-login.html + server.js):
//   Faculty → name.initial@cmrit.ac.in
//   HOD     → hod.dept@cmrit.ac.in
// ═══════════════════════════════════════════════════════════

const API = window.location.origin + '/api';

// ── REGEX (mirrors server.js exactly) ────────────────────────────
const FACULTY_REGEX = /^[a-z]+\.[a-z]@cmrit\.ac\.in$/i;
const HOD_REGEX     = /^hod\.([a-z]+)@cmrit\.ac\.in$/i;

function detectRole(email) {
    if (!email) return 'faculty';
    return HOD_REGEX.test(email) ? 'hod' : 'faculty';
}

function extractHODDept(email) {
    const m = (email || '').match(HOD_REGEX);
    return m ? m[1].toUpperCase() : null;
}

const DEPT_LABELS = {
    MCA: 'MCA — Master of Computer Applications',
    CSE: 'CSE — Computer Science & Engineering',
    ECE: 'ECE — Electronics & Communication',
    ISE: 'ISE — Information Science & Engineering',
    AIML: 'AIML — AI & Machine Learning',
    MECH: 'MECH — Mechanical Engineering',
    CIVIL: 'CIVIL — Civil Engineering',
    EEE: 'EEE — Electrical & Electronics',
    BCA: 'BCA — Bachelor of Computer Applications',
    MBA: 'MBA — Master of Business Administration',
};
const DEPT_LABEL = (key) => DEPT_LABELS[(key || '').toUpperCase()] || key || '—';

// ── STATE ─────────────────────────────────────────────────────────
let _role = 'faculty';
let _hodDept = null;
let _refreshInterval = null;

// ── AUTH TOKEN ───────────────────────────────────────────────────
function token() {
    return localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
}

function authHeaders() {
    return { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' };
}

// ── TABS ─────────────────────────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const el = document.getElementById(btn.dataset.tab);
            if (el) el.classList.add('active');
        });
    });
}

// ── LOGOUT ───────────────────────────────────────────────────────
function initLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) btn.addEventListener('click', e => {
        e.preventDefault();
        if (window.performLogout) performLogout();
        else { localStorage.clear(); window.location.href = 'marketing-site/admin-login.html'; }
    });
}

// ── SWITCHES ─────────────────────────────────────────────────────
function initSwitches() {
    document.querySelectorAll('.switch').forEach(sw => {
        sw.addEventListener('click', () => sw.classList.toggle('on'));
    });
}

// ── AVATAR UPLOAD ────────────────────────────────────────────────
function initAvatarUpload() {
    const input      = document.getElementById('profilePhotoInput');
    const camBadge   = document.getElementById('camBadge');
    const uploadBtn  = document.getElementById('uploadPhotoBtn');

    [camBadge, uploadBtn].forEach(el => el?.addEventListener('click', () => input?.click()));

    input?.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return showToast('File too large (max 2MB)', 'error');

        const reader = new FileReader();
        reader.onload = async e => {
            const src = e.target.result;
            // Update hero avatar
            const heroAv = document.getElementById('heroAvatar');
            const smPrev = document.getElementById('settingsAvatarPreview');
            if (heroAv) heroAv.innerHTML = `<img src="${src}" alt="Photo">`;
            if (smPrev) smPrev.innerHTML = `<img src="${src}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`;

            // Upload to server
            try {
                const fd = new FormData();
                fd.append('photo', file);
                const res = await fetch(`${API}/faculty/profile/photo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token()}` },
                    body: fd
                });
                if (res.ok) showToast('Photo updated!', 'success');
                else showToast('Photo saved locally only', 'warn');
            } catch (_) {
                showToast('Upload skipped — saved locally', 'warn');
            }
        };
        reader.readAsDataURL(file);
    });
}

// ── ROLE UI SETUP ────────────────────────────────────────────────
function applyRoleUI(role, email, dept) {
    _role    = role;
    _hodDept = dept;
    const isHOD = role === 'hod';

    // Portal label & breadcrumb
    setText('portalLabel', isHOD ? 'HOD Profile' : 'Faculty Profile');
    setText('breadcrumbRole', isHOD ? 'HOD Dashboard' : 'Faculty Profile');
    setText('pageTitle', isHOD ? 'HOD Dashboard' : 'My Profile');
    setText('pageSub', isHOD
        ? `Head of Department · ${DEPT_LABEL(dept)}`
        : 'Manage your account and view your teaching statistics');

    // Role badge
    const badge     = document.getElementById('roleBadge');
    const badgeTxt  = document.getElementById('roleBadgeText');
    if (badge) badge.className = `role-badge ${isHOD ? 'hod' : 'faculty'}`;
    if (badgeTxt) badgeTxt.textContent = isHOD ? 'Head of Department' : 'Faculty Member';

    // Hero card glow
    const heroCard = document.getElementById('heroCard');
    if (heroCard && isHOD) heroCard.classList.add('hod-hero');

    // Hero dept pill
    const deptPill = document.getElementById('heroDeptPill');
    const deptTxt  = document.getElementById('heroDeptText');
    if (deptPill && dept) {
        deptPill.style.display = '';
        deptPill.className = `dept-pill ${isHOD ? 'hod' : 'fac'}`;
        if (deptTxt) deptTxt.textContent = DEPT_LABEL(dept);
    }

    // Hero avatar colour
    const heroAv = document.getElementById('heroAvatar');
    if (heroAv && isHOD) heroAv.classList.add('hod-av');

    // Settings avatar colour
    const smPrev = document.getElementById('settingsAvatarPreview');
    if (smPrev && isHOD) smPrev.classList.add('hod-av');

    // Stats strips
    const facCard = document.getElementById('facultyStatsCard');
    const hodCard = document.getElementById('hodStatsCard');
    if (isHOD) {
        if (facCard) facCard.style.display = 'none';
        if (hodCard) hodCard.style.display = '';
        // Show HOD overview panels
        const hodOv = document.getElementById('hodOverview');
        if (hodOv) hodOv.style.display = '';
        // Show department tab
        const tabDept = document.getElementById('tabDept');
        if (tabDept) tabDept.style.display = '';
        // Dept label in dept tab
        setText('hodDeptLabel', DEPT_LABEL(dept));
    }

    // Department field in settings
    const selWrap = document.getElementById('deptSelectWrap');
    const roWrap  = document.getElementById('deptReadOnlyWrap');
    const roInput = document.getElementById('deptReadOnly');
    if (isHOD) {
        if (selWrap) selWrap.style.display = 'none';
        if (roWrap)  roWrap.style.display  = '';
        if (roInput) roInput.value = DEPT_LABEL(dept);
    }

    // HOD quick links
    const studLink = document.getElementById('studentsLink');
    if (studLink && isHOD) {
        studLink.innerHTML = '<i data-lucide="users-2"></i> Manage Faculty';
        studLink.href = 'admin-students.html';
    }

    // Active tab colour for HOD
    if (isHOD) {
        document.querySelectorAll('.tab-btn.active').forEach(t => t.classList.add('hod-tab'));
    }

    if (window.lucide) lucide.createIcons();
}

// ── LOAD PROFILE (real MongoDB) ──────────────────────────────────
async function loadProfile() {
    try {
        const t = token();
        if (!t) { window.location.href = 'marketing-site/admin-login.html'; return; }

        const res  = await fetch(`${API}/faculty/profile`, {
            headers: { 'Authorization': `Bearer ${t}` }
        });

        if (res.status === 401) { window.location.href = 'marketing-site/admin-login.html'; return; }
        if (!res.ok) throw new Error('Profile fetch failed');

        const data = await res.json();
        renderProfile(data);
    } catch (err) {
        console.warn('Profile API error, using localStorage fallback:', err.message);
        renderProfile({
            email: localStorage.getItem('email') || localStorage.getItem('userEmail') || '',
            name:  localStorage.getItem('name')  || localStorage.getItem('userName')  || 'Faculty Member'
        });
    }
}

function renderProfile(data) {
    const email = data.email || '';
    const name  = data.name  || data.displayName || 'Faculty Member';
    const role  = detectRole(email);
    const dept  = extractHODDept(email) || (data.department || '').toUpperCase() || '';

    // Apply role-specific UI (only once)
    if (!document.documentElement.dataset.roleApplied) {
        applyRoleUI(role, email, dept);
        document.documentElement.dataset.roleApplied = '1';
    }

    // Hero
    setText('heroName',  name);
    setText('heroEmail', email);
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'FA';
    const heroAv = document.getElementById('heroAvatar');
    if (heroAv && !heroAv.querySelector('img')) setText('heroInitials', initials);
    const smPrev = document.getElementById('settingsAvatarPreview');
    if (smPrev && !smPrev.querySelector('img')) smPrev.textContent = initials;
    if (data.photoUrl) {
        if (heroAv) heroAv.innerHTML = `<img src="${data.photoUrl}" alt="Photo">`;
        if (smPrev) smPrev.innerHTML = `<img src="${data.photoUrl}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`;
    }

    // Role stats
    if (role === 'faculty') {
        setText('statClasses',  data.totalClasses  ?? 0);
        setText('statStudents', data.totalStudents ?? 0);
        setText('statGames',    data.gamesCreated  ?? 0);
    } else {
        // HOD gets aggregated dept stats
        setText('hodFacCount', data.totalClasses  ?? '—'); // repurposed: faculty in dept
        setText('hodStudCount', data.totalStudents ?? '—');
        setText('hodEngmt',    data.avgEngagement != null ? `${data.avgEngagement}%` : '—');
        setText('hodGames',    data.gamesCreated   ?? 0);
        setText('deptEngPct',  data.avgEngagement != null ? `${data.avgEngagement}%` : '—');
        setBar('deptEngBar', data.avgEngagement ?? 0);
    }

    // Performance bars
    const eng = data.avgEngagement  ?? 0;
    const cmp = data.completionRate ?? 0;
    setText('engPct', `${eng}%`);
    setText('cmpPct', `${cmp}%`);
    setBar('engBar', eng);
    setBar('cmpBar', cmp);

    // HOD ratio
    const ratio = (data.totalClasses && data.totalStudents)
        ? `${Math.round(data.totalStudents / data.totalClasses)}:1`
        : '—';
    setText('stRatio', ratio);

    // About
    const deptKey   = dept || (data.department || '').toUpperCase();
    const deptLabel = DEPT_LABEL(deptKey);
    setText('aboutDept',   deptLabel);
    setText('aboutOffice', data.officeHours || 'Not set');
    setText('aboutBio',    data.bio         || 'No bio added yet.');

    // Form fields
    setInput('displayName',   name);
    setInput('emailInput',    email);
    setInput('officeHours',   data.officeHours || '');
    setInput('bioInput',      data.bio         || '');
    if (role === 'faculty') {
        const sel = document.getElementById('departmentSelect');
        if (sel) sel.value = deptKey;
    }

    // Last-active chip
    if (data.lastActive) {
        const el = document.getElementById('heroLastActive');
        if (el) {
            el.style.display = '';
            setText('heroLastActiveText', 'Active ' + formatTime(data.lastActive));
        }
    }

    if (window.lucide) lucide.createIcons();
}

// ── LOAD CLASSES (real MongoDB) ──────────────────────────────────
async function loadClasses() {
    const container = document.getElementById('classesGrid');
    if (!container) return;

    try {
        const res = await fetch(`${API}/faculty/classes`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) throw new Error('Classes fetch failed');
        const data  = await res.json();
        // API returns { ok, department, classes: [{id, displayName, ...}] }
        const arr   = Array.isArray(data) ? data : (data.classes || []);
        renderClasses(arr, container);
    } catch (err) {
        console.warn('Classes fetch failed:', err.message);
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
            <div class="class-card-top">
                <div class="class-icon"><i data-lucide="book-open"></i></div>
                <div>
                    <div class="class-name">${c.displayName || c.name || c.id || 'Class'}</div>
                    <div class="class-code">${c.id || c.code || ''}</div>
                </div>
            </div>
            <div class="class-footer">
                <span class="class-stat"><i data-lucide="users"></i>${c.studentCount ?? '—'} Students</span>
                <span class="class-stat"><i data-lucide="gamepad-2"></i>${c.gameCount ?? '—'} Games</span>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

// ── LOAD ACTIVITY (real MongoDB) ─────────────────────────────────
async function loadActivity() {
    const container = document.getElementById('activityList');
    if (!container) return;
    try {
        const res = await fetch(`${API}/faculty/activity`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) throw new Error('Activity fetch failed');
        const data = await res.json();
        renderActivity(Array.isArray(data) ? data : [], container);
    } catch (_) {
        renderActivity([], container);
    }
}

function renderActivity(items, container) {
    if (!items.length) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>No recent activity logged.</p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = items.map(item => `
        <div class="pulse-item">
            <div class="p-icon">${item.icon || '📝'}</div>
            <div class="p-body">
                <h4>${item.title || 'System Action'}</h4>
                <p>${item.description || ''}</p>
                <div class="p-meta"><span>${formatTime(item.timestamp)}</span></div>
            </div>
        </div>
    `).join('');
}

// ── LOAD HOD DEPT FACULTY (real MongoDB) ─────────────────────────
async function loadDeptFaculty() {
    if (_role !== 'hod') return;
    const targets = ['deptFacultyList', 'deptFacultyFull'];
    try {
        const res = await fetch(`${API}/faculty/department-faculty`, {
            headers: { 'Authorization': `Bearer ${token()}` }
        });
        if (!res.ok) throw new Error('Dept faculty fetch failed');
        const data    = await res.json();
        const faculty = Array.isArray(data) ? data : (data.faculty || []);
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) renderDeptFaculty(faculty, el);
        });
    } catch (_) {
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="empty-state"><i data-lucide="users-x"></i><p>Could not load department faculty.</p></div>`;
        });
    }
}

function renderDeptFaculty(faculty, container) {
    if (!faculty.length) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="users-x"></i><p>No faculty found in your department.</p></div>`;
        if (window.lucide) lucide.createIcons();
        return;
    }
    container.innerHTML = faculty.map(f => {
        const init = (f.name || 'F').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
        return `
            <div class="faculty-row">
                <div class="faculty-av-sm">${init}</div>
                <div class="faculty-row-info">
                    <h4>${f.name  || 'Unknown'}</h4>
                    <p>${f.email || ''}</p>
                </div>
                <span class="fc-badge">${f.totalClasses || 0} Classes</span>
            </div>
        `;
    }).join('');
}

// ── SAVE SETTINGS ────────────────────────────────────────────────
function initSave() {
    // Track unsaved changes
    ['displayName','officeHours','bioInput','departmentSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => {
            const st = document.getElementById('saveStatus');
            if (st) { st.textContent = 'Unsaved changes…'; st.className = 'save-status unsaved'; }
        });
    });

    const saveBtn = document.getElementById('saveBtn');
    saveBtn?.addEventListener('click', async () => {
        const dept = _role === 'hod'
            ? _hodDept
            : (document.getElementById('departmentSelect')?.value || '');

        const payload = {
            displayName: document.getElementById('displayName')?.value  || '',
            department:  dept,
            bio:         document.getElementById('bioInput')?.value     || '',
            officeHours: document.getElementById('officeHours')?.value  || ''
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

        try {
            const res = await fetch(`${API}/faculty/profile`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Save failed');

            localStorage.setItem('userName', payload.displayName);
            localStorage.setItem('name',     payload.displayName);
            // Update about section
            const deptLabel = DEPT_LABEL(payload.department);
            setText('aboutDept',   deptLabel);
            setText('aboutOffice', payload.officeHours || 'Not set');
            setText('aboutBio',    payload.bio         || 'No bio added yet.');
            const dp = document.getElementById('heroDeptText');
            if (dp) dp.textContent = deptLabel;

            const st = document.getElementById('saveStatus');
            if (st) { st.textContent = 'All changes saved ✓'; st.className = 'save-status saved'; }
            showToast('Profile updated!', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to save — check connection', 'error');
            const st = document.getElementById('saveStatus');
            if (st) { st.textContent = 'Save failed'; st.className = 'save-status'; }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i> Save All Changes';
            if (window.lucide) lucide.createIcons();
        }
    });

    // Password change
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const old  = document.getElementById('currentPassword')?.value || '';
        const nw   = document.getElementById('newPassword')?.value     || '';
        const conf = document.getElementById('confirmPassword')?.value || '';
        if (!old || !nw) return showToast('Fill in all password fields', 'error');
        if (nw !== conf)  return showToast('Passwords do not match', 'error');
        if (nw.length < 6) return showToast('Min 6 characters', 'error');

        try {
            const res = await fetch(`${API}/faculty/change-password`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ currentPassword: old, newPassword: nw })
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.message || 'Failed');
            }
            ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            showToast('Password changed!', 'success');
        } catch (err) {
            showToast(err.message || 'Password update failed', 'error');
        }
    });
}

// ── AUTO-REFRESH (every 30 s) ────────────────────────────────────
function startAutoRefresh() {
    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(() => {
        loadProfile();
        loadClasses();
        loadActivity();
        if (_role === 'hod') loadDeptFaculty();
    }, 30_000);
}

// ── HELPERS ──────────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val ?? '');
}

function setInput(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
}

function setBar(id, pct) {
    const el = document.getElementById(id);
    if (el) setTimeout(() => { el.style.width = Math.min(100, Math.max(0, Number(pct))) + '%'; }, 300);
}

function formatTime(ts) {
    if (!ts) return 'recently';
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}

function showToast(msg, type = 'success') {
    document.querySelectorAll('.mw-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = `mw-toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initTabs();
    initLogout();
    initSwitches();
    initAvatarUpload();
    initSave();

    // Load all data
    Promise.all([
        loadProfile(),
        loadClasses(),
        loadActivity()
    ]).then(() => {
        if (_role === 'hod') loadDeptFaculty();
        startAutoRefresh();
    });
});
