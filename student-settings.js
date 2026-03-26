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
            window.location.replace('marketing-site/student-login.html');
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

// ── Locks all personal-info fields to read-only visual state (matching email field) ──
function lockProfileFields() {
    const textFields = ['displayName', 'bio', 'rollNumber', 'phone', 'batch'];
    const selectFields = ['department', 'section'];

    // Mark text/textarea fields as readonly (identical look to email)
    textFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute('readonly', '');
        el.style.cursor = 'not-allowed';
        el.style.userSelect = 'none';
        // Add badge to label
        const label = el.closest('.st-field')?.querySelector('label');
        if (label && !label.querySelector('.st-readonly-tag')) {
            const badge = document.createElement('span');
            badge.className = 'st-readonly-tag';
            badge.textContent = 'read-only';
            label.appendChild(badge);
        }
    });

    // Block selects with a transparent overlay so they look normal but aren't clickable
    selectFields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.pointerEvents = 'none';
        el.style.userSelect = 'none';
        // Also disable for keyboard navigation
        el.setAttribute('tabindex', '-1');
        const wrapper = el.closest('.st-field');
        if (wrapper) {
            wrapper.style.position = 'relative';
            if (!wrapper.querySelector('.st-select-lock')) {
                const overlay = document.createElement('div');
                overlay.className = 'st-select-lock';
                overlay.style.cssText = 'position:absolute;inset:0;background:transparent;cursor:not-allowed;z-index:10;';
                wrapper.appendChild(overlay);
            }
            // Add badge to label too
            const label = wrapper.querySelector('label');
            if (label && !label.querySelector('.st-readonly-tag')) {
                const badge = document.createElement('span');
                badge.className = 'st-readonly-tag';
                badge.textContent = 'read-only';
                label.appendChild(badge);
            }
        }
    });

    // Hide photo action buttons
    const photoBtns = document.querySelector('.st-photo-btns');
    if (photoBtns) photoBtns.style.display = 'none';

    // Hide save bar
    const saveBar = document.querySelector('#tab-profile .st-save-bar');
    if (saveBar) saveBar.style.display = 'none';

    // Inject amber lock notice at top of profile section
    if (!document.getElementById('profileLockNotice')) {
        const notice = document.createElement('div');
        notice.id = 'profileLockNotice';
        notice.style.cssText = 'padding:12px 16px;background:rgba(208,128,0,.1);border:1px solid rgba(208,128,0,.25);border-radius:10px;color:#d08000;font-size:13px;margin-bottom:18px;display:flex;align-items:center;gap:10px;';
        notice.innerHTML = `<i data-lucide="lock" style="width:16px;height:16px;flex-shrink:0;"></i><span><strong>Profile Locked</strong> — Your academic details are verified and cannot be changed. Contact your faculty or HOD to request modifications.</span>`;
        const sub = document.querySelector('#tab-profile .st-panel-sub');
        if (sub) sub.insertAdjacentElement('afterend', notice);
    }
    if (window.lucide) window.lucide.createIcons();
}

async function saveSettings() {
    // Guard: do nothing if profile is already locked
    if (profileLocked) return;
    const displayName = document.getElementById('displayName').value;
    const bio = document.getElementById('bio').value;
    const rollNumber = document.getElementById('rollNumber').value;
    const phone = document.getElementById('phone').value;
    const batch = document.getElementById('batch').value;
    const department = document.getElementById('department').value;
    const section = document.getElementById('section').value;

    // Validate required fields
    if (!displayName) {
        alert('Display name is required!');
        return;
    }

    if (!rollNumber || !batch || !department || !section) {
        alert('Please fill in all required fields: Roll Number, Batch, Department, and Section');
        return;
    }

    // Check password change
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            alert('Please enter your current password to change it.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }
        try {
            const pwRes = await fetch(`${window.location.origin}/api/users/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const pwData = await pwRes.json();
            if (!pwData.ok) {
                alert(pwData.message || 'Failed to update password.');
                return;
            }
        } catch (e) {
            alert('Password change failed. Please try again.');
            return;
        }

    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in again');
            window.location.replace('marketing-site/student-login.html');
            return;
        }

        // Save profile to database using new endpoint
        const response = await fetch(`${window.location.origin}/api/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                displayName,
                bio,
                rollNumber,
                phone,
                batch,
                department,
                section
            })
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'Failed to save profile');
        }

        // Update localStorage
        localStorage.setItem('firstName', displayName);

        // Show success message
        const successMsg = document.getElementById('successMessage');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // Reload settings to show saved data
        await loadSettings();

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
