// ═══════════════════════════════════════════════════════════
// MINDWAVE — faculty-profile.js
// Matches admin.html shell. Real-time MongoDB data.
// Role detection mirrors server.js + admin-login.html exactly.
// ═══════════════════════════════════════════════════════════

const API = window.location.origin + '/api';

const FACULTY_REGEX = /^[a-z][a-z._-]*@cmrit\.ac\.in$/i;
const HOD_REGEX     = /^hod\.([a-z]+)@cmrit\.ac\.in$/i;

function detectRole(email) {
    return HOD_REGEX.test(email || '') ? 'hod' : 'faculty';
}
function extractHODDept(email) {
    const m = (email || '').match(HOD_REGEX);
    return m ? m[1].toUpperCase() : null;
}

const DEPT_LABELS = {
    MCA:'MCA — Master of Computer Applications',
    CSE:'CSE — Computer Science & Engineering',
    ECE:'ECE — Electronics & Communication',
    ISE:'ISE — Information Science & Engineering',
    AIML:'AIML — AI & Machine Learning',
    MECH:'MECH — Mechanical Engineering',
    CIVIL:'CIVIL — Civil Engineering',
    EEE:'EEE — Electrical & Electronics',
    BCA:'BCA — Bachelor of Computer Applications',
    MBA:'MBA — Master of Business Administration'
};
const deptLabel = k => DEPT_LABELS[(k||'').toUpperCase()] || k || '—';

// ── STATE ──
let _role = 'faculty';
let _hodDept = null;
let _refreshTimer = null;

// ── AUTH ──
const tok = () => localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
const authH = (json=true) => {
    const h = { 'Authorization': `Bearer ${tok()}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
};

// ── THEME TOGGLE ──
function initTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const cur  = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('admin-theme', next);
    });
}

// ── TABS ──
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

// ── LOGOUT ──
function initLogout() {
    ['logoutBtn','ddLogout'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', e => {
            e.preventDefault();
            if (window.performLogout) performLogout();
            else { localStorage.clear(); window.location.href = 'marketing-site/admin-login.html'; }
        });
    });
    // Topbar profile dropdown
    document.getElementById('profileToggle')?.addEventListener('click', () => {
        document.getElementById('profileDropdown')?.classList.toggle('open');
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.profile-wrap')) {
            document.getElementById('profileDropdown')?.classList.remove('open');
        }
    });
}

// ── SWITCHES ──
function initSwitches() {
    document.querySelectorAll('.sw').forEach(sw => sw.addEventListener('click', () => sw.classList.toggle('on')));
}

// ── AVATAR UPLOAD ──
function initAvatarUpload() {
    const inp        = document.getElementById('profilePhotoInput');
    const camBadge   = document.getElementById('camBadge');
    const uploadBtn  = document.getElementById('uploadPhotoBtn');

    [camBadge, uploadBtn].forEach(el => el?.addEventListener('click', () => inp?.click()));

    inp?.addEventListener('change', async () => {
        const file = inp.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return showToast('File too large (max 2MB)', 'error');

        const reader = new FileReader();
        reader.onload = async e => {
            const src = e.target.result;
            setAvatarSrc(src);
            try {
                const res = await fetch(`${API}/faculty/profile/photo`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${tok()}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ photoData: src })
                });
                
                if (res.ok) {
                    showToast('Photo saved to database!', 'success');
                    if (typeof window.syncAdminProfileName === 'function') {
                        window.syncAdminProfileName();
                    }
                } else {
                    showToast('Failed to save to database', 'warn');
                }
            } catch (err) {
                console.error(err);
                showToast('Network error, saved locally only', 'warn');
            }
        };
        reader.readAsDataURL(file);
    });
}

function setAvatarSrc(src) {
    const hero = document.getElementById('heroAv');
    const sm   = document.getElementById('settingsAv');
    if (hero) hero.innerHTML = `<img src="${src}" alt="Photo" style="width:100%;height:100%;object-fit:cover;">`;
    if (sm)   sm.innerHTML   = `<img src="${src}" alt="Photo" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`;
}

// ── ROLE UI ──
function applyRoleUI(role, email, dept) {
    _role    = role;
    _hodDept = dept;
    const isHOD = role === 'hod';

    // Sidebar tag
    setText('sideLogoTag',  isHOD ? 'HOD' : 'Admin');
    // Breadcrumb
    setText('breadSub',     isHOD ? 'HOD Dashboard' : 'My Profile');
    // Page head
    setText('pageTitle',    isHOD ? 'HOD Dashboard' : 'My Profile');
    setText('pageSub',      isHOD ? `Head of Department · ${deptLabel(dept)}` : 'Manage your account and statistics');
    // Role pill
    const pill = document.getElementById('rolePill');
    const pillTxt = document.getElementById('rolePillTxt');
    if (pill) pill.className = `role-pill ${isHOD ? 'hod' : 'faculty'}`;
    if (pillTxt) pillTxt.textContent = isHOD ? 'Head of Department' : 'Faculty Member';
    // Sidebar role text
    setText('sideRole', isHOD ? 'Head of Department' : 'Faculty');
    // Sidebar students link text for HOD
    if (isHOD) {
        const sl = document.getElementById('sideStudentsLink');
        if (sl) sl.innerHTML = '<i data-lucide="users-2"></i> Department';
        const ql = document.getElementById('studentsQLink');
        if (ql) { ql.innerHTML = '<i data-lucide="users-2"></i> Manage Faculty'; ql.href = 'admin-students.html'; }
    }
    // Stats cards
    if (isHOD) {
        el('facStatsCard')?.style && (el('facStatsCard').style.display = 'none');
        el('hodStatsCard')?.style && (el('hodStatsCard').style.display = '');
        el('hodOverviewPanel')?.style && (el('hodOverviewPanel').style.display = '');
        el('tabDeptBtn')?.style  && (el('tabDeptBtn').style.display = '');
        setText('hodDeptLabel', deptLabel(dept));
    }
    // Dept tag in hero
    if (dept) {
        const dt = document.getElementById('deptTag');
        if (dt) {
            dt.style.display = '';
            dt.className = `tag ${isHOD ? 'teal' : 'orange'}`;
            setText('deptTagTxt', deptLabel(dept));
        }
    }
    // Settings dept field
    if (isHOD) {
        el('deptSelWrap')?.style && (el('deptSelWrap').style.display = 'none');
        el('deptROWrap')?.style  && (el('deptROWrap').style.display = '');
        const roi = document.getElementById('deptROInput');
        if (roi) roi.value = deptLabel(dept);
        // HOD bypasses the sections requirement — hide those fields entirely
        el('sectionsTaughtWrap')?.style && (el('sectionsTaughtWrap').style.display = 'none');
        el('profileIncompleteWarn')?.style && (el('profileIncompleteWarn').style.display = 'none');
    }

    if (window.lucide) lucide.createIcons();
}

// ── LOAD PROFILE ──
async function loadProfile() {
    try {
        if (!tok()) { window.location.href = 'marketing-site/admin-login.html'; return; }
        const res = await fetch(`${API}/faculty/profile`, { headers: authH() });
        if (res.status === 401) { window.location.href = 'marketing-site/admin-login.html'; return; }
        if (!res.ok) throw new Error('Profile fetch failed');
        renderProfile(await res.json());
    } catch (err) {
        console.warn('Profile API error, falling back to localStorage:', err.message);
        renderProfile({
            email: localStorage.getItem('email') || localStorage.getItem('userEmail') || '',
            name:  localStorage.getItem('name')  || localStorage.getItem('userName')  || 'Faculty Member'
        });
    }
}

function renderProfile(data) {
    const email    = data.email || '';
    const name     = data.displayName || data.name || 'Faculty Member';
    const role     = detectRole(email);
    const rawDept  = extractHODDept(email) || (data.department || '').toUpperCase();

    if (!document.documentElement.dataset.roleSet) {
        applyRoleUI(role, email, rawDept);
        document.documentElement.dataset.roleSet = '1';
    }

    // Hero
    const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || 'FA';
    setText('heroName',  name);
    setText('heroEmail', email);
    // Initials or photo
    const heroAv  = document.getElementById('heroAv');
    const settAv  = document.getElementById('settingsAv');
    if (heroAv && !heroAv.querySelector('img')) setText('heroInit', initials);
    if (settAv && !settAv.querySelector('img')) settAv.textContent = initials;
    if (data.photoUrl) setAvatarSrc(data.photoUrl);
    // Sidebar avatar
    setText('sideAv', initials.slice(0,2));
    setText('topAv',  initials.slice(0,2));
    setText('topName', name.split(' ')[0]);
    setText('sideName', name);
    // Avatar profile toggle
    const profileAv = document.getElementById('topAv'); // already set above

    // Last active chip
    if (data.lastActive) {
        const tag = document.getElementById('lastActiveTag');
        if (tag) {
            tag.style.display = '';
            setText('lastActiveTxt', 'Active ' + formatTime(data.lastActive));
        }
    }

    // Stats — faculty
    if (role === 'faculty') {
        setText('sFacClasses',  data.totalClasses  ?? 0);
        setText('sFacStudents', data.totalStudents ?? 0);
        setText('sFacGames',    data.gamesCreated  ?? 0);
    } else {
        // HOD: repurpose totalClasses = faculty count (from /api/faculty/department-faculty count)
        setText('sHodFac',   data.deptFacultyCount ?? data.totalClasses ?? '—');
        setText('sHodStu',   data.deptStudentCount ?? data.totalStudents ?? '—');
        const eng = data.avgEngagement;
        setText('sHodEng',   eng != null ? `${eng}%` : '—');
        setText('sHodGames', data.gamesCreated ?? 0);
        setText('deptEngPct', eng != null ? `${eng}%` : '—');
        setBar('deptEngBar', eng ?? 0);
    }

    // Performance bars
    const eng = data.avgEngagement  ?? 0;
    const cmp = data.completionRate ?? 0;
    setText('engPct', `${eng}%`);
    setText('cmpPct', `${cmp}%`);
    setBar('engBar', eng);
    setBar('cmpBar', cmp);

    // HOD ratio
    const ratio = (data.totalStudents && data.totalClasses && _role === 'hod')
        ? `${Math.round(data.totalStudents / Math.max(1, data.totalClasses))}:1` : '—';
    setText('stRatio', ratio);

    // About
    const dl = deptLabel(rawDept);
    setText('aboutDept',   dl);
    setText('aboutOffice', data.officeHours || 'Not set');
    setText('aboutBio',    data.bio         || 'No bio added yet.');

    // Settings form
    setInput('displayName',  name);
    setInput('emailInput',   email);
    setInput('officeHours',  data.officeHours || '');
    setInput('bioInput',     data.bio         || '');
    if (role === 'faculty') {
        const s = document.getElementById('departmentSelect');
        if (s) s.value = rawDept;

        // Pre-check saved sections
        const savedSections = Array.isArray(data.facultySections) ? data.facultySections : [];
        document.querySelectorAll('.sec-chk').forEach(chk => {
            chk.checked = savedSections.includes(chk.value);
        });

        // Show/hide incomplete-profile warning
        const isIncomplete = !rawDept || savedSections.length === 0;
        const warn = document.getElementById('profileIncompleteWarn');
        if (warn) warn.style.display = isIncomplete ? 'flex' : 'none';
    }

    if (window.lucide) lucide.createIcons();
}

// ── LOAD CLASSES ──
async function loadClasses() {
    const grid = document.getElementById('classesGrid');
    if (!grid) return;
    try {
        const res  = await fetch(`${API}/faculty/classes`, { headers: authH() });
        if (!res.ok) throw new Error('classes');
        const data = await res.json();
        const arr  = Array.isArray(data) ? data : (data.classes || []);
        renderClasses(arr, grid);
    } catch (_) {
        renderClasses([], grid);
    }
}

function renderClasses(arr, grid) {
    if (!arr.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="book-x"></i><p>No classes registered yet.</p></div>`;
        lucide?.createIcons(); return;
    }
    grid.innerHTML = arr.map(c => `
        <div class="class-card">
            <div class="class-card-top">
                <div class="class-ic"><i data-lucide="book-open"></i></div>
                <div>
                    <div class="class-name">${c.displayName || c.name || c.id || 'Class'}</div>
                    <div class="class-code">${c.id || c.code || ''}</div>
                </div>
            </div>
            <div class="class-foot">
                <span class="class-stat"><i data-lucide="users"></i> ${c.studentCount ?? '—'}</span>
                <span class="class-stat"><i data-lucide="gamepad-2"></i> ${c.gameCount ?? '—'}</span>
            </div>
        </div>`).join('');
    lucide?.createIcons();
}

// ── LOAD ACTIVITY ──
async function loadActivity() {
    const list = document.getElementById('activityList');
    if (!list) return;
    try {
        const res  = await fetch(`${API}/faculty/activity`, { headers: authH() });
        if (!res.ok) throw new Error('activity');
        const data = await res.json();
        renderActivity(Array.isArray(data) ? data : [], list);
    } catch (_) {
        renderActivity([], list);
    }
}

function renderActivity(items, list) {
    if (!items.length) {
        list.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><p>No recent activity.</p></div>`;
        lucide?.createIcons(); return;
    }
    list.innerHTML = items.map(it => `
        <div class="list-item">
            <div class="p-icon">${it.icon || '📝'}</div>
            <div class="p-body">
                <h4>${it.title || 'Action'}</h4>
                <p>${it.description || ''}</p>
                <div class="p-meta">${formatTime(it.timestamp)}</div>
            </div>
        </div>`).join('');
}

// ── LOAD DEPT FACULTY (HOD) ──
async function loadDeptFaculty() {
    if (_role !== 'hod') return;
    const targets = ['deptFacList', 'deptFacFull'];
    try {
        const res = await fetch(`${API}/faculty/department-faculty`, { headers: authH() });
        if (!res.ok) throw new Error(`dept-faculty ${res.status}`);
        const data    = await res.json();
        const faculty = Array.isArray(data) ? data : (data.faculty || []);
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) renderDeptFaculty(faculty, el);
        });
    } catch (err) {
        console.warn('department-faculty not available:', err.message);
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><p>Department faculty data unavailable.</p></div>`;
        });
        lucide?.createIcons();
    }
}

function renderDeptFaculty(faculty, container) {
    if (!faculty.length) {
        container.innerHTML = `<div class="empty-state"><i data-lucide="users-x"></i><p>No faculty in your department yet.</p></div>`;
        lucide?.createIcons(); return;
    }
    container.innerHTML = faculty.map(f => {
        const init = (f.name||'F').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        return `<div class="f-row">
            <div class="f-av">${init}</div>
            <div class="f-info"><h4>${f.name||'Unknown'}</h4><p>${f.email||''}</p></div>
            <span class="f-badge">${f.totalClasses||0} Classes</span>
        </div>`;
    }).join('');
}

// ── SAVE ──
function initSave() {
    // Mark unsaved
    ['displayName','officeHours','bioInput','departmentSelect'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const s = document.getElementById('saveStatus');
            if (s) { s.textContent = 'Unsaved changes…'; s.className = 'save-status unsaved'; }
        });
    });

    // Save button
    document.getElementById('saveBtn')?.addEventListener('click', async () => {
        const saveBtn = document.getElementById('saveBtn');
        const dept = _role === 'hod' ? _hodDept : (document.getElementById('departmentSelect')?.value || '');

        // Collect selected sections (faculty only)
        const facultySections = _role === 'faculty'
            ? [...document.querySelectorAll('.sec-chk:checked')].map(c => c.value)
            : undefined;

        // Validate for faculty
        if (_role === 'faculty') {
            if (!dept) return showToast('Please select a Department', 'error');
            if (!facultySections || facultySections.length === 0) return showToast('Please select at least one Section', 'error');
        }

        const payload = {
            displayName: document.getElementById('displayName')?.value  || '',
            department:  dept,
            bio:         document.getElementById('bioInput')?.value     || '',
            officeHours: document.getElementById('officeHours')?.value  || '',
            ...(facultySections !== undefined && { facultySections })
        };

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

        try {
            const res = await fetch(`${API}/faculty/profile`, {
                method: 'PUT',
                headers: authH(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Save failed');

            setText('aboutDept',   deptLabel(payload.department));
            setText('aboutOffice', payload.officeHours || 'Not set');
            setText('aboutBio',    payload.bio         || 'No bio added yet.');

            // Update the incomplete warning after saving
            if (_role === 'faculty') {
                const isIncomplete = !payload.department || !payload.facultySections || payload.facultySections.length === 0;
                const warn = document.getElementById('profileIncompleteWarn');
                if (warn) warn.style.display = isIncomplete ? 'flex' : 'none';
            }

            // Sync the immediate UI globally using the new MongoDB sync function
            if (typeof window.syncAdminProfileName === 'function') {
                await window.syncAdminProfileName();
            }

            const s = document.getElementById('saveStatus');
            if (s) { s.textContent = 'All changes saved ✓'; s.className = 'save-status saved'; }
            showToast('Profile updated!', 'success');
        } catch (err) {
            showToast('Failed to save — check connection', 'error');
            const s = document.getElementById('saveStatus');
            if (s) { s.textContent = 'Save failed'; s.className = 'save-status'; }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save"></i> Save Changes';
            lucide?.createIcons();
        }
    });

    // Password
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const old  = document.getElementById('currentPassword')?.value || '';
        const nw   = document.getElementById('newPassword')?.value     || '';
        const conf = document.getElementById('confirmPassword')?.value || '';
        if (!old || !nw)  return showToast('Fill all password fields', 'error');
        if (nw !== conf)  return showToast('Passwords do not match', 'error');
        if (nw.length < 6) return showToast('Min 6 characters', 'error');
        try {
            const res = await fetch(`${API}/faculty/change-password`, {
                method: 'POST', headers: authH(),
                body: JSON.stringify({ currentPassword: old, newPassword: nw })
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.message || 'Failed');
            ['currentPassword','newPassword','confirmPassword'].forEach(id => {
                const e = document.getElementById(id); if (e) e.value = '';
            });
            showToast('Password changed!', 'success');
        } catch (err) {
            showToast(err.message || 'Update failed', 'error');
        }
    });
}

// ── AUTO-REFRESH (30s) ──
function startAutoRefresh() {
    clearInterval(_refreshTimer);
    _refreshTimer = setInterval(async () => {
        await loadProfile();
        await loadClasses();
        await loadActivity();
        if (_role === 'hod') await loadDeptFaculty();
    }, 30_000);
}

// ── HELPERS ──
function el(id) { return document.getElementById(id); }
function setText(id, val) { const e=document.getElementById(id); if(e) e.textContent=String(val??''); }
function setInput(id, val) { const e=document.getElementById(id); if(e) e.value=val??''; }
function setBar(id, pct) {
    const e = document.getElementById(id);
    if (e) setTimeout(() => { e.style.width = Math.min(100, Math.max(0, +pct||0)) + '%'; }, 350);
}
function formatTime(ts) {
    if (!ts) return 'recently';
    const d = (Date.now() - new Date(ts)) / 1000;
    if (d < 60)    return 'just now';
    if (d < 3600)  return `${Math.floor(d/60)}m ago`;
    if (d < 86400) return `${Math.floor(d/3600)}h ago`;
    return new Date(ts).toLocaleDateString();
}
function showToast(msg, type='success') {
    document.querySelectorAll('.mw-toast').forEach(t=>t.remove());
    const t = document.createElement('div');
    t.className = `mw-toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    initTheme();
    initTabs();
    initLogout();
    initSwitches();
    initAvatarUpload();
    initSave();

    await loadProfile();
    await loadClasses();
    await loadActivity();
    if (_role === 'hod') await loadDeptFaculty();
    startAutoRefresh();
});
