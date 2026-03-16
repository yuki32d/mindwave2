// Manage Games - MINDWAVE
// Admin/Faculty page to view and delete individual games

let allGames = [];

document.addEventListener('DOMContentLoaded', () => {
    loadGames();

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchGames(e.target.value);
        });
    }

    // Delete all button
    const deleteAllBtn = document.getElementById('deleteAllGamesBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', deleteAllGames);
    }
});

async function loadGames() {
    const gameList = document.getElementById('gameList');
    gameList.innerHTML = '<div class="loading-state">Loading games...</div>';

    try {
        const res = await fetch('/api/games/published');
        const data = await res.json();

        if (data.ok && data.games) {
            allGames = data.games;
            renderGameList(allGames);
        } else {
            gameList.innerHTML = '<div class="empty-state">No games found.</div>';
        }
    } catch (error) {
        console.error('Failed to load games:', error);
        gameList.innerHTML = '<div class="empty-state" style="color: #ff3b30;">Failed to load games. Please try again.</div>';
    }
}

function renderGameList(games) {
    const gameList = document.getElementById('gameList');

    if (games.length === 0) {
        gameList.innerHTML = '<div class="empty-state">No games published yet.</div>';
        return;
    }

    gameList.innerHTML = games.map(game => {
        const type = formatGameType(game.type);
        const points = game.totalPoints || 0;
        const duration = game.duration || 10;
        const statusIcon = game.published ? '<i class="fas fa-check-circle" style="color: var(--green);"></i> Published' : '<i class="fas fa-edit" style="color: var(--muted);"></i> Draft';

        return `
            <div class="game-card">
                <div class="game-info">
                    <h3>${escapeHtml(game.title)}</h3>
                    <div class="game-meta">
                        <div class="meta-pill">
                            <i class="fas fa-gamepad"></i> ${type}
                        </div>
                        <div class="meta-pill">
                            <i class="fas fa-bullseye"></i> ${points} Pts
                        </div>
                        <div class="meta-pill">
                            <i class="fas fa-hourglass-half"></i> ${duration} Min
                        </div>
                        <div class="meta-pill">
                            ${statusIcon}
                        </div>
                    </div>
                </div>
                <button class="danger-btn delete-game-btn" data-game-id="${game._id || game.id}" data-game-title="${escapeHtml(game.title)}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
    }).join('');

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-game-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const gameId = btn.dataset.gameId;
            const gameTitle = btn.dataset.gameTitle;
            deleteGame(gameId, gameTitle);
        });
    });
}

async function deleteGame(gameId, gameTitle) {
    if (!await confirm(`Permanently remove "${gameTitle}" from the vault?`, "Confirm Deletion")) {
        return;
    }

    try {
        const res = await fetch(`/api/games/${gameId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        // Safe JSON parsing
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Non-JSON response:', text);
            throw new Error(`Server returned an invalid response (${res.status} ${res.statusText})`);
        }

        if (data.ok) {
            alert(`✅ Successfully deleted "${gameTitle}"`);
            loadGames(); // Reload the list
        } else {
            alert(`❌ Failed to delete game: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert(`❌ Error deleting game: ${error.message}`);
    }
}

async function deleteAllGames() {
    if (!await confirm('WARNING: This will permanently delete ALL content from the vault! This action cannot be undone. Are you absolutely sure?', 'Final Warning')) {
        return;
    }

    if (!await confirm('Are you 100% sure? This will affect all student progress across the platform.', 'Double Confirmation')) {
        return;
    }

    try {
        const res = await fetch('/api/games', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        // Safe JSON parsing
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Non-JSON response:', text);
            throw new Error(`Server returned an invalid response (${res.status} ${res.statusText})`);
        }

        if (data.ok) {
            alert(`✅ Successfully deleted all ${data.deletedCount || 0} games.`);
            loadGames();
        } else {
            alert(`❌ Failed to delete games: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Delete all error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

function searchGames(query) {
    if (!query.trim()) {
        renderGameList(allGames);
        return;
    }

    const filtered = allGames.filter(game =>
        game.title.toLowerCase().includes(query.toLowerCase()) ||
        formatGameType(game.type).toLowerCase().includes(query.toLowerCase()) ||
        (game.description && game.description.toLowerCase().includes(query.toLowerCase()))
    );

    renderGameList(filtered);
}

function formatGameType(type) {
    const types = {
        'quiz': 'Quiz',
        'trivia-challenge': 'Trivia Challenge',
        'code-unjumble': 'Code Unjumble',
        'unjumble': 'Code Unjumble',
        'tech-sorter': 'Tech Sorter',
        'sorter': 'Tech Sorter',
        'syntax-fill': 'Syntax Fill',
        'fillin': 'Syntax Fill',
        'sql-builder': 'SQL Builder',
        'sql': 'SQL Builder',
        'bug-hunt': 'Bug Hunt',
        'scenario': 'Scenario'
    };
    return types[type] || type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
