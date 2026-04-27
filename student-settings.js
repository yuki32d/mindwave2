const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
const currentUserName = localStorage.getItem('firstName') || 'Student';
let profileLocked = false; // flag set when profile is already completed

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

async function loadSettings() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.replace('marketing-site/website-home.html');
            return;
        }

        // Load user data from API
        const response = await fetch(`${window.location.origin}/api/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.ok && data.user) {
            const user = data.user;

            // Populate form fields
            document.getElementById('displayName').value = user.displayName || user.name || '';
            document.getElementById('bio').value = user.bio || '';
            document.getElementById('rollNumber').value = user.rollNumber || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('phone').value = user.phone || '';
            document.getElementById('batch').value = user.batch || '';
            document.getElementById('department').value = user.department || '';
            document.getElementById('section').value = user.section || '';

            // Load profile photo
            if (user.profilePhoto) {
                document.getElementById('photoImage').src = user.profilePhoto;
                document.getElementById('photoImage').style.display = 'block';
                document.getElementById('photoInitials').style.display = 'none';
            } else {
                const initialsNode = document.getElementById('photoInitials') || document.getElementById('stAvatarInitials');
                if (initialsNode) initialsNode.textContent = getInitials(user.displayName || user.name || 'Student');
            }

            // --- READ-ONLY LOCK LOGIC ---
            // If the user has already set their academic info (roll + department), lock everything.
            if (user.rollNumber && user.department) {
                profileLocked = true;
                lockProfileFields();
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }

    // Load theme — the html[data-theme] is already applied by student-theme-init.js,
    // but we sync the settings cards here in case they load after DOMContentLoaded.
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.querySelectorAll('[data-theme-choice]').forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-theme-choice') === savedTheme);
    });
}

// ── Grays out ALL profile fields using the standard disabled attribute ──
function lockProfileFields() {
    // Disable every input, textarea, and select in the profile panel
    const panel = document.getElementById('tab-profile');
    if (panel) {
        panel.querySelectorAll('input, textarea, select').forEach(el => {
            el.disabled = true;
        });
    }

    // Hide photo action buttons
    const photoBtns = document.querySelector('.st-photo-btns');
    if (photoBtns) photoBtns.style.display = 'none';

    // Hide Save Profile bar
    const saveBar = document.querySelector('#tab-profile .st-save-bar');
    if (saveBar) saveBar.style.display = 'none';

    // Inject amber lock notice at top of profile section
    if (!document.getElementById('profileLockNotice')) {
        const notice = document.createElement('div');
        notice.id = 'profileLockNotice';
        notice.style.cssText = 'padding:12px 16px;background:rgba(208,128,0,.1);border:1px solid rgba(208,128,0,.25);border-radius:10px;color:#d08000;font-size:13px;margin-bottom:18px;display:flex;align-items:center;gap:10px;';
        notice.innerHTML = `<i data-lucide="lock" style="width:16px;height:16px;flex-shrink:0;"></i><span><strong>Profile Locked</strong> — Your academic details have been saved and cannot be changed. Contact your faculty or HOD to request modifications.</span>`;
        const sub = document.querySelector('#tab-profile .st-panel-sub');
        if (sub) sub.insertAdjacentElement('afterend', notice);
    }
    if (window.lucide) window.lucide.createIcons();
}

// Holds the staged profile data between "Save" click and "Confirm" click
let _pendingProfileData = null;

function saveSettings() {
    // Guard: do nothing if profile is already locked
    if (profileLocked) return;

    const displayName = document.getElementById('displayName').value.trim();
    const bio         = document.getElementById('bio').value.trim();
    const rollNumber  = document.getElementById('rollNumber').value.trim();
    const phone       = document.getElementById('phone').value.trim();
    const batch       = document.getElementById('batch').value.trim();
    const department  = document.getElementById('department').value;
    const section     = document.getElementById('section').value;
    const deptText    = document.getElementById('department').options[document.getElementById('department').selectedIndex]?.text || department;

    // Validate required fields
    if (!displayName) { alert('Display name is required!'); return; }
    if (!rollNumber || !batch || !department || !section) {
        alert('Please fill in all required fields: Roll Number, Batch, Department, and Section');
        return;
    }

    // Store staged data
    _pendingProfileData = { displayName, bio, rollNumber, phone, batch, department, section };

    // Populate confirmation modal details
    const rows = [
        ['Name',        displayName],
        ['Roll Number', rollNumber],
        ['Phone',       phone || '—'],
        ['Batch',       batch],
        ['Department',  deptText],
        ['Section',     section],
    ];
    const list = document.getElementById('confirmDetailsList');
    if (list) {
        list.innerHTML = rows.map(([label, val]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border,rgba(255,255,255,.08));">
                <span style="font-size:12px;color:var(--text-muted,#9ea4b6);font-weight:500;">${label}</span>
                <span style="font-size:13px;color:var(--text-primary,#f5f7ff);font-weight:700;">${val}</span>
            </div>`).join('');
    }

    // Show the modal
    const modal = document.getElementById('profileConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        if (window.lucide) window.lucide.createIcons();
    }
}

async function performSaveProfile() {
    const d = _pendingProfileData;
    if (!d) return;

    // Close modal immediately on click
    const modal = document.getElementById('profileConfirmModal');
    if (modal) modal.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        if (!token) { window.location.replace('marketing-site/website-home.html'); return; }

        const response = await fetch(`${window.location.origin}/api/users/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(d)
        });

        const data = await response.json();
        if (!data.ok) throw new Error(data.message || 'Failed to save profile');

        localStorage.setItem('firstName', d.displayName);

        // Lock immediately
        profileLocked = true;
        lockProfileFields();

        // Success toast
        const successMsg = document.getElementById('successMessage');
        if (successMsg) {
            successMsg.style.display = 'block';
            setTimeout(() => { successMsg.style.display = 'none'; }, 3000);
        }

        // Clear password fields
        ['currentPassword', 'newPassword', 'confirmPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        _pendingProfileData = null;
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings: ' + error.message);
    }
}

function removePhoto() {
    document.getElementById('photoImage').src = '';
    document.getElementById('photoImage').style.display = 'none';
    document.getElementById('photoInitials').style.display = 'flex';
    document.getElementById('photoInput').value = '';
}

function uploadPhoto() {
    document.getElementById('photoInput').click();
}

function cancelSettings() {
    window.location.href = 'homepage.html';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Upload photo button
    const uploadBtn = document.getElementById('uploadPhotoBtn') || document.querySelector('.upload-btn:not(.secondary)');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadPhoto);
    }

    // Remove photo button
    const removeBtn = document.getElementById('removePhotoBtn') || document.querySelector('.upload-btn.secondary');
    if (removeBtn) {
        removeBtn.addEventListener('click', removePhoto);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn') || document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelSettings);
    }

    // Save Profile button (profile tab)
    const saveProfileBtn = document.getElementById('saveProfileBtn') || document.getElementById('saveBtn') || document.querySelector('.save-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveSettings);
    }

    // Save Password button (security tab)
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', saveSettings);
    }

    // Profile Confirmation Modal buttons
    document.getElementById('confirmGoBackBtn')?.addEventListener('click', () => {
        document.getElementById('profileConfirmModal').style.display = 'none';
        _pendingProfileData = null;
    });
    document.getElementById('confirmLockBtn')?.addEventListener('click', performSaveProfile);
    // Click backdrop to go back
    document.getElementById('profileConfirmModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('profileConfirmModal')) {
            document.getElementById('profileConfirmModal').style.display = 'none';
            _pendingProfileData = null;
        }
    });

    // Photo upload handler
    document.getElementById('photoInput').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB!');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                document.getElementById('photoImage').src = event.target.result;
                document.getElementById('photoImage').style.display = 'block';
                document.getElementById('photoInitials').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // ── Theme cards: wire both [data-theme-choice] and .st-theme-card (index 0=dark, 1=light) ──
    const themeMap = ['dark', 'light'];
    const stCards = document.querySelectorAll('.st-theme-card');
    const choiceCards = document.querySelectorAll('[data-theme-choice]');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Sync active/selected state on load
    stCards.forEach((card, i) => {
        card.classList.toggle('selected', themeMap[i] === savedTheme);
        card.addEventListener('click', () => {
            const chosen = themeMap[i];
            stCards.forEach((c, j) => c.classList.toggle('selected', themeMap[j] === chosen));
            choiceCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-theme-choice') === chosen));
            applyTheme(chosen);
        });
    });
    choiceCards.forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-theme-choice') === savedTheme);
        card.addEventListener('click', () => {
            const chosen = card.getAttribute('data-theme-choice');
            choiceCards.forEach(c => c.classList.toggle('active', c.getAttribute('data-theme-choice') === chosen));
            stCards.forEach((c, j) => c.classList.toggle('selected', themeMap[j] === chosen));
            applyTheme(chosen);
        });
    });

    // Initialize settings
    loadSettings();
});
