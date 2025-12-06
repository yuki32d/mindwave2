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

function resetSeason() {
    if (confirm('Are you sure? This will wipe ALL student progress and cannot be undone.')) {
        // This would ideally be an API call too, but for now we keep the local logic or add an endpoint later
        localStorage.setItem('student_activities', '[]');
        alert('Season reset complete. All leaderboards are clean.');
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
