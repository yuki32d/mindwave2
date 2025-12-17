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

document.addEventListener('DOMContentLoaded', () => {
    if (gameId) {
        initGamePlayer(gameId);
    } else {
        initGameLobby();
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

function renderGameList(games) {
    const container = document.getElementById('appContainer');
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #9ea4b6;">
                <h2>No active games found</h2>
                <p>Check back later for new assignments.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = games.map(game => `
        <article class="game-card" data-id="${game._id || game.id}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3>${game.title}</h3>
                <span class="meta-tag">${getGameMeta(game)}</span>
            </div>
            <p>${game.brief || game.description || 'No description provided.'}</p>
            <div style="display: flex; gap: 12px; font-size: 13px; color: #9ea4b6;">
                <span>⏱️ ${game.difficulty || 'Normal'}</span>
                <span>🎮 ${formatGameType(game.type)}</span>
            </div>
        </article>
    `).join('');

    // Add click listeners to cards
    container.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = `?id=${card.dataset.id}`;
        });
    });
}

function filterGames(type, targetBtn) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#9ea4b6';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
    });

    if (targetBtn) {
        targetBtn.style.background = 'rgba(255,255,255,0.1)';
        targetBtn.style.color = 'white';
        targetBtn.style.border = 'none';
    }

    if (!window.allGames) return;

    if (type === 'all') return renderGameList(window.allGames);

    const filtered = window.allGames.filter(g => {
        if (type === 'quiz') return g.type === 'quiz' || g.type === 'trivia-challenge';
        if (type === 'logic') return g.type.includes('unjumble') || g.type.includes('sorter') || g.type.includes('logic') || g.type === 'bug-hunt';
        if (type === 'builder') return g.type.includes('sql') || g.type.includes('fill');
        return false;
    });
    renderGameList(filtered);
};

function updatePlayerStats() {
    const activities = loadData(activityKey);
    const totalScore = activities.reduce((acc, curr) => acc + (curr.score || curr.rawScore || 0), 0);
    const wins = activities.filter(a => a.status === 'completed').length;

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
}

function getGameMeta(game) {
    if (game.type === 'quiz') return (game.questions ? game.questions.length : 0) + ' Questions';
    if (game.type === 'unjumble' || game.type === 'code-unjumble') return (game.lines ? game.lines.length : 0) + ' Lines';
    if (game.type === 'sorter' || game.type === 'tech-sorter') return (game.items ? game.items.length : 0) + ' Items';
    if (game.type === 'fillin' || game.type === 'syntax-fill') return (game.blanks ? game.blanks.length : 0) + ' Blanks';
    if (game.type === 'sql' || game.type === 'sql-builder') return (game.blocks ? game.blocks.length : 0) + ' Blocks';
    if (game.type === 'bug-hunt') return (game.bugCount || 0) + ' Bugs';
    if (game.type === 'scenario') return (game.scenes ? game.scenes.length : 0) + ' Scenes';
    return 'Game';
}

function formatGameType(type) {
    if (type === 'quiz') return 'Quiz';
    if (type === 'unjumble' || type === 'code-unjumble') return 'Logic Unjumble';
    if (type === 'sorter' || type === 'tech-sorter') return 'Tech Sorter';
    if (type === 'fillin' || type === 'syntax-fill') return 'Syntax Fill-in';
    if (type === 'sql' || type === 'sql-builder') return 'SQL Builder';
    if (type === 'bug-hunt') return 'Debug the Monolith';
    if (type === 'scenario') return 'Scenario';
    return 'Challenge';
}

async function initGamePlayer(gameId) {
    const container = document.getElementById('appContainer');
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: #9ea4b6;">Loading game...</div>';

    try {
        // We need to fetch all published games to find this one, or ideally we'd have a single game endpoint
        // For now, let's reuse the published games endpoint as it's safer than adding a new one right now
        const res = await fetch('/api/games/published');
        const data = await res.json();

        if (!data.ok) throw new Error('Failed to load game data');

        const games = data.games || [];
        const game = games.find(g => (g._id === gameId || g.id === gameId));

        if (!game) {
            alert('Game not found!');
            window.location.href = 'student-game.html';
            return;
        }

        document.getElementById('pageTitle').textContent = game.title;
        document.getElementById('pageDesc').textContent = game.brief || game.description || 'Complete the challenge to earn points.';
        const backLink = document.getElementById('backLink');
        backLink.href = 'student-game.html';
        backLink.textContent = '← Quit Game';

        container.innerHTML = ''; // Clear loading message

        try {
            switch (game.type) {
                case 'quiz':
                    playQuiz(game, container);
                    break;
                case 'unjumble':
                case 'code-unjumble':
                    playUnjumble(game, container);
                    break;
                case 'sorter':
                case 'tech-sorter':
                    playSorter(game, container);
                    break;
                case 'fillin':
                case 'syntax-fill':
                    playFillIn(game, container);
                    break;
                case 'sql':
                case 'sql-builder':
                    playSQL(game, container);
                    break;
                case 'bug-hunt':
                    playDebug(game, container);
                    break;
                case 'scenario':
                    playScenario(game, container);
                    break;
                default:
                    if (game.questions) {
                        playQuiz(game, container);
                    } else {
                        container.innerHTML = '<p>Unknown game type.</p>';
                    }
            }
        } catch (err) {
            console.error('Game Error:', err);
            container.innerHTML = `
                <div class="error-message">
                    <h3>Something went wrong</h3>
                    <p>We couldn't load this game. Error: ${err.message}</p>
                    <button class="secondary-btn" onclick="window.location.reload()" style="margin-top: 12px; background: rgba(0,0,0,0.2); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Try Again</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to init game:', error);
        container.innerHTML = '<div class="error-message">Failed to load game. Please try again.</div>';
    }
}

// === GAME ENGINES ===

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
                    <button id="quitBtn" class="secondary-btn" style="background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.2); padding: 12px 24px; border-radius: 8px; cursor: pointer;">Quit</button>
                    <button id="submitBtn" class="submit-btn" style="flex: 1; opacity: ${selectedOptionIndex === null ? '0.5' : '1'}; cursor: ${selectedOptionIndex === null ? 'not-allowed' : 'pointer'};" ${selectedOptionIndex === null ? 'disabled' : ''}>Submit Answer</button>
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
                const isCorrect = selectedOptionIndex === q.correctIndex;
                studentAnswers.push({
                    questionText: q.text,
                    studentAnswer: q.options[selectedOptionIndex],
                    correctAnswer: q.options[q.correctIndex],
                    isCorrect: isCorrect,
                    options: q.options
                });

                // Check if answer is correct and add points
                if (isCorrect) {
                    score += (q.points || 10);
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
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 10), 0);
        await saveResult(game, score, totalPoints, startTime, studentAnswers);
        showResult(container, score, totalPoints, startTime, game._id || game.id);
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
                <p style="margin-bottom: 24px; color: #9ea4b6;">
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
                <button id="unjumbleSubmitBtn" class="submit-btn" style="margin-top: 32px; width: 100%;">Submit Solution</button>
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
        const score = Math.round(accuracy * game.totalPoints);
        await saveResult(game, score, game.totalPoints, startTime, studentAnswers);
        showResult(container, score, game.totalPoints, startTime, game._id || game.id);
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
                <h2 style="font-size: 32px; margin-bottom: 32px;">${currentItem.name || currentItem}</h2>
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
        if (isCorrect) score += 10;

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
        await saveResult(game, score, game.totalPoints, startTime, studentAnswers);
        showResult(container, score, game.totalPoints, startTime, game._id || game.id);
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

        // Replace ___ with [blank] placeholders for consistent parsing
        content = content.replace(/___/g, '[blank]');

        const parts = content.split(/(\\[.*?\\])/g);

        const renderedContent = parts.map(part => {
            if (part.startsWith('[') && part.endsWith(']')) {
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

        const score = Math.round((correct / (correctAnswers.length || 1)) * game.totalPoints);
        await saveResult(game, score, game.totalPoints, startTime, studentAnswers);
        showResult(container, score, game.totalPoints, startTime, game._id || game.id);
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
        const score = isCorrect ? game.totalPoints : Math.round((builtQuery.filter((b, i) => b === game.blocks[i]).length / game.blocks.length) * game.totalPoints);

        const studentAnswers = [{
            questionText: 'Build the SQL Query',
            studentAnswer: userQuery || 'No query built',
            correctAnswer: correctQuery,
            isCorrect: isCorrect
        }];

        await saveResult(game, score, game.totalPoints, startTime, studentAnswers);
        showResult(container, score, game.totalPoints, startTime, game._id || game.id);
    }

    startTimer(game.duration || 10, '#appContainer', checkSQL);
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

                <button id="debugSubmitBtn" class="submit-btn" style="margin-top: 24px; width: 100%;">Submit Fix</button>
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

        await saveResult(game, score, game.totalPoints, startTime, studentAnswers);

        // Use the standard showResult function to display leaderboard
        showResult(container, score, game.totalPoints, startTime, game._id || game.id);
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

        // Submit to backend API with time tracking
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
                durationSeconds: timeTaken
            })
        });

        if (!response.ok) {
            throw new Error('Failed to submit game result');
        }

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
            <p style="color: #9ea4b6;">Please wait</p>
        </div>
    `;

    // Show scoreboard with leaderboard and answer review
    if (gameId) {
        showScoreboard(gameId, score, totalPoints);
    } else {
        // Fallback if no gameId
        showSimpleResult(score, totalPoints);
    }

    if (percentage >= 70) {
        fireConfetti();
    }
}

function startTimer(durationMinutes, containerSelector, onFinish) {
    let timer = durationMinutes * 60;

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

    setTimeout(() => updateDisplay(timer), 0);

    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = setInterval(() => {
        timer--;
        updateDisplay(timer);

        if (timer < 0) {
            clearInterval(window.timerInterval);
            onFinish();
        }
    }, 1000);
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
            points: choice.points,
            isCorrect: choice.points > 0
        });

        // Update score
        totalScore += choice.points;

        // Move to next scene or end
        if (choice.nextSceneId === 'END') {
            currentSceneId = null;
        } else {
            currentSceneId = parseInt(choice.nextSceneId);
        }

        renderScene();
    }

    async function finishScenario() {
        const totalPossiblePoints = game.totalPoints || 100;
        await saveResult(game, totalScore, totalPossiblePoints, startTime, studentAnswers);
        showResult(container, totalScore, totalPossiblePoints, startTime, game._id || game.id);
    }

    renderScene();
}

function fireConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.position = 'fixed';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.top = '-10px';
        c.style.width = '10px';
        c.style.height = '10px';
        c.style.backgroundColor = ['#ff3b30', '#ff9f0a', '#34c759', '#0f62fe'][Math.floor(Math.random() * 4)];
        c.style.zIndex = '9999';
        c.style.transition = 'top 2s ease-in, transform 2s ease-in';
        document.body.appendChild(c);

        setTimeout(() => {
            c.style.top = '110vh';
            c.style.transform = `rotate(${Math.random() * 360}deg)`;
        }, 10);

        setTimeout(() => c.remove(), 2000);
    }
}

// === SCOREBOARD FUNCTIONS ===

async function showScoreboard(gameId, score, totalPoints) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        // Fetch leaderboard data
        const response = await fetch(`${window.location.origin}/api/games/${gameId}/leaderboard`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();

        if (data.ok) {
            renderScoreboard(data, score, totalPoints);
        }
    } catch (error) {
        console.error('Scoreboard error:', error);
        // Fallback to simple result display
        showSimpleResult(score, totalPoints);
    }
}

function renderScoreboard(data, score, totalPoints) {
    const modal = document.getElementById('scoreboardModal');
    const scoreCard = document.getElementById('studentScoreCard');
    const answerReviewSection = document.getElementById('answerReviewSection');
    const answerReviewList = document.getElementById('answerReviewList');
    const leaderboardBody = document.getElementById('leaderboardBody');

    // Render score card
    const percentage = Math.round((score / totalPoints) * 100);
    const currentStudent = data.currentStudent || {};
    const rank = currentStudent.rank || 'N/A';
    const totalParticipants = data.totalParticipants || 0;

    scoreCard.innerHTML = `
        <div class="score-display">
            <span class="score-label">Your Score:</span>
            <span class="score-value">${score}/${totalPoints} (${percentage}%)</span>
        </div>
        <div class="rank-display">
            <span class="rank-label">Your Rank:</span>
            <span class="rank-value">#${rank} out of ${totalParticipants}</span>
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
                <div class="answer-item ${itemClass}">
                    <div class="question-text">Q${index + 1}: ${q.questionText}</div>
                    <div class="student-answer ${isCorrect ? 'correct' : 'incorrect'}">
                        <span class="answer-icon">${icon}</span>
                        <span>Your answer: ${q.studentAnswer}</span>
                    </div>
                    ${!isCorrect ? `
                        <div class="correct-answer">
                            <span class="answer-icon">✅</span>
                            <span>Correct answer: ${q.correctAnswer}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    } else {
        answerReviewSection.style.display = 'none';
    }

    // Render leaderboard
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

    // Show modal
    modal.style.display = 'flex';

    // Setup button handlers
    const playAgainBtn = document.getElementById('playAgainBtn');
    const backToGamesBtn = document.getElementById('backToGamesBtn');

    playAgainBtn.onclick = () => {
        modal.style.display = 'none';
        window.location.reload();
    };

    backToGamesBtn.onclick = () => {
        modal.style.display = 'none';
        window.location.href = 'student-game.html';
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
