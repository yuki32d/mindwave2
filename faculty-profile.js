const API_BASE = window.location.origin + '/api';

// ── TABS LOGIC ──
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
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

// ── DASHBOARD INTERACTIONS ──
function initDashboard() {
    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('admin-theme', next);
        });
    }

    // Toggle Switches (Email Notifs, etc)
    document.querySelectorAll('.switch').forEach(toggle => {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
        });
    });

    // Logout
    const logoutBtns = ['logoutBtn', 'signOutControl'];
    logoutBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.performLogout) {
                    performLogout();
                } else {
                    localStorage.clear();
                    window.location.href = 'admin-login.html';
                }
            });
        }
    });
}

// ── DATA LOADING ──
async function loadFacultyProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'admin-login.html'; return; }

        const response = await fetch(`${API_BASE}/faculty/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load profile');
        const data = await response.json();
        updateProfileUI(data);
    } catch (error) {
        console.error('Error loading profile:', error);
        // Fallback for demo/dev
        const email = localStorage.getItem('userEmail') || 'faculty@example.com';
        const name = localStorage.getItem('userName') || 'Faculty Member';
        updateProfileUI({ email, name });
    }
}

function updateProfileUI(data) {
    const name = data.name || data.displayName || 'Faculty Member';
    const email = data.email || 'faculty@example.com';
    const role = data.role || 'faculty';

    // Name & Email sync
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;

    // Initials Sync (Profile Hero Avatar)
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarInit = document.getElementById('avatarInitials');
    if (avatarInit) avatarInit.textContent = initials;
    
    const settingsInit = document.getElementById('settingsAvatarPreview');
    if (settingsInit) settingsInit.textContent = initials;

    // Badge Correction
    const badge = document.getElementById('roleBadge');
    if (badge) {
        let displayRole = role.toLowerCase();
        if (displayRole === 'student') displayRole = 'faculty';
        
        const icon = displayRole === 'admin' ? '👨‍💼' : '👨‍🏫';
        const label = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);
        badge.innerHTML = `${icon} ${label} Member`;
    }

    // Stats
    const stats = {
        'totalClasses': data.totalClasses || 0,
        'totalStudents': data.totalStudents || 0,
        'gamesCreated': data.gamesCreated || 0,
        'avgEngagement': `${data.avgEngagement || 0}%`,
        'completionRate': `${data.completionRate || 0}%`
    };
    Object.entries(stats).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Bio & Dept
    const deptEl = document.getElementById('department');
    const bioEl = document.getElementById('bioInfo');
    if (deptEl) deptEl.textContent = data.department || 'Not set';
    if (bioEl) bioEl.textContent = data.bio || 'No bio available. Add one in settings!';

    // Form Fields
    const fields = {
        'displayName': name,
        'emailInput': email,
        'departmentInput': data.department || '',
        'bioInput': data.bio || '',
        'officeHours': data.officeHours || ''
    };
    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    });
}

async function loadClasses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/classes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load classes');
        const classes = await response.json();
        displayClasses(classes);
    } catch (error) {
        console.error('Error loading classes:', error);
        displayClasses([]);
    }
}

function displayClasses(classes) {
    const container = document.getElementById('classesGrid');
    if (!container) return;

    if (classes.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i data-lucide="book-x" style="width: 40px; height: 40px; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No registered classes found.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    container.innerHTML = classes.map(cls => `
        <div class="class-card">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--accent-lo); color: var(--accent); display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="book-open" style="width: 18px;"></i>
                </div>
                <div>
                    <div style="font-weight: 700; font-size: 15px;">${cls.name || 'Untitled'}</div>
                    <div style="font-size: 11px; color: var(--muted); font-family: var(--mono);">${cls.code || 'N/A'}</div>
                </div>
            </div>
            <div style="display: flex; gap: 16px;">
                <div style="font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="users" style="width: 12px;"></i> ${cls.studentCount || 0}
                </div>
                <div style="font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="gamepad-2" style="width: 12px;"></i> ${cls.gameCount || 0}
                </div>
            </div>
        </div>
    `).join('');
    if (window.lucide) lucide.createIcons();
}

async function loadActivity() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/faculty/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load activity');
        const activities = await response.json();
        displayActivity(activities);
    } catch (error) {
        console.error('Error loading activity:', error);
        displayActivity([]);
    }
}

function displayActivity(activities) {
    const container = document.getElementById('activityList');
    if (!container) return;

    if (activities.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--muted);">No recent logs.</p>`;
        return;
    }

    container.innerHTML = activities.map(item => `
        <div class="activity-item">
            <div class="activity-icon">${item.icon || '📝'}</div>
            <div class="activity-info">
                <h4>${item.title || 'System Action'}</h4>
                <p>${item.description || ''}</p>
            </div>
            <div class="activity-time">${formatTime(item.timestamp)}</div>
        </div>
    `).join('');
}

function formatTime(ts) {
    if (!ts) return 'Recent';
    const date = new Date(ts);
    const diff = (new Date() - date) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return date.toLocaleDateString();
}

// ── SAVE LOGIC ──
async function initSaveLogic() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                displayName: document.getElementById('displayName').value,
                department: document.getElementById('departmentInput').value,
                bio: document.getElementById('bioInput').value,
                officeHours: document.getElementById('officeHours').value
            };

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE}/faculty/profile`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) throw new Error('Failed to update');
                
                localStorage.setItem('userName', data.displayName);
                updateProfileUI(data);
                alert('✅ Profile updated successfully!');
            } catch (err) {
                console.error(err);
                alert('❌ Update failed');
            }
        });
    }

    const passBtn = document.getElementById('changePasswordBtn');
    if (passBtn) {
        passBtn.addEventListener('click', async () => {
            const oldPass = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confPass = document.getElementById('confirmPassword').value;

            if (newPass !== confPass) return alert('Passwords mismatch');
            
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE}/faculty/change-password`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: oldPass, newPassword: newPass })
                });

                if (!response.ok) throw new Error('Password change failed');
                
                ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => document.getElementById(id).value = '');
                alert('✅ Password changed!');
            } catch (err) {
                console.error(err);
                alert('❌ Error updating password');
            }
        });
    }
}

// ── INITIALIZE ──
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initTabs();
    initDashboard();
    initSaveLogic();
    loadFacultyProfile();
        loadActivity();
});
