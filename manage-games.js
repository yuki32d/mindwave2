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

    gameList.innerHTML = games.map(game => `
        <div class="game-card">
            <div class="game-info">
                <h3>${escapeHtml(game.title)}</h3>
                <div class="game-meta">
                    <span>🎮 ${formatGameType(game.type)}</span>
                    <span>🎯 ${game.totalPoints || 0} points</span>
                    <span>⏱️ ${game.duration || 10} min</span>
                    ${game.published ? '<span style="color: #34c759;">✓ Published</span>' : '<span style="color: #9ea4b6;">○ Draft</span>'}
                </div>
            </div>
            <button class="danger-btn" onclick="deleteGame('${game._id || game.id}', '${escapeHtml(game.title).replace(/'/g, "\\'")}')">
                🗑️ Delete
            </button>
        </div>
    `).join('');
}

async function deleteGame(gameId, gameTitle) {
    if (!confirm(`Delete "${gameTitle}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/games/${gameId}`, {
            method: 'DELETE'
        });

        const data = await res.json();

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
    if (!confirm('⚠️ WARNING: This will permanently delete ALL games from the system!\n\nThis action cannot be undone. Are you absolutely sure?')) {
        return;
    }

    // Double confirmation for safety
    if (!confirm('⚠️ FINAL CONFIRMATION\n\nYou are about to delete ALL games. This will affect all students.\n\nType YES in your mind and click OK to proceed.')) {
        return;
    }

    try {
        const res = await fetch('/api/games', {
            method: 'DELETE'
        });

        const data = await res.json();

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
