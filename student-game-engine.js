// Student Game Engine - MINDWAVE
// All game logic and player stats

const gamesKey = 'games';
const activityKey = 'student_activities';
const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
const currentUserName = localStorage.getItem('firstName') || 'Student';
let timerInterval;

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Router logic
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id') || urlParams.get('play');
const autoStart = urlParams.get('auto') === '1';

document.addEventListener('DOMContentLoaded', () => {
    if (gameId) {
        initGamePlayer(gameId);
    } else {
        initGameLobby();
        
        // REFRESH MECHANISM: Listen for completion signal from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'mw_game_refresh') {
                console.log('Game completion detected in another tab. Refreshing lobby...');
                initGameLobby();
            }
        });

        // REFRESH MECHANISM: Refresh UI when student returns to this tab
        window.addEventListener('focus', () => {
            console.log('Tab focused. Ensuring game list is up to date...');
            initGameLobby();
        });
    }

    // Setup filter listeners
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.filter;
            filterGames(type, e.target);
        });
    });
});

async function initGameLobby() {
    updatePlayerStats();
    const container = document.getElementById('appContainer');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: #9ea4b6;">Loading games...</div>';

    try {
        console.log('Fetching games from API...');
        const res = await fetch('/api/games/published?t=' + Date.now()); // Cache busting
        const data = await res.json();
        console.log('API Response:', data);

        if (data.ok) {
            const games = data.games || []; // API already sorts newest first
            window.allGames = games;
            renderGameList(games);
        } else {
            throw new Error(data.message || 'Failed to load games');
        }
    } catch (error) {
        console.error('Failed to load games:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #ff3b30;">
                <h2>Failed to load games</h2>
                <p>Please check your connection and try again.</p>
            </div>
                <p>Check back later for new assignments.</p>
            </div>
        `;
    }
}

// ── Type metadata ──
function getTypeInfo(type) {
    const map = {
        'quiz': { icon: 'brain', label: 'Quiz', color: '#6366f1', bg: 'rgba(99,102,241,.14)', accent: 'linear-gradient(90deg,#6366f1,#a855f7)' },
        'trivia-challenge': { icon: 'brain', label: 'Trivia', color: '#6366f1', bg: 'rgba(99,102,241,.14)', accent: 'linear-gradient(90deg,#6366f1,#a855f7)' },
        'unjumble': { icon: 'shuffle', label: 'Code Unjumble', color: '#3b82f6', bg: 'rgba(59,130,246,.14)', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)' },
        'code-unjumble': { icon: 'shuffle', label: 'Code Unjumble', color: '#3b82f6', bg: 'rgba(59,130,246,.14)', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)' },
        'sorter': { icon: 'zap', label: 'Tech Sorter', color: '#f59e0b', bg: 'rgba(245,158,11,.14)', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
        'tech-sorter': { icon: 'zap', label: 'Tech Sorter', color: '#f59e0b', bg: 'rgba(245,158,11,.14)', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
        'fillin': { icon: 'pencil', label: 'Fill in Blank', color: '#22c55e', bg: 'rgba(34,197,94,.14)', accent: 'linear-gradient(90deg,#22c55e,#4ade80)' },
        'syntax-fill': { icon: 'pencil', label: 'Fill in Blank', color: '#22c55e', bg: 'rgba(34,197,94,.14)', accent: 'linear-gradient(90deg,#22c55e,#4ade80)' },
        'sql': { icon: 'database', label: 'SQL Builder', color: '#14b8a6', bg: 'rgba(20,184,166,.14)', accent: 'linear-gradient(90deg,#14b8a6,#2dd4bf)' },
        'sql-builder': { icon: 'database', label: 'SQL Builder', color: '#14b8a6', bg: 'rgba(20,184,166,.14)', accent: 'linear-gradient(90deg,#14b8a6,#2dd4bf)' },
        'sql-scenario': { icon: 'file-code-2', label: 'SQL Scenario', color: '#8b5cf6', bg: 'rgba(139,92,246,.14)', accent: 'linear-gradient(90deg,#8b5cf6,#c084fc)' },
        'bug-hunt': { icon: 'bug', label: 'Debug the Code', color: '#ef4444', bg: 'rgba(239,68,68,.14)', accent: 'linear-gradient(90deg,#ef4444,#f87171)' },
        'scenario': { icon: 'book-open', label: 'Scenario', color: '#8b5cf6', bg: 'rgba(139,92,246,.14)', accent: 'linear-gradient(90deg,#8b5cf6,#c084fc)' },
        'poll': { icon: 'bar-chart-3', label: 'Poll', color: '#f97316', bg: 'rgba(249,115,22,.14)', accent: 'linear-gradient(90deg,#f97316,#fb923c)' },
    };
    return map[type] || { icon: 'gamepad-2', label: 'Game', color: '#6366f1', bg: 'rgba(99,102,241,.14)', accent: 'linear-gradient(90deg,#6366f1,#a855f7)' };
}

function getGameMeta(game) {
    if (game.type === 'quiz' || game.type === 'trivia-challenge') return (game.questions ? game.questions.length : 0) + ' Questions';
    if (game.type === 'unjumble' || game.type === 'code-unjumble') return (game.lines ? game.lines.length : 0) + ' Lines';
    if (game.type === 'sorter' || game.type === 'tech-sorter') return (game.items ? game.items.length : 0) + ' Items';
    if (game.type === 'fillin' || game.type === 'syntax-fill') return (game.blanks ? game.blanks.length : 0) + ' Blanks';
    if (game.type === 'sql' || game.type === 'sql-builder') return (game.blocks ? game.blocks.length : 0) + ' Blocks';
    if (game.type === 'sql-scenario') return 'AI Graded';
    if (game.type === 'bug-hunt') return (game.bugCount || 0) + ' Bugs';
    if (game.type === 'scenario') return (game.scenes ? game.scenes.length : 0) + ' Scenes';
    return 'Game';
}

function formatGameType(type) {
    return getTypeInfo(type).label;
}

function renderGameList(games) {
    const container = document.getElementById('appContainer');
    if (!container) return;
    document.getElementById('breadcrumbSub') && (document.getElementById('breadcrumbSub').textContent = 'Game Center');
    document.getElementById('gcFilterBar') && (document.getElementById('gcFilterBar').style.display = '');

    if (!games || games.length === 0) {
        container.innerHTML = `
            <div class="lb-empty">
                <div style="font-size:3rem;margin-bottom:12px">🎮</div>
                <h2>No games available</h2>
                <p>Check back later for new assignments.</p>
            </div>`;
        return;
    }

    container.innerHTML = `<div class="gc-grid">${games.map(game => {
        const ti = getTypeInfo(game.type);
        const meta = getGameMeta(game);
        const xp = game.totalPoints || 100;
        const diff = game.difficulty || 'Normal';
        const diffColor = diff === 'Beginner' ? '#22c55e' : diff === 'Hard' ? '#ef4444' : diff === 'Expert' ? '#8b5cf6' : '#f59e0b';
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${ti.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="${ti.icon}"></svg>`;
        
        const cardStyle = game.hasPlayed ? 'opacity: 0.7; filter: grayscale(0.5); border-color: rgba(52, 199, 89, 0.4); cursor: not-allowed;' : '';
        const playBtnText = game.hasPlayed ? 'Completed ✓' : 'Play Now';
        const playBtnStyle = game.hasPlayed ? 'background:#34c759;' : '';
        const playBtnIcon = game.hasPlayed ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

        return `
        <article class="gc-card" data-id="${game._id || game.id}"
            style="--card-accent:${game.hasPlayed ? '#34c759' : ti.accent}; ${cardStyle}">
            
            ${game.hasPlayed ? `<div style="position:absolute; top:12px; right:-28px; background:#34c759; color:#fff; font-size:10px; font-weight:800; padding:4px 30px; transform:rotate(45deg); z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.2); letter-spacing:1px; text-transform:uppercase;">Completed</div>` : ''}

            <div class="gc-card-play-overlay">
                <div class="gc-play-btn" style="${playBtnStyle}">
                    ${playBtnIcon}
                    ${playBtnText}
                </div>
            </div>
            <div class="gc-card-inner">
                <div class="gc-card-top">
                    <div class="gc-card-icon" style="background:${ti.bg}" id="icon-${game._id || game.id}">
                        ${iconSvg}
                    </div>
                    <span class="gc-card-meta" style="background:${ti.bg};color:${ti.color}">${meta}</span>
                </div>
                <div class="gc-card-title">${game.title}</div>
                <div class="gc-card-desc">${game.brief || game.description || 'Complete the challenge to earn XP.'}</div>
                <div class="gc-card-footer">
                    <span class="gc-chip"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${game.duration || 10} min</span>
                    <span class="gc-chip" style="color:${diffColor};border-color:${diffColor}33;background:${diffColor}11">${diff}</span>
                    <span class="gc-xp-chip"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${xp} XP</span>
                </div>
            </div>
        </article>`;
    }).join('')}</div>`;

    // Init Lucide icons on all card icons
    if (window.lucide) lucide.createIcons({ el: container });

    container.querySelectorAll('.gc-card').forEach(card => {
        card.addEventListener('click', () => {
            const game = (window.allGames || []).find(g => (g._id || g.id) === card.dataset.id);
            if (game) {
                if (game.hasPlayed) {
                    showAlreadyPlayedPopup(game);
                } else {
                    showGamePreview(game);
                }
            }
            else window.location.href = `?id=${card.dataset.id}`;
        });
    });
}

function showAlreadyPlayedPopup(game) {
    const overlay = document.createElement('div');
    overlay.className = 'mw-logout-overlay active';
    overlay.innerHTML = `
        <div class="mw-logout-modal" style="text-align:center;">
            <div class="mw-logout-icon" style="background: rgba(52, 199, 89, 0.15); color: #34c759; margin: 0 auto 20px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-lucide="check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 class="mw-logout-title">Test Already Taken</h3>
            <p class="mw-logout-sub" style="margin-bottom:24px;">You have already submitted your answers for <strong>${game.title}</strong>. Multiple attempts are not permitted.</p>
            <div class="mw-logout-actions" style="justify-content:center;">
                <button class="gc-start-btn" style="width:100%; border-radius:12px; background:var(--surface-2); color:var(--text); box-shadow:none; transform:none;" onclick="this.closest('.mw-logout-overlay').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) { lucide.createIcons({ el: overlay }); }
}

// Full-page block rendered inside student-game-play.html when a student
// revisits an already-completed game link from browser history.
function showAlreadyCompletedScreen(container, game) {
    // Hide the fullscreen gate — we don't need it
    const gate = document.getElementById('fsGate');
    if (gate) gate.style.display = 'none';

    container.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            text-align: center;
            gap: 24px;
            padding: 40px 20px;
            animation: fadeIn 0.5s ease-out;
        ">
            <div style="
                width: 80px; height: 80px;
                background: rgba(52, 199, 89, 0.12);
                border: 2px solid rgba(52, 199, 89, 0.35);
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 40px rgba(52, 199, 89, 0.15);
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                     fill="none" stroke="#34c759" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>

            <div>
                <h2 style="
                    font-size: 1.75rem; font-weight: 800; color: #fff;
                    letter-spacing: -0.02em; margin-bottom: 10px;
                ">Test Already Submitted</h2>
                <p style="color: #9ca3af; font-size: 0.95rem; line-height: 1.6; max-width: 420px; margin: 0 auto;">
                    You have already completed <strong style="color:#fff;">${game ? game.title : 'this game'}</strong>.
                    Multiple attempts are not permitted to ensure exam integrity.
                </p>
            </div>

            <div style="
                background: rgba(52, 199, 89, 0.07);
                border: 1px solid rgba(52, 199, 89, 0.25);
                border-radius: 16px;
                padding: 16px 28px;
                font-size: 0.85rem;
                color: #34c759;
                font-weight: 600;
                letter-spacing: 0.02em;
            ">
                🔒 This session is locked — access is permanently blocked for this test.
            </div>

            <button onclick="${window.opener ? 'window.opener && window.opener.focus(); window.close();' : "window.location.href='student-game.html'"}"
                style="
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    color: #fff; border: none;
                    padding: 14px 32px; border-radius: 14px;
                    font-size: 0.95rem; font-weight: 700; cursor: pointer;
                    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
                    transition: all 0.2s;
                "
                onmouseover="this.style.filter='brightness(1.12)';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.filter='';this.style.transform=''"
                id="alreadyDoneExitBtn"
            >← Back to Game Center</button>
        </div>
    `;

    // Wire the button properly after render (handles both tab modes)
    const btn = document.getElementById('alreadyDoneExitBtn');
    if (btn) {
        btn.onclick = () => {
            if (typeof window.releaseGameLock === 'function') window.releaseGameLock();
            if (window.opener) {
                window.opener.focus();
                window.close();
            } else {
                window.location.href = 'student-game.html';
            }
        };
    }
}

function showGamePreview(game) {
    const container = document.getElementById('appContainer');
    const ti = getTypeInfo(game.type);
    const meta = getGameMeta(game);
    if (document.getElementById('gcFilterBar')) document.getElementById('gcFilterBar').style.display = 'none';
    if (document.getElementById('breadcrumbSub')) document.getElementById('breadcrumbSub').textContent = game.title;

    const rules = {
        'quiz': 'Read each question carefully and select the best answer. You have one attempt per question.',
        'trivia-challenge': 'Answer trivia questions correctly to earn points. Speed matters!',
        'unjumble': 'Drag and drop the code lines into the correct order to reconstruct the program.',
        'code-unjumble': 'Drag and drop the code lines into the correct order to reconstruct the program.',
        'sorter': 'Categorise each item by clicking the correct bucket. Work fast — every correct sort earns points.',
        'tech-sorter': 'Categorise each item by clicking the correct bucket. Work fast — every correct sort earns points.',
        'fillin': 'Click words from the bank to fill in the blanks in the code. Click a filled blank to remove it.',
        'syntax-fill': 'Click words from the bank to fill in the blanks in the code. Click a filled blank to remove it.',
        'sql': 'Drag SQL blocks into the correct order to build a valid query.',
        'sql-builder': 'Drag SQL blocks into the correct order to build a valid query.',
        'sql-scenario': 'Read the scenario carefully and type your SQL query in the box below. The AI will evaluate your answer — variations in syntax are accepted as long as your query is functionally correct!',
        'bug-hunt': 'Read the buggy code carefully, then rewrite the corrected version in the editor below.',
        'scenario': 'Walk through the scenario and make choices. Each decision affects the outcome.',
        'poll': 'Share your opinion by selecting your answer(s). Results may be shown after submission.',
    };
    const ruleText = rules[game.type] || 'Complete the challenge to earn XP and climb the leaderboard.';

    container.innerHTML = `
    <div class="gc-preview">
        <button class="gc-preview-back" id="previewBackBtn">← Back to All Games</button>
        <div class="gc-preview-card">
            <div class="gc-preview-banner" style="background:${ti.bg}">
                <div class="gc-preview-icon" style="background:rgba(255,255,255,.12)">                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${ti.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="${ti.icon}"></svg></div>
                <div class="gc-preview-type" style="color:${ti.color}">${ti.label}</div>
                <div class="gc-preview-title">${game.title}</div>
                <div class="gc-preview-desc">${game.brief || game.description || ''}</div>
            </div>
            <div class="gc-preview-chips">
                <div class="gc-preview-chip">
                    <span class="gc-preview-chip-val">${meta}</span>
                    <span class="gc-preview-chip-lbl">Items</span>
                </div>
                <div class="gc-preview-chip">
                    <span class="gc-preview-chip-val">${game.duration || 10} min</span>
                    <span class="gc-preview-chip-lbl">Time limit</span>
                </div>
                <div class="gc-preview-chip">
                    <span class="gc-preview-chip-val">${game.difficulty || 'Normal'}</span>
                    <span class="gc-preview-chip-lbl">Difficulty</span>
                </div>
                <div class="gc-preview-chip">
                    <span class="gc-preview-chip-val">${game.totalPoints || 100} XP</span>
                    <span class="gc-preview-chip-lbl">Reward</span>
                </div>
            </div>
            <div style="padding:20px 32px; border-bottom:1px solid var(--border)">
                <div style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> How to play</div>
                <p style="font-size:.9rem;color:var(--text);line-height:1.6;margin:0">${ruleText}</p>
            </div>
            <div class="gc-preview-actions">
                <button class="gc-start-btn" id="startGameBtn" style="background:${ti.accent};display:flex;align-items:center;justify-content:center;gap:8px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Game
                </button>
            </div>
        </div>
    </div>`;

    document.getElementById('previewBackBtn').addEventListener('click', () => {
        renderGameList(window.allGames || []);
    });
    document.getElementById('startGameBtn').addEventListener('click', () => {
        // PROFESSIONAL PLATFORM: Launch in a new tab
        const gId = game._id || game.id;
        const playUrl = `student-game-play.html?id=${gId}&auto=1`;
        window.open(playUrl, '_blank', 'noopener,noreferrer');
        
        // Return to lobby in this tab
        renderGameList(window.allGames || []);
    });
}

function launchGame(game) {
    const container = document.getElementById('appContainer');
    
    // Safety checks for Pro Mode
    if (!window.isProMode) {
        if (document.getElementById('gcFilterBar')) document.getElementById('gcFilterBar').style.display = 'none';
        if (document.getElementById('breadcrumbSub')) document.getElementById('breadcrumbSub').textContent = game.title;
    }
    
    container.innerHTML = '';
    try {
        switch (game.type) {
            case 'poll': playPoll(game, container); break;
            case 'quiz':
            case 'trivia-challenge': playQuiz(game, container); break;
            case 'unjumble':
            case 'code-unjumble': playUnjumble(game, container); break;
            case 'sorter':
            case 'tech-sorter': playSorter(game, container); break;
            case 'fillin':
            case 'syntax-fill': playFillIn(game, container); break;
            case 'sql':
            case 'sql-builder': playSQL(game, container); break;
            case 'sql-scenario': playScenarioSQL(game, container); break;
            case 'bug-hunt': playDebug(game, container); break;
            case 'scenario': playScenario(game, container); break;
            default:
                if (game.questions) playQuiz(game, container);
                else container.innerHTML = '<p style="color:var(--muted);padding:40px">Unknown game type.</p>';
        }
    } catch (err) {
        console.error('Game launch error:', err);
        container.innerHTML = `<div class="error-message"><h3>Something went wrong</h3><p>${err.message}</p><button onclick="renderGameList(window.allGames||[])" style="margin-top:12px;padding:8px 16px;border-radius:8px;background:rgba(255,255,255,.1);border:none;color:#fff;cursor:pointer">Back to Games</button></div>`;
    }
}

function filterGames(type, targetBtn) {
    if (!window.allGames) return;
    if (type === 'all') return renderGameList(window.allGames);
    const filtered = window.allGames.filter(g => {
        if (type === 'quiz') return g.type === 'quiz' || g.type === 'trivia-challenge';
        if (type === 'logic') return g.type.includes('unjumble') || g.type.includes('sorter') || g.type.includes('logic') || g.type === 'bug-hunt';
        if (type === 'builder') return g.type.includes('sql') || g.type.includes('fill');
        return false;
    });
    renderGameList(filtered);
}

async function updatePlayerStats() {
    let totalScore = 0;
    let wins = 0;

    try {
        // Fetch real XP and wins from the backend
        const token = localStorage.getItem('token');
        if (token) {
            const res = await fetch('/api/leaderboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok && data.currentUser) {
                totalScore = data.currentUser.totalPoints || 0;
                wins = data.currentUser.gamesPlayed || 0;
            }
        }
    } catch (e) {
        // Fallback to localStorage
        const activities = loadData(activityKey);
        totalScore = activities.reduce((acc, curr) => acc + (curr.rawScore || 0), 0);
        wins = activities.filter(a => a.status === 'completed').length;
    }

    const level = Math.floor(Math.sqrt(totalScore / 100)) + 1;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const progress = ((totalScore - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100;

    const levelEl = document.getElementById('playerLevel');
    if (levelEl) levelEl.textContent = level;
    const xpEl = document.getElementById('currentXP');
    if (xpEl) xpEl.textContent = totalScore + ' XP';
    const nextXpEl = document.getElementById('nextLevelXP');
    if (nextXpEl) nextXpEl.textContent = nextLevelXP + ' XP';
    const barEl = document.getElementById('xpBar');
    if (barEl) barEl.style.width = Math.max(0, Math.min(100, progress)) + '%';
    const winsEl = document.getElementById('totalWins');
    if (winsEl) winsEl.textContent = wins;
    const ranks = ['Novice', 'Apprentice', 'Scholar', 'Expert', 'Master', 'Grandmaster'];
    const rankEl = document.getElementById('playerRank');
    if (rankEl) rankEl.textContent = ranks[Math.min(level - 1, ranks.length - 1)];
    const streakEl = document.getElementById('streakCount');
    if (streakEl) {
        // Simple streak: count consecutive completed games from most recent
        try {
            const acts = loadData(activityKey);
            const sorted = acts.filter(a => a.status === 'completed').sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
            let streak = 0;
            let lastDate = null;
            for (const a of sorted) {
                const d = new Date(a.completedAt).toDateString();
                if (!lastDate || d === lastDate) { streak++; lastDate = d; }
                else break;
            }
            streakEl.textContent = streak;
        } catch { streakEl.textContent = 0; }
    }
}


async function initGamePlayer(gameId) {
    const container = document.getElementById('appContainer');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted);">Loading game...</div>';
    try {
        const res = await fetch('/api/games/published');
        const data = await res.json();
        if (!data.ok) throw new Error('Failed to load game data');
        const games = data.games || [];
        const game = games.find(g => (g._id === gameId || g.id === gameId));
        if (!game) {
            container.innerHTML = '<div class="error-message">Game not found.</div>';
            return;
        }
        window.allGames = window.allGames || games;

        // ── GUARD: Block re-play if the student already completed this game ──
        if (game.hasPlayed) {
            showAlreadyCompletedScreen(container, game);
            return;
        }

        if (autoStart) {
            launchGame(game);
        } else {
            showGamePreview(game);
        }
    } catch (error) {
        console.error('Failed to init game:', error);
        container.innerHTML = '<div class="error-message">Failed to load game. Please try again.</div>';
    }
}

// === GAME ENGINES ===

// Poll Engine - For opinion collection
function playPoll(game, container) {
    let selectedOptions = [];
    let startTime = Date.now();
    const allowMultiple = game.settings?.allowMultiple || false;
    const showResults = game.settings?.showResults !== false;

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>📊 ${game.question}</span></div>
            <div class="question-display">
                ${game.description ? `<p style="color: #9ea4b6; margin-bottom: 24px;">${game.description}</p>` : ''}
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${(game.options || []).map((option, idx) => `
                        <button class="poll-option ${selectedOptions.includes(idx) ? 'selected' : ''}" 
                                data-idx="${idx}"
                                style="
                                    padding: 16px 20px;
                                    background: ${selectedOptions.includes(idx) ? 'rgba(15, 98, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                                    border: 2px solid ${selectedOptions.includes(idx) ? '#0f62fe' : 'rgba(255, 255, 255, 0.1)'};
                                    border-radius: 12px;
                                    color: #f5f7ff;
                                    cursor: pointer;
                                    text-align: left;
                                    transition: all 0.2s;
                                    font-size: 16px;
                                ">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 20px; height: 20px; border: 2px solid ${selectedOptions.includes(idx) ? '#0f62fe' : 'rgba(255,255,255,0.3)'}; border-radius: ${allowMultiple ? '4px' : '50%'}; background: ${selectedOptions.includes(idx) ? '#0f62fe' : 'transparent'};"></div>
                                <span>${option}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>
                <button id="pollSubmitBtn" class="submit-btn" style="margin-top: 32px; width: 100%; opacity: ${selectedOptions.length === 0 ? '0.5' : '1'};" ${selectedOptions.length === 0 ? 'disabled' : ''}>
                    Submit ${allowMultiple ? 'Votes' : 'Vote'}
                </button>
            </div>
        `;

        // Attach option listeners
        container.querySelectorAll('.poll-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                if (allowMultiple) {
                    if (selectedOptions.includes(idx)) {
                        selectedOptions = selectedOptions.filter(i => i !== idx);
                    } else {
                        selectedOptions.push(idx);
                    }
                } else {
                    selectedOptions = [idx];
                }
                render();
            });
        });

        // Submit button
        const submitBtn = document.getElementById('pollSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitPoll);
        }
    }

    async function submitPoll() {
        const studentAnswers = selectedOptions.map(idx => ({
            questionText: game.question,
            studentAnswer: game.options[idx],
            isCorrect: true // Polls don't have correct answers
        }));

        // For polls, score is just participation
        const score = 10;
        await saveResult(game, score, 10, startTime, studentAnswers);

        if (showResults) {
            showPollResults(container, game, selectedOptions);
        } else {
            showResult(container, score, 10, startTime, game._id || game.id);
        }
    }

    render();
}

function showPollResults(container, game, userSelections) {
    // Simulate results (in production, fetch from server)
    const results = game.options.map((opt, idx) => ({
        option: opt,
        votes: Math.floor(Math.random() * 50) + (userSelections.includes(idx) ? 1 : 0),
        percentage: 0
    }));

    const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
    results.forEach(r => r.percentage = totalVotes > 0 ? (r.votes / totalVotes * 100).toFixed(1) : 0);

    container.innerHTML = `
        <div class="player-header"><span>📊 Poll Results</span></div>
        <div class="question-display">
            <h2 style="margin-bottom: 24px;">${game.question}</h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                ${results.map((result, idx) => `
                    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; border: 2px solid ${userSelections.includes(idx) ? '#0f62fe' : 'rgba(255,255,255,0.1)'};">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #f5f7ff;">${result.option}</span>
                            <span style="color: #9ea4b6;">${result.votes} votes (${result.percentage}%)</span>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #0f62fe, #9f7aea); height: 100%; width: ${result.percentage}%; transition: width 0.5s;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 32px; text-align: center; color: #9ea4b6;">
                <p>Total votes: ${totalVotes}</p>
            </div>
            <button class="submit-btn" onclick="window.location.href='student-game.html'" style="margin-top: 24px; width: 100%;">
                Back to Games
            </button>
        </div>
    `;
}

function playQuiz(game, container) {
    let currentQuestionIndex = 0;
    let score = 0;
    let startTime = Date.now();
    let selectedOptionIndex = null;
    const questions = game.questions || [];
    const studentAnswers = []; // Track student answers for review

    function render() {
        if (currentQuestionIndex >= questions.length) {
            return finish();
        }

        const q = questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex) / questions.length) * 100;

        container.innerHTML = `
            <div class="player-header">
                <span>Question ${currentQuestionIndex + 1} of ${questions.length}</span>
                <span class="timer">⏱️</span>
            </div>
            <div class="question-display">
                <h2 style="font-size: 24px; margin-bottom: 32px;">${q.text}</h2>
                <div class="options-grid">
                    ${q.options.map((opt, idx) => `
                        <button class="option-btn ${selectedOptionIndex === idx ? 'selected' : ''}" data-idx="${idx}">
                            ${opt}
                        </button>
                    `).join('')}
                </div>
                <div style="margin-top: 32px; display: flex; gap: 16px;">
                    <button id="quitBtn" class="secondary-btn" style="border-color: rgba(239, 68, 68, 0.2); color: #ef4444;">Quit</button>
                    <button id="submitBtn" class="submit-btn" style="flex: 1;" ${selectedOptionIndex === null ? 'disabled' : ''}>Submit Answer</button>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
        `;

        // Attach listeners
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedOptionIndex = parseInt(btn.dataset.idx);
                render(); // Re-render to update selection UI
            });
        });

        // Submit button listener
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (selectedOptionIndex === null) return;

                // Track student answer for review
                const isCorrect = Number(selectedOptionIndex) === Number(q.correctIndex);
                studentAnswers.push({
                    questionText: q.text,
                    studentAnswer: q.options[selectedOptionIndex],
                    correctAnswer: q.options[q.correctIndex],
                    isCorrect: isCorrect,
                    options: q.options
                });

                // Check if answer is correct and add points
                if (isCorrect) {
                    score += Number(q.points || 10);
                }

                // Move to next question
                selectedOptionIndex = null;
                currentQuestionIndex++;
                render();
            });
        }

        // Quit button listener
        const quitBtn = document.getElementById('quitBtn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
                    window.location.href = 'student-game.html';
                }
            });
        }
    }

    async function finish() {
        // Calculate total possible points
        const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 10), 0);
        const tp = Number(game.totalPoints || totalPoints); // Use totalPoints if game.totalPoints is not set
        await saveResult(game, score, tp, startTime, studentAnswers);
        showResult(container, score, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', finish);
    render();
}

function playUnjumble(game, container) {
    let startTime = Date.now();
    let shuffledLines = [...(game.lines || [])].map((line, idx) => ({ text: line, originalIndex: idx }))
        .sort(() => Math.random() - 0.5);
    let draggedIndex = null;

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Reorder the Code</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 32px; color: var(--text-muted); font-size: 0.95rem;">
                    <strong>🎯 Drag and drop</strong> the code blocks to arrange them in the correct order.
                </p>
                <div id="code-lines" style="display: flex; flex-direction: column; gap: 12px;">
                    ${shuffledLines.map((line, idx) => `
                        <div class="draggable-line" 
                             draggable="true" 
                             data-idx="${idx}" 
                             style="
                                cursor: grab;
                                display: flex;
                                align-items: center;
                                gap: 12px;
                                padding: 16px;
                                background: rgba(255, 255, 255, 0.05);
                                border: 2px solid rgba(255, 255, 255, 0.1);
                                border-radius: 12px;
                                transition: all 0.2s ease;
                                font-family: 'Courier New', monospace;
                                font-size: 14px;
                                user-select: none;
                             ">
                            <span style="
                                color: #9ea4b6;
                                font-size: 18px;
                                cursor: grab;
                                display: flex;
                                flex-direction: column;
                                line-height: 0.6;
                            ">⋮⋮</span>
                            <span style="flex: 1; color: #f5f7ff;">${line.text}</span>
                        </div>
                    `).join('')}
                </div>
                <button id="unjumbleSubmitBtn" class="submit-btn" style="margin-top: 40px; width: 100%;">Submit Solution</button>
            </div>
        `;

        // Add drag and drop event listeners
        const draggableLines = container.querySelectorAll('.draggable-line');

        draggableLines.forEach((lineEl, idx) => {
            // Drag start
            lineEl.addEventListener('dragstart', (e) => {
                draggedIndex = parseInt(lineEl.dataset.idx);
                lineEl.style.opacity = '0.5';
                lineEl.style.cursor = 'grabbing';
                e.dataTransfer.effectAllowed = 'move';
            });

            // Drag end
            lineEl.addEventListener('dragend', (e) => {
                lineEl.style.opacity = '1';
                lineEl.style.cursor = 'grab';
                draggedIndex = null;

                // Remove all drag-over styles
                draggableLines.forEach(el => {
                    el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    el.style.background = 'rgba(255, 255, 255, 0.05)';
                });
            });

            // Drag over
            lineEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                if (draggedIndex !== null && draggedIndex !== parseInt(lineEl.dataset.idx)) {
                    lineEl.style.borderColor = '#0f62fe';
                    lineEl.style.background = 'rgba(15, 98, 254, 0.1)';
                }
            });

            // Drag leave
            lineEl.addEventListener('dragleave', (e) => {
                lineEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                lineEl.style.background = 'rgba(255, 255, 255, 0.05)';
            });

            // Drop
            lineEl.addEventListener('drop', (e) => {
                e.preventDefault();
                const dropIndex = parseInt(lineEl.dataset.idx);

                if (draggedIndex !== null && draggedIndex !== dropIndex) {
                    // Swap the lines
                    const temp = shuffledLines[draggedIndex];
                    shuffledLines[draggedIndex] = shuffledLines[dropIndex];
                    shuffledLines[dropIndex] = temp;
                    render();
                }
            });

            // Hover effects
            lineEl.addEventListener('mouseenter', () => {
                if (draggedIndex === null) {
                    lineEl.style.borderColor = 'rgba(15, 98, 254, 0.5)';
                    lineEl.style.transform = 'translateX(4px)';
                }
            });

            lineEl.addEventListener('mouseleave', () => {
                if (draggedIndex === null) {
                    lineEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    lineEl.style.transform = 'translateX(0)';
                }
            });
        });

        // Attach submit button listener
        const submitBtn = document.getElementById('unjumbleSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', checkUnjumble);
        }
    }

    async function checkUnjumble() {
        let correct = 0;
        const studentAnswers = [];
        const correctOrder = game.lines.map(l => l);
        const studentOrder = shuffledLines.map(l => l.text);

        shuffledLines.forEach((line, idx) => {
            const isCorrect = line.originalIndex === idx;
            if (isCorrect) correct++;

            studentAnswers.push({
                questionText: `Line ${idx + 1}`,
                studentAnswer: line.text,
                correctAnswer: correctOrder[idx],
                isCorrect: isCorrect
            });
        });

        const accuracy = correct / (game.lines ? game.lines.length : 1);
        const score = Math.round(accuracy * Number(game.totalPoints || 100));
        const tp = Number(game.totalPoints || 100);
        await saveResult(game, score, tp, startTime, studentAnswers);
        showResult(container, score, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', checkUnjumble);
    render();
}

function playSorter(game, container) {
    // Handle both old format (items as objects) and new format (items as strings with correctMapping)
    let items = game.items || [];
    const correctMapping = game.correctMapping || {};

    // Convert items to objects if they're strings
    let itemObjects = items.map(item => {
        if (typeof item === 'string') {
            return {
                name: item,
                category: correctMapping[item] || ''
            };
        }
        return item; // Already an object
    });

    let remainingItems = [...itemObjects];
    let score = 0;
    let startTime = Date.now();
    let currentItem = remainingItems.pop();
    const studentAnswers = []; // Track student choices

    function render() {
        if (!currentItem) return finish();

        container.innerHTML = `
            <div class="player-header"><span>Sort the Item</span><span class="timer">⏱️</span></div>
            <div class="question-display" style="text-align: center;">
                <h2 style="margin-bottom: 40px;">${currentItem.name || currentItem}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                    ${(game.categories || []).map(cat => `
                        <button class="option-btn category-btn" data-category="${cat}" style="text-align: center; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            ${cat}
                        </button>
                    `).join('')}
                </div>
                <p style="margin-top: 24px; color: #9ea4b6;">${remainingItems.length} items remaining</p>
            </div>
        `;

        // Attach event listeners to category buttons
        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.category;
                sortItem(cat);
            });
        });
    }

    function sortItem(cat) {
        const isCorrect = cat === currentItem.category;
        if (isCorrect) score += Number(game.pointsPerItem || 10);

        // Track student answer
        studentAnswers.push({
            questionText: `Sort: ${currentItem.name || currentItem}`,
            studentAnswer: cat,
            correctAnswer: currentItem.category,
            isCorrect: isCorrect
        });

        currentItem = remainingItems.pop();
        render();
    }

    async function finish() {
        const tp = Number(game.totalPoints || 100);
        await saveResult(game, score, tp, startTime, studentAnswers);
        showResult(container, score, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', finish);
    render();
}

function playFillIn(game, container) {
    let startTime = Date.now();
    let filledBlanks = {};

    // Handle both formats: array of strings or array of objects with {answer, position}
    let blanksArray = game.blanks || [];
    let wordBank = blanksArray.map(blank => {
        if (typeof blank === 'string') {
            return blank;
        } else if (typeof blank === 'object' && blank !== null) {
            // Try multiple possible property names
            return blank.answer || blank.text || blank.value || blank.word || JSON.stringify(blank);
        }
        return String(blank);
    }).sort(() => Math.random() - 0.5);

    function render() {
        let blankIndex = 0;
        let content = game.content || '';
        
        if (!content && game.description) {
            content = game.description;
        }
        
        if (!content) {
            container.innerHTML = '<div class="error-message">No content found for this challenge.</div>';
            return;
        }

        // Replace ___ with [blank] placeholders for consistent parsing
        content = content.replace(/___/g, '[blank]');

        // Fix: Corrected regex to match [blank] or [word] without requiring backslashes
        const parts = content.split(/(\[.*?\])/g);

        const renderedContent = parts.map(part => {
            if (part && part.startsWith('[') && part.endsWith(']')) {
                const idx = blankIndex++;
                const filled = filledBlanks[idx];
                return `<span class="blank-slot" data-idx="${idx}" style="display: inline-block; min-width: 80px; padding: 4px 8px; border: 2px dashed #0f62fe; background: rgba(15, 98, 254, 0.1); border-radius: 4px; color: #0f62fe; text-align: center; cursor: pointer; margin: 0 4px; font-weight: 600;">${filled || '___'}</span>`;
            }
            return part;
        }).join('').replace(/\\n/g, '\n').replace(/\n/g, '<br>');

        container.innerHTML = `
            <div class="player-header"><span>Fill in the blanks</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <div style="font-family: 'Courier New', monospace; line-height: 2; margin-bottom: 32px; background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; white-space: pre-wrap; font-size: 14px;">
                    ${renderedContent}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${wordBank.map((word, idx) => `
                        <button class="option-btn word-btn" data-word="${word}" data-idx="${idx}" style="width: auto; padding: 8px 16px; margin: 0; ${Object.values(filledBlanks).includes(word) ? 'opacity: 0.5; pointer-events: none;' : ''}">
                            ${word}
                        </button>
                    `).join('')}
                </div>
                <button id="fillinSubmitBtn" class="submit-btn" style="margin-top: 32px; width: 100%;">Submit</button>
            </div>
        `;

        // Attach event listeners to word buttons
        container.querySelectorAll('.word-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                useWord(word);
            });
        });

        // Attach event listeners to blank slots
        container.querySelectorAll('.blank-slot').forEach(slot => {
            slot.addEventListener('click', () => {
                const idx = parseInt(slot.dataset.idx);
                clearBlank(idx);
            });
        });

        // Attach submit button listener
        const submitBtn = document.getElementById('fillinSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', checkFillIn);
        }
    }

    function useWord(word) {
        for (let i = 0; i < wordBank.length; i++) {
            if (!filledBlanks[i]) {
                filledBlanks[i] = word;
                render();
                return;
            }
        }
    }

    function clearBlank(idx) {
        delete filledBlanks[idx];
        render();
    }

    async function checkFillIn() {
        let correct = 0;
        const studentAnswers = [];

        // Get correct answers from blanks array
        const correctAnswers = blanksArray.map(blank => {
            if (typeof blank === 'string') {
                return blank;
            } else if (typeof blank === 'object' && blank !== null) {
                // Try multiple possible property names
                return blank.answer || blank.text || blank.value || blank.word || JSON.stringify(blank);
            }
            return String(blank);
        });

        correctAnswers.forEach((ans, idx) => {
            const isCorrect = filledBlanks[idx] === ans;
            if (isCorrect) correct++;

            studentAnswers.push({
                questionText: `Blank ${idx + 1}`,
                studentAnswer: filledBlanks[idx] || 'Not filled',
                correctAnswer: ans,
                isCorrect: isCorrect
            });
        });

        const score = Math.round((correct / (correctAnswers.length || 1)) * Number(game.totalPoints || 100));
        await saveResult(game, score, Number(game.totalPoints || 100), startTime, studentAnswers);
        showResult(container, score, Number(game.totalPoints || 100), startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', checkFillIn);
    render();
}

function playSQL(game, container) {
    let startTime = Date.now();
    let builtQuery = [];
    let availableBlocks = [...(game.blocks || []), ...(game.distractors || [])].sort(() => Math.random() - 0.5);

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Build the Query</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 16px; color: #9ea4b6;">${game.description || ''}</p>
                <div style="min-height: 60px; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                    ${builtQuery.map((block, idx) => `
                        <button class="query-block-btn" data-idx="${idx}" style="background: var(--blue); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">${block}</button>
                    `).join('')}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${availableBlocks.map((block, idx) => `
                        <button class="option-btn available-block-btn" data-block="${block}" data-idx="${idx}" style="width: auto; padding: 8px 16px; margin: 0;">
                            ${block}
                        </button>
                    `).join('')}
                </div>
                <button id="sqlSubmitBtn" class="submit-btn" style="margin-top: 32px; width: 100%;">Submit Query</button>
            </div>
        `;

        // Attach event listeners to query blocks (for removal)
        container.querySelectorAll('.query-block-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                removeFromQuery(idx);
            });
        });

        // Attach event listeners to available blocks (for adding)
        container.querySelectorAll('.available-block-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const block = btn.dataset.block;
                const idx = parseInt(btn.dataset.idx);
                addToQuery(block, idx);
            });
        });

        // Attach submit button listener
        const submitBtn = document.getElementById('sqlSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', checkSQL);
        }
    }

    function addToQuery(block, idx) {
        builtQuery.push(block);
        availableBlocks.splice(idx, 1);
        render();
    }

    function removeFromQuery(idx) {
        const block = builtQuery[idx];
        availableBlocks.push(block);
        builtQuery.splice(idx, 1);
        render();
    }

    async function checkSQL() {
        const correctQuery = (game.blocks || []).join(' ');
        const userQuery = builtQuery.join(' ');
        const isCorrect = correctQuery === userQuery;
        const tp = Number(game.totalPoints || 100);
        const score = isCorrect ? tp : Math.round((builtQuery.filter((b, i) => b === (game.blocks || [])[i]).length / (game.blocks || [1]).length) * tp);

        const studentAnswers = [{
            questionText: 'Build the SQL Query',
            studentAnswer: userQuery || 'No query built',
            correctAnswer: correctQuery,
            isCorrect: isCorrect
        }];

        await saveResult(game, score, tp, startTime, studentAnswers);
        showResult(container, score, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', checkSQL);
    render();
}

// SQL Scenario - AI Graded, One Question at a Time
function playScenarioSQL(game, container) {
    let startTime = Date.now();

    // Support both old format (single scenarioQuestion) and new format (scenarioQuestions array)
    const questions = Array.isArray(game.scenarioQuestions) && game.scenarioQuestions.length > 0
        ? game.scenarioQuestions
        : [{ question: game.scenarioQuestion || game.description || 'Write the correct SQL query.', possibleQueries: game.possibleQueries || [] }];

    let currentIdx = 0;
    let totalScore = 0;
    const tp = Number(game.totalPoints || questions.length * 20);
    const pointsPerQ = Math.floor(tp / questions.length);
    const studentAnswers = [];

    function render() {
        if (currentIdx >= questions.length) {
            return finish();
        }
        const q = questions[currentIdx];
        const progress = (currentIdx / questions.length) * 100;

        container.innerHTML = `
            <div class="player-header">
                <span>🧠 SQL Scenario — Q${currentIdx + 1} of ${questions.length}</span>
                <span class="timer">⏱️</span>
            </div>
            <div class="question-display">
                <!-- Progress bar -->
                <div class="progress-bar" style="margin-bottom:24px;">
                    <div class="progress-fill" style="width:${progress}%"></div>
                </div>

                <div style="
                    background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08));
                    border: 1px solid rgba(139,92,246,0.3);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 28px;
                ">
                    <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a78bfa;margin-bottom:10px;">
                        ✦ Scenario Challenge ${currentIdx + 1}
                    </div>
                    <p style="font-size:1.1rem;line-height:1.7;color:var(--text);margin:0;">${q.question}</p>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px;">Your SQL Query</label>
                    <textarea id="studentSqlInput"
                        placeholder="Type your SQL query here... e.g. SELECT * FROM students"
                        style="
                            width: 100%;
                            min-height: 110px;
                            background: rgba(0,0,0,0.25);
                            border: 2px solid rgba(139,92,246,0.3);
                            border-radius: 12px;
                            padding: 16px;
                            color: var(--text, #f5f7ff);
                            font-family: 'JetBrains Mono', 'Courier New', monospace;
                            font-size: 15px;
                            line-height: 1.6;
                            resize: vertical;
                            outline: none;
                            box-sizing: border-box;
                            transition: border-color 0.2s;
                        "
                        onfocus="this.style.borderColor='rgba(139,92,246,0.7)'"
                        onblur="this.style.borderColor='rgba(139,92,246,0.3)'"
                    ></textarea>
                </div>

                <div style="display:flex;align-items:center;gap:8px;background:rgba(139,92,246,0.07);border-radius:10px;padding:12px 16px;margin-bottom:28px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span style="font-size:0.85rem;color:#a78bfa;">The AI will evaluate your answer. Variations in formatting and case are accepted.</span>
                </div>

                <button id="scenariSqlSubmitBtn" style="
                    width: 100%;
                    padding: 16px 24px;
                    border: none;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #8b5cf6, #6366f1);
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 20px rgba(139, 92, 246, .35);
                    transition: opacity .2s;
                ">⚡&nbsp; Submit Answer</button>
            </div>
        `;

        const submitBtn = document.getElementById('scenariSqlSubmitBtn');
        if (submitBtn) submitBtn.addEventListener('click', () => submitAnswer(q));
    }

    async function submitAnswer(q) {
        const textarea = document.getElementById('studentSqlInput');
        const studentQuery = textarea ? textarea.value.trim() : '';

        if (!studentQuery) {
            if (textarea) {
                textarea.style.borderColor = '#ef4444';
                textarea.placeholder = 'Please enter a query before submitting!';
            }
            return;
        }

        const submitBtn = document.getElementById('scenariSqlSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳&nbsp; AI is grading...';
        }

        let isCorrect = false;
        try {
            if (q.possibleQueries && q.possibleQueries.length > 0) {
                const evalRes = await fetch('/api/sql-scenario/evaluate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        studentQuery,
                        possibleQueries: q.possibleQueries,
                        question: q.question
                    })
                });
                const evalData = await evalRes.json();
                isCorrect = evalData.ok && evalData.isCorrect === true;
            }
        } catch (err) {
            console.error('Evaluate error:', err);
            const norm = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
            isCorrect = (q.possibleQueries || []).some(pq => norm(pq) === norm(studentQuery));
        }

        if (isCorrect) totalScore += pointsPerQ;

        studentAnswers.push({
            questionText: q.question,
            studentAnswer: studentQuery,
            correctAnswer: (q.possibleQueries || [])[0] || 'N/A',
            isCorrect
        });

        // Show quick feedback then advance
        showFeedback(isCorrect, () => {
            currentIdx++;
            render();
        });
    }

    function showFeedback(isCorrect, next) {
        const display = container.querySelector('.question-display');
        if (!display) { next(); return; }

        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
            background: rgba(0,0,0,0.65); z-index: 9999; animation: fadeIn .15s ease;
        `;
        feedback.innerHTML = `
            <div style="
                background: var(--surface, #1a1f2e);
                border: 2px solid ${isCorrect ? '#22c55e' : '#ef4444'};
                border-radius: 20px; padding: 40px 56px; text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,.5);
            ">
                <div style="font-size:3.5rem;margin-bottom:12px;">${isCorrect ? '✅' : '❌'}</div>
                <div style="font-size:1.5rem;font-weight:800;color:${isCorrect ? '#22c55e' : '#ef4444'};margin-bottom:8px;">${isCorrect ? 'Correct!' : 'Incorrect'}</div>
                <div style="color:var(--muted);font-size:0.95rem;">${isCorrect ? `+${pointsPerQ} XP earned` : 'Better luck next time!'}</div>
            </div>
        `;
        document.body.appendChild(feedback);
        setTimeout(() => { feedback.remove(); next(); }, 1400);
    }

    async function finish() {
        if (window.timerInterval) clearInterval(window.timerInterval);
        await saveResult(game, totalScore, tp, startTime, studentAnswers);
        showResult(container, totalScore, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', async () => {
        // Time's up — save whatever we have
        await saveResult(game, totalScore, tp, startTime, studentAnswers);
        showResult(container, totalScore, tp, startTime, game._id || game.id);
    });

    render();
}


// NEW: Debug the Monolith - Code Editor Version
function playDebug(game, container) {
    let startTime = Date.now();
    let studentEditor;

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Debug the Code</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 16px; color: #9ea4b6;">${game.description || 'Fix the bugs in the code below'}</p>
                
                <div style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 12px; font-size: 14px; color: #ff3b30;">🐛 Buggy Code (Read-Only)</h4>
                    <textarea id="buggyCodeDisplay"></textarea>
                </div>

                <div>
                    <h4 style="margin: 0 0 12px; font-size: 14px; color: #34c759;">✅ Your Fix (Write your corrected code here)</h4>
                    <textarea id="studentCodeEditor"></textarea>
                </div>

                <button id="debugSubmitBtn" style="
                    margin-top: 24px;
                    width: 100%;
                    padding: 14px 24px;
                    border: none;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 700;
                    letter-spacing: .02em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: opacity .15s, transform .15s;
                    box-shadow: 0 4px 20px rgba(99,102,241,.35);
                ">🔍 &nbsp;Submit Solution</button>
            </div>
        `;

        // Initialize CodeMirror editors
        setTimeout(() => {
            const mode = game.language === 'python' ? 'python' :
                game.language === 'java' ? 'text/x-java' :
                    game.language === 'cpp' ? 'text/x-c++src' : 'javascript';

            // Buggy code (read-only)
            const buggyEditor = CodeMirror.fromTextArea(document.getElementById('buggyCodeDisplay'), {
                mode: mode,
                theme: 'dracula',
                lineNumbers: true,
                readOnly: true
            });
            buggyEditor.setValue(game.buggyCode || '');

            // Student editor (editable)
            studentEditor = CodeMirror.fromTextArea(document.getElementById('studentCodeEditor'), {
                mode: mode,
                theme: 'dracula',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4
            });
            studentEditor.setValue(game.buggyCode || ''); // Pre-fill with buggy code

            // Attach submit button listener
            const submitBtn = document.getElementById('debugSubmitBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', checkDebug);
            }
        }, 100);
    }

    async function checkDebug() {
        if (!studentEditor) {
            alert('Editor not loaded yet, please wait...');
            return;
        }

        const studentCode = studentEditor.getValue();
        const perfectCode = game.perfectCode || '';
        const buggyCode = game.buggyCode || '';

        // Debug logging
        console.log('=== DEBUG GAME SCORING ===');
        console.log('Student Code (first 200 chars):', studentCode.substring(0, 200));
        console.log('Perfect Code (first 200 chars):', perfectCode.substring(0, 200));
        console.log('Buggy Code (first 200 chars):', buggyCode.substring(0, 200));

        // SAFETY CHECK: If perfect code equals buggy code, the game is broken
        if (game.perfectCode === game.buggyCode) {
            console.error('⚠️ BROKEN GAME: Perfect code and buggy code are identical!');
            container.innerHTML = `
                <div class="question-display" style="text-align: center;">
                    <h2 style="font-size: 32px; margin-bottom: 24px; color: #ff3b30;">⚠️ Game Error</h2>
                    <p style="color: #9ea4b6; margin-bottom: 24px;">This game was created incorrectly. The perfect code and buggy code are the same, making it impossible to score properly.</p>
                    <p style="color: #9ea4b6; margin-bottom: 24px;">Please contact your instructor to recreate this game.</p>
                    <button id="backToGamesBtn" class="primary-btn" style="width: 100%;">Back to Games</button>
                </div>
            `;
            const backBtn = document.getElementById('backToGamesBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    window.location.href = 'student-game.html';
                });
            }
            return;
        }

        // NEW SCORING: Count how many bugs were fixed
        const bugs = game.bugs || [];
        const totalBugs = bugs.length;
        let bugsFixed = 0;

        console.log('Total bugs in game:', totalBugs);
        console.log('Bug details:', bugs);

        // Check each bug to see if it was fixed
        bugs.forEach((bug, index) => {
            const buggedLine = bug.bugged || '';
            const originalLine = bug.original || '';

            // Get the corresponding line from student's code
            const studentLines = studentCode.split('\n');
            const lineIndex = bug.line - 1; // Convert to 0-indexed

            if (lineIndex >= 0 && lineIndex < studentLines.length) {
                const studentLine = studentLines[lineIndex].trim();
                const buggedLineTrimmed = buggedLine.trim();
                const originalLineTrimmed = originalLine.trim();

                // Check if student fixed this bug (their line matches the original, not the bugged version)
                const isFixed = studentLine === originalLineTrimmed && studentLine !== buggedLineTrimmed;

                console.log(`Bug ${index + 1} on line ${bug.line}:`);
                console.log('  Original:', originalLineTrimmed);
                console.log('  Bugged:', buggedLineTrimmed);
                console.log('  Student:', studentLine);
                console.log('  Fixed?', isFixed);

                if (isFixed) {
                    bugsFixed++;
                }
            }
        });

        console.log(`Bugs fixed: ${bugsFixed}/${totalBugs}`);

        // Calculate score based on bugs fixed
        const percentage = totalBugs > 0 ? Math.round((bugsFixed / totalBugs) * 100) : 0;
        const score = Math.round((percentage / 100) * game.totalPoints);

        console.log('Final score:', score, '/', game.totalPoints, `(${percentage}%)`);

        // Track student answer
        const studentAnswers = [{
            questionText: 'Debug the Code',
            studentAnswer: `Fixed ${bugsFixed}/${totalBugs} bugs`,
            correctAnswer: `All ${totalBugs} bugs should be fixed`,
            isCorrect: bugsFixed === totalBugs
        }];

        const tp = Number(game.totalPoints || 100);
        await saveResult(game, score, tp, startTime, studentAnswers);

        // Use the standard showResult function to display leaderboard
        showResult(container, score, tp, startTime, game._id || game.id);
    }

    startTimer(game.duration || 15, '#appContainer', checkDebug);
    render();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === HELPER FUNCTIONS ===

async function saveResult(game, score, totalPoints, startTime, studentAnswers = []) {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const percentage = Math.round((score / totalPoints) * 100);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return false;
        }

        // Submit to backend API with time tracking and anti-cheat logs
        const response = await fetch(`${window.location.origin}/api/game-submissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                gameId: game._id || game.id,
                score: percentage,
                isCorrect: percentage >= 70,
                studentAnswers: studentAnswers,
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                durationSeconds: timeTaken,
                cheatingAttempts: window.cheatingAttempts || 0,
                cheatLogs: window.cheatLogs || []
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit game result');
        }

        // SIGNAL REFRESH: Notify other tabs that a game was completed
        localStorage.setItem('mw_game_refresh', Date.now());

        return true;
    } catch (error) {
        console.error('Save result error:', error);
        // Fallback to localStorage
        const doubleXP = localStorage.getItem('doubleXP') === 'true';
        const rawScore = doubleXP ? score * 2 : score;

        const activity = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            gameId: game._id || game.id,
            gameTitle: game.title,
            gameType: game.type,
            studentEmail: currentUserEmail,
            studentName: currentUserName,
            score: percentage,
            rawScore: rawScore,
            timeTaken: timeTaken,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            status: 'completed'
        };

        const activities = loadData(activityKey);
        activities.push(activity);
        saveData(activityKey, activities);
        return false;
    }
}

function showResult(container, score, totalPoints, startTime, gameId) {
    const percentage = Math.round((score / totalPoints) * 100);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    // Show loading message
    container.innerHTML = `
        <div class="question-display" style="text-align: center;">
            <h2 style="font-size: 32px; margin-bottom: 24px;">Loading scoreboard...</h2>
            <p style="color: #9ea4b6;">Calculating your rank…</p>
        </div>
    `;

    // Wait 1 second before fetching leaderboard so the backend can index the submission
    if (gameId) {
        setTimeout(() => showScoreboard(gameId, score, totalPoints), 1000);
    } else {
        showSimpleResult(score, totalPoints);
    }

    if (percentage >= 70) {
        fireConfetti();
    }

    // Refresh hero strip with real XP from the server
    updatePlayerStats();
}

function startTimer(durationMinutes, containerSelector, onFinish) {
    // ── Timer persistence across reloads ──────────────────────────────────
    // Store the absolute deadline in sessionStorage (tab-specific, auto-clears
    // when the tab/window is closed). Key is scoped to the game so different
    // games don't collide.
    const gameId   = new URLSearchParams(window.location.search).get('id') || 'game';
    const timerKey = 'mw_timer_end_' + gameId;
    const now      = Date.now();

    let endTime = parseInt(sessionStorage.getItem(timerKey) || '0');
    if (!endTime || endTime <= now) {
        endTime = now + durationMinutes * 60 * 1000;
        sessionStorage.setItem(timerKey, endTime);
    }

    function getRemainingSeconds() {
        return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    }

    function updateDisplay(t) {
        if (t < 0) t = 0;
        const minutes = Math.floor(t / 60);
        const seconds = t % 60;
        const display = document.querySelector(`${containerSelector} .timer`);
        if (display) {
            display.textContent = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            if (t < 60) display.style.color = '#ff3b30';
        }
    }

    setTimeout(() => updateDisplay(getRemainingSeconds()), 0);

    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = setInterval(() => {
        const remaining = getRemainingSeconds();
        updateDisplay(remaining);

        if (remaining <= 0) {
            clearInterval(window.timerInterval);
            sessionStorage.removeItem(timerKey); // clean up so replay starts fresh
            onFinish();
        }
    }, 1000);
}

// Fullscreen helper
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
}

// === SCENARIO GAME ENGINE ===
function playScenario(game, container) {
    let currentSceneId = game.scenes && game.scenes.length > 0 ? game.scenes[0].id : null;
    let totalScore = 0;
    let startTime = Date.now();
    const studentAnswers = [];

    function renderScene() {
        const scene = game.scenes.find(s => s.id === currentSceneId);

        if (!scene || currentSceneId === null) {
            // Game ended
            finishScenario();
            return;
        }

        container.innerHTML = `
            <div class="player-header">
                <span>🎭 Scenario</span>
                <span>Score: ${totalScore} pts</span>
            </div>
            <div class="question-display">
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <p style="font-size: 18px; line-height: 1.6; color: #f5f7ff; margin: 0;">${scene.text}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${scene.choices.map((choice, index) => `
                        <button class="option-btn choice-btn" data-choice-index="${index}" style="text-align: left; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                            <span>${choice.text}</span>
                            <span style="background: ${choice.points >= 0 ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'}; color: ${choice.points >= 0 ? '#34c759' : '#ff3b30'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                ${choice.points > 0 ? '+' : ''}${choice.points} pts
                            </span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Attach event listeners to choice buttons
        container.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choiceIndex = parseInt(btn.dataset.choiceIndex);
                makeChoice(scene, choiceIndex);
            });
        });
    }

    function makeChoice(scene, choiceIndex) {
        const choice = scene.choices[choiceIndex];

        // Track student answer
        studentAnswers.push({
            questionText: scene.text,
            studentAnswer: choice.text,
            points: Number(choice.points || 0),
            isCorrect: Number(choice.points || 0) > 0
        });

        // Update score
        totalScore += Number(choice.points || 0);

        // Move to next scene or end
        if (choice.nextSceneId === 'END') {
            currentSceneId = null;
        } else {
            currentSceneId = parseInt(choice.nextSceneId);
        }

        renderScene();
    }

    async function finishScenario() {
        const totalPossiblePoints = Number(game.totalPoints || 100);
        await saveResult(game, totalScore, totalPossiblePoints, startTime, studentAnswers);
        showResult(container, totalScore, totalPossiblePoints, startTime, game._id || game.id);
    }

    renderScene();
}

function fireConfetti() {
    const colors = [
        '#6366f1', '#a855f7', '#ec4899', '#f59e0b',
        '#10b981', '#3b82f6', '#f43f5e', '#fbbf24',
        '#34d399', '#60a5fa', '#e879f9', '#fb923c'
    ];
    const shapes = ['circle', 'square', 'rect', 'triangle'];

    function spawnBurst(count, offsetMs) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const c = document.createElement('div');
                const color = colors[Math.floor(Math.random() * colors.length)];
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const size = 6 + Math.random() * 10;
                const startX = 20 + Math.random() * 60; // spread across 20-80vw
                const drift = (Math.random() - 0.5) * 14; // horizontal drift vw
                const spinDeg = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720);
                const fallDuration = 1.8 + Math.random() * 1.2;

                c.style.cssText = `
                    position: fixed;
                    left: ${startX}vw;
                    top: -20px;
                    width: ${shape === 'rect' ? size * 2 : size}px;
                    height: ${shape === 'rect' ? size * 0.5 : size}px;
                    background: ${color};
                    z-index: 999999;
                    pointer-events: none;
                    opacity: 1;
                    border-radius: ${shape === 'circle' ? '50%' : shape === 'square' ? '2px' : shape === 'rect' ? '2px' : '0'};
                    clip-path: ${shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'};
                    transform-origin: center;
                    will-change: transform, top, opacity;
                    transition: top ${fallDuration}s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                transform ${fallDuration}s linear,
                                left ${fallDuration}s ease-in-out,
                                opacity 0.4s ease ${fallDuration - 0.4}s;
                `;
                document.body.appendChild(c);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        c.style.top = '110vh';
                        c.style.left = `calc(${startX}vw + ${drift}vw)`;
                        c.style.transform = `rotate(${spinDeg}deg)`;
                        c.style.opacity = '0';
                    });
                });

                setTimeout(() => c.remove(), (fallDuration + 0.5) * 1000);
            }, offsetMs + Math.random() * 400);
        }
    }

    spawnBurst(80, 0);        // first wave
    spawnBurst(60, 600);      // second wave offset for layered effect
}

// === SCOREBOARD FUNCTIONS ===

async function showScoreboard(gameId, score, totalPoints) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            // Show modal with empty leaderboard
            renderScoreboard({ leaderboard: [], currentStudent: null, totalParticipants: 0 }, score, totalPoints);
            return;
        }

        // Fetch leaderboard data
        const response = await fetch(`${window.location.origin}/api/games/${gameId}/leaderboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Leaderboard API error:', response.status, response.statusText);
            // Show modal with empty leaderboard
            renderScoreboard({ leaderboard: [], currentStudent: null, totalParticipants: 0 }, score, totalPoints);
            return;
        }

        const data = await response.json();

        if (data.ok) {
            renderScoreboard(data, score, totalPoints);
        } else {
            console.error('Leaderboard data error:', data.message);
            // Show modal with empty leaderboard
            renderScoreboard({ leaderboard: [], currentStudent: null, totalParticipants: 0 }, score, totalPoints);
        }
    } catch (error) {
        console.error('Scoreboard error:', error);
        // Show modal with empty leaderboard instead of alert
        renderScoreboard({ leaderboard: [], currentStudent: null, totalParticipants: 0 }, score, totalPoints);
    }
}

function renderScoreboard(data, score, totalPoints) {
    const modal = document.getElementById('scoreboardModal');
    const scoreCard = document.getElementById('studentScoreCard');
    const answerReviewSection = document.getElementById('answerReviewSection');
    const answerReviewList = document.getElementById('answerReviewList');
    const leaderboardBody = document.getElementById('leaderboardBody');

    if (!modal) return;

    // Render score card
    const s = Number(score) || 0;
    const tp = Number(totalPoints) || 100;
    const percentage = Math.round((s / tp) * 100);
    const currentStudent = data.currentStudent || {};

    if (!scoreCard) return;

    // ── Client-side rank + leaderboard fallback ──
    // If the API returns nothing (no currentStudent, empty leaderboard),
    // build synthetic data from the student's own session so the scoreboard
    // always shows something meaningful.
    let rank = (currentStudent && currentStudent.rank) ? currentStudent.rank : null;
    let totalParticipants = data.totalParticipants || 0;
    let leaderboard = data.leaderboard || [];

    if (!rank || rank === 'N/A') {
        const myEntry = leaderboard.find(e => e.isCurrentStudent);
        if (myEntry) rank = myEntry.rank || (leaderboard.indexOf(myEntry) + 1);
    }

    // If leaderboard is empty, build a synthetic row for the current student
    if (leaderboard.length === 0) {
        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const studentName = [firstName, lastName].filter(Boolean).join(' ') || 'You';
        leaderboard = [{
            rank: 1,
            studentName: studentName,
            score: percentage,
            gamesPlayed: 1,
            accuracy: percentage,
            isCurrentStudent: true
        }];
        if (!rank || rank === 'N/A') rank = 1;
        if (!totalParticipants) totalParticipants = 1;
    }

    if (!rank) rank = 'N/A';
    if (!totalParticipants && leaderboard.length > 0) totalParticipants = leaderboard.length;

    // Patch data so the leaderboard renderer below uses the fallback
    data = Object.assign({}, data, { leaderboard });

    scoreCard.innerHTML = `
        <div style="background: var(--glass-strong); border: 1px solid var(--border); border-radius: 20px; padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div style="text-align: left;">
                <span style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Your Score</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: var(--primary-light);">${s} / ${tp}</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Accuracy: ${percentage}%</span>
            </div>
            <div style="text-align: right; border-left: 1px solid var(--border); padding-left: 24px;">
                <span style="display: block; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Class Rank</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: #fff;">#${rank}</span>
                <span style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">of ${totalParticipants} students</span>
            </div>
        </div>
    `;

    // Render answer review if available
    if (data.answerReview && data.answerReview.questions && data.answerReview.questions.length > 0) {
        answerReviewSection.style.display = 'block';
        answerReviewList.innerHTML = data.answerReview.questions.map((q, index) => {
            const isCorrect = q.isCorrect;
            const itemClass = isCorrect ? 'correct' : 'incorrect';
            const icon = isCorrect ? '✅' : '❌';

            return `
                <div class="answer-item" style="background: var(--glass); border: 1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border-radius: 16px; padding: 20px; margin-bottom: 12px; transition: transform 0.2s;">
                    <div style="color: var(--text-muted); font-size: 0.75rem; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Question ${index + 1}</div>
                    <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; line-height: 1.4;">${q.questionText}</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display:flex; align-items:center; gap:10px; font-weight:600; color: ${isCorrect ? '#4ade80' : '#f87171'}">
                            <span style="font-size: 1.2rem;">${icon}</span>
                            <span>Your Answer: ${q.studentAnswer}</span>
                        </div>
                        ${!isCorrect ? `
                            <div style="display:flex; align-items:center; gap:10px; font-weight:600; color: #4ade80; opacity: 0.8; padding-left: 28px;">
                                <span>Correct: ${q.correctAnswer}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        answerReviewSection.style.display = 'none';
    }

    // Render leaderboard
    if (leaderboardBody) {
        if (data.leaderboard && data.leaderboard.length > 0) {
            leaderboardBody.innerHTML = data.leaderboard.map(entry => {
                const rowClass = entry.isCurrentStudent ? 'current-student' : (entry.rank <= 3 ? 'top-3' : '');
                return `
                    <tr class="${rowClass}">
                        <td>${entry.rank}</td>
                        <td>${entry.isCurrentStudent ? 'You' : entry.studentName}</td>
                        <td>${entry.score}%</td>
                        <td>${entry.gamesPlayed || 1}</td>
                        <td>${entry.accuracy || entry.score}%</td>
                    </tr>
                `;
            }).join('');
        } else {
            leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No leaderboard data available</td></tr>';
        }
    }

    // Show modal
    modal.style.display = 'flex';

    // Setup button handlers
    const playAgainBtn = document.getElementById('playAgainBtn');
    const backToGamesBtn = document.getElementById('backToGamesBtn');

    playAgainBtn.onclick = () => {
        modal.style.display = 'none';
        const gId = new URLSearchParams(window.location.search).get('id');
        const game = (window.allGames || []).find(g => (g._id || g.id) === gId);
        if (game) launchGame(game);
        else window.location.reload();
    };

    backToGamesBtn.onclick = () => {
        modal.style.display = 'none';
        if (window.isProMode) {
            window.close();
        } else {
            window.location.href = 'student-game.html';
        }
    };

    // Fire confetti for good scores
    if (percentage >= 70) {
        fireConfetti();
    }
}

function showSimpleResult(score, totalPoints) {
    // Fallback if API fails
    const percentage = Math.round((score / totalPoints) * 100);
    alert(`Game Complete!\n\nYour Score: ${score}/${totalPoints} (${percentage}%)`);
    window.location.href = 'student-game.html';
}
