document.addEventListener('DOMContentLoaded', async () => {
    // Load Settings from Server
    try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        if (data.ok && data.settings) {
            const settings = data.settings;

            // Update Toggles
            const doubleXPToggle = document.getElementById('doubleXPToggle');
            if (doubleXPToggle) {
                doubleXPToggle.checked = settings.doubleXP;
                doubleXPToggle.addEventListener('change', (e) => saveSetting('doubleXP', e.target.checked));
            }

            const maintenanceToggle = document.getElementById('maintenanceToggle');
            if (maintenanceToggle) {
                maintenanceToggle.checked = settings.maintenanceMode;
                maintenanceToggle.addEventListener('change', (e) => saveSetting('maintenanceMode', e.target.checked));
            }

            const regToggle = document.getElementById('regToggle');
            if (regToggle) {
                regToggle.checked = settings.registrationOpen;
                regToggle.addEventListener('change', (e) => saveSetting('registrationOpen', e.target.checked));
            }

            const bannerInput = document.getElementById('bannerInput');
            if (bannerInput) {
                bannerInput.value = settings.globalBanner || '';
                bannerInput.addEventListener('change', (e) => saveSetting('globalBanner', e.target.value));
            }

            // Highlight active color
            const currentAccent = settings.accentColor || '#0f62fe';
            document.querySelectorAll('.color-swatch').forEach(swatch => {
                // Remove old listeners to prevent duplicates if any (though this runs once)
                const newSwatch = swatch.cloneNode(true);
                swatch.parentNode.replaceChild(newSwatch, swatch);

                newSwatch.addEventListener('click', function () {
                    const color = rgbToHex(this.style.backgroundColor);
                    setAccent(color, this);
                });

                if (rgbToHex(newSwatch.style.backgroundColor) === currentAccent) {
                    newSwatch.classList.add('active');
                }
            });
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }

    // Check if current user is super admin and show Faculty Management section
    try {
        const userResponse = await fetch('/api/me', { credentials: 'include' });
        const userData = await userResponse.json();

        if (userData.ok && userData.user) {
            const SUPER_ADMIN_EMAIL = "jeeban.mca@cmrit.ac.in";
            const facultyManagementSection = document.getElementById('facultyManagementSection');

            if (userData.user.email === SUPER_ADMIN_EMAIL && facultyManagementSection) {
                facultyManagementSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Failed to check super admin status:", error);
    }

    // Reset Season Button
    const resetBtn = document.querySelector('.danger-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSeason);
    }

    // Delete All Games Button
    const deleteAllGamesBtn = document.getElementById('deleteAllGamesBtn');
    if (deleteAllGamesBtn) {
        deleteAllGamesBtn.addEventListener('click', deleteAllGames);
    }
});

async function saveSetting(key, value) {
    // Optimistic UI update (optional, but good for UX)
    // localStorage.setItem(key, value); // We can still keep local storage as a cache if needed, but server is truth

    try {
        await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: value })
        });
    } catch (error) {
        console.error("Failed to save setting:", error);
        alert("Failed to save setting. Please check your connection.");
    }
}

function setAccent(color, el) {
    saveSetting('accentColor', color);
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

async function resetSeason() {
    if (!confirm('Are you sure? This will wipe ALL student progress and cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/reset-season', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            alert(`Season reset complete. Deleted ${data.deletedCount} game submissions.`);
            // Reload page to reflect changes
            window.location.reload();
        } else {
            alert(`Failed to reset season: ${data.message}`);
        }
    } catch (error) {
        console.error('Reset season error:', error);
        alert('Failed to reset season. Please try again.');
    }
}

async function deleteAllGames() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL games from the system!\n\nThis action cannot be undone. Are you absolutely sure?')) {
        return;
    }

    try {
        // Fetch all games
        const response = await fetch('/api/games');
        const data = await response.json();

        if (!data.ok || !data.games) {
            alert('Failed to fetch games');
            return;
        }

        const games = data.games;
        let deletedCount = 0;
        let failedCount = 0;

        // Delete each game
        for (const game of games) {
            try {
                const deleteResponse = await fetch(`/api/games/${game._id}`, {
                    method: 'DELETE'
                });

                if (deleteResponse.ok) {
                    deletedCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error(`Failed to delete game ${game._id}:`, error);
                failedCount++;
            }
        }

        if (failedCount === 0) {
            alert(`✅ Success! Deleted all ${deletedCount} games.`);
        } else {
            alert(`⚠️ Deleted ${deletedCount} games, but ${failedCount} failed. Check console for details.`);
        }

        // Reload page to reflect changes
        window.location.reload();
    } catch (error) {
        console.error('Delete all games error:', error);
        alert('❌ Failed to delete games. Please try again.');
    }
}

// Helper to match colors
function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgb) return rgb;
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

// ===================================
// ALUMNI BATCH MANAGEMENT
// ===================================

// Load blocked email patterns
async function loadBlockedPatterns() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/blocked-patterns', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok && data.patterns) {
            renderBlockedPatterns(data.patterns);
        } else {
            console.error('Failed to load blocked patterns:', data.message);
        }
    } catch (error) {
        console.error('Load blocked patterns error:', error);
    }
}

// Render blocked patterns in the UI
function renderBlockedPatterns(patterns) {
    const container = document.getElementById('blockedPatternsList');
    const countSpan = document.getElementById('blockedCount');

    if (!container) return;

    if (patterns.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 20px;">No blocked patterns yet.</p>';
        if (countSpan) countSpan.textContent = '0 patterns blocked';
        return;
    }

    if (countSpan) countSpan.textContent = `${patterns.length} pattern(s) blocked`;

    container.innerHTML = patterns.map(pattern => `
        <div class="student-item" style="margin-bottom: 12px;">
            <div class="student-info">
                <strong>${pattern.pattern}</strong>
                <span>${pattern.reason}</span>
                <span style="display: block; margin-top: 4px; font-size: 12px;">
                    🚫 ${pattern.affectedCount} account(s) blocked • 
                    ${new Date(pattern.blockedAt).toLocaleDateString()}
                </span>
            </div>
            <button class="delete-student-btn" onclick="unblockPattern('${pattern._id}')">
                Unblock
            </button>
        </div>
    `).join('');
}

// Block a new email pattern
async function blockPattern() {
    const patternInput = document.getElementById('emailPattern');
    const reasonInput = document.getElementById('blockReason');

    const pattern = patternInput.value.trim();
    const reason = reasonInput.value.trim();

    if (!pattern || !reason) {
        alert('Please enter both email pattern and reason');
        return;
    }

    if (!confirm(`Block all accounts matching "${pattern}"?\n\nThis will immediately disable login for all matching students.`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/block-pattern', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pattern, reason })
        });

        const data = await response.json();

        if (data.ok) {
            alert(`✅ ${data.message}`);
            patternInput.value = '';
            reasonInput.value = '';
            loadBlockedPatterns(); // Refresh list
        } else {
            alert(`❌ Failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Block pattern error:', error);
        alert('❌ Failed to block pattern. Please try again.');
    }
}

// Unblock an email pattern
async function unblockPattern(id) {
    if (!confirm('Unblock this pattern?\n\nThis will reactivate all matching student accounts.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/blocked-patterns/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            alert(`✅ ${data.message}`);
            loadBlockedPatterns(); // Refresh list
        } else {
            alert(`❌ Failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Unblock pattern error:', error);
        alert('❌ Failed to unblock pattern. Please try again.');
    }
}

// Initialize alumni batch management
document.addEventListener('DOMContentLoaded', () => {
    // Load blocked patterns if the section exists
    if (document.getElementById('blockedPatternsList')) {
        loadBlockedPatterns();

        // Add event listener to block button
        const blockBtn = document.getElementById('blockPatternBtn');
        if (blockBtn) {
            blockBtn.addEventListener('click', blockPattern);
        }
    }
});
