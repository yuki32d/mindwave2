// Live Quiz - Student Interface
// ===================================

let socket;
let currentQuestion = null;
let timeRemaining = 0;
let timerInterval = null;
let timerAnimFrame = null;
let score = 0;
let correctAnswers = 0;
let totalQuestionsCount = 0;
let hasAnswered = false;
let quizCode = null;
let streak = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    quizCode = urlParams.get('code');

    if (!quizCode) {
        showError('No quiz code provided');
        return;
    }

    score = 0;
    document.getElementById('currentScore').textContent = '0';
    initializeWebSocket();
});

// ── REST join (persists student in DB as participant) ──
async function joinQuizREST() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (!token) return;

        const res = await fetch(`/api/quiz/${quizCode}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.ok) {
            // Update participant count if shown
            const pcEl = document.getElementById('participantCount');
            if (pcEl) pcEl.textContent = data.participantCount || '—';
        }
    } catch (e) {
        console.warn('REST join failed (non-fatal):', e);
    }
}

// WebSocket Setup
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/quiz`;

    socket = new WebSocket(wsUrl);

    socket.onopen = async () => {
        // 1. Register in DB via REST
        await joinQuizREST();

        // 2. Join the WS session room
        socket.send(JSON.stringify({
            type: 'join',
            sessionCode: quizCode,
            userId: localStorage.getItem('email') || 'student'
        }));
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
                case 'joined':
                    updateWaitingStatus('Connected! Waiting for teacher...', true);
                    break;
                case 'participant-count':
                    const pcEl = document.getElementById('participantCount');
                    if (pcEl) pcEl.textContent = msg.count;
                    break;
                case 'quiz-started':
                    showSection('waitingRoom', false);
                    showSection('quizPlay', true);
                    break;
                case 'question-shown':
                    fetchAndDisplayQuestion(msg.questionIndex);
                    break;
                case 'answer-distribution':
                    updateAnswerDistribution(msg.distribution);
                    break;
                case 'quiz-ended':
                    showResults();
                    break;
                case 'leaderboard-shown':
                    updateLeaderboard(msg.leaderboard);
                    break;
                case 'error':
                    console.warn('WS error:', msg.message);
                    break;
            }
        } catch (e) {
            console.error('WS parse error:', e);
        }
    };

    socket.onerror = () => updateWaitingStatus('Connection error — retrying...', false);
    socket.onclose = () => setTimeout(initializeWebSocket, 3000);
}

// ── Fetch question from server ──
async function fetchAndDisplayQuestion(questionIndex) {
    try {
        const res = await fetch(`/api/quiz/${quizCode}`);
        const data = await res.json();
        if (data.ok && data.quiz && data.quiz.currentQuestion) {
            const q = data.quiz.currentQuestion;
            totalQuestionsCount = data.quiz.questions?.length || totalQuestionsCount || 10;
            displayQuestion({
                questionIndex,
                question: q.text || q.question || '',
                options: Array.isArray(q.options) ? q.options : [],
                timeLimit: q.timeLimit || 15,
                points: q.points || 1000
            });
        } else {
            console.warn('No currentQuestion in response:', data);
        }
    } catch (e) {
        console.error('Fetch question error:', e);
    }
}

// ── Section helpers ──
function showSection(id, show) {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
}

function updateWaitingStatus(msg, connected) {
    const el = document.getElementById('waitingStatus');
    if (el) el.textContent = msg;
    const dot = document.getElementById('connectionDot');
    if (dot) dot.className = 'conn-dot ' + (connected ? 'connected' : 'disconnected');
}

// ── Display Question ──
function displayQuestion(data) {
    currentQuestion = data;
    hasAnswered = false;
    timeRemaining = data.timeLimit;

    // Progress bar
    const prog = document.getElementById('questionProgress');
    const displayNum = Math.min(data.questionIndex + 1, totalQuestionsCount); // Bug fix: clamp so it never shows 11/10
    if (prog) prog.textContent = `${displayNum} / ${totalQuestionsCount}`;
    const progBar = document.getElementById('progressBar');
    if (progBar) {
        const pct = Math.min((data.questionIndex / totalQuestionsCount) * 100, 100); // Bug fix: cap at 100%
        progBar.style.width = pct + '%';
    }

    // Question text with enter animation
    const qt = document.getElementById('questionText');
    if (qt) { qt.style.opacity = '0'; qt.textContent = data.question; setTimeout(() => qt.style.opacity = '1', 50); }

    // Points badge
    const pb = document.getElementById('pointsBadge');
    if (pb) pb.textContent = `${data.points} pts`;

    // Answer buttons
    const btns = document.querySelectorAll('.answer-btn');
    const labels = ['A', 'B', 'C', 'D'];
    btns.forEach((btn, i) => {
        btn.disabled = false;
        btn.classList.remove('correct', 'incorrect', 'dimmed', 'selected');
        const textEl = btn.querySelector('.answer-text');
        if (textEl && data.options[i] !== undefined) textEl.textContent = data.options[i];
        btn.onclick = () => submitAnswer(i);

        // staggered entrance
        btn.style.animation = 'none';
        btn.offsetHeight; // reflow
        btn.style.animation = `answerSlideIn 0.4s ease ${0.1 + i * 0.08}s forwards`;
        btn.style.opacity = '0';
    });

    // Hide feedback, hide distribution
    const fb = document.getElementById('answerFeedback');
    if (fb) fb.style.display = 'none';
    const db = document.getElementById('distributionBar');
    if (db) db.style.display = 'none';
    startTimer();
}

// ── Timer ──
function startTimer() {
    clearInterval(timerInterval);

    const circle = document.getElementById('timerCircle');
    const timeEl = document.getElementById('timeRemaining');
    const totalTime = currentQuestion.timeLimit;

    timerInterval = setInterval(() => {
        timeRemaining--;
        if (timeEl) timeEl.textContent = timeRemaining;

        const pct = (timeRemaining / totalTime) * 360;
        const urgentColor = timeRemaining <= 5 ? '#FF5A5F' : timeRemaining <= 10 ? '#FFD700' : '#00D9FF';
        if (circle) {
            circle.style.background = `conic-gradient(${urgentColor} ${pct}deg, #1E2433 ${pct}deg)`;
            circle.style.boxShadow = `0 0 30px ${urgentColor}66, 0 0 60px ${urgentColor}33`;
        }
        if (timeEl) timeEl.style.color = timeRemaining <= 5 ? '#FF5A5F' : '';

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            if (!hasAnswered) submitAnswer(null);
        }
    }, 1000);
}

// ── Submit Answer ──
async function submitAnswer(answerIndex) {
    if (hasAnswered) return;
    hasAnswered = true;
    clearInterval(timerInterval);

    const timeTaken = (currentQuestion.timeLimit - timeRemaining) * 1000;
    const btns = document.querySelectorAll('.answer-btn');

    // Mark selected
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answerIndex) btn.classList.add('selected');
        else btn.classList.add('dimmed');
    });

    if (answerIndex === null) {
        showFeedback(false, 0, '⏰ Time\'s up!', null);
        return;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const res = await fetch(`/api/quiz/${quizCode}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                questionIndex: currentQuestion.questionIndex,
                selectedIndex: answerIndex,
                timeToAnswer: timeTaken
            })
        });
        const data = await res.json();

        if (data.ok) {
            const isCorrect = data.isCorrect;
            const pts = data.pointsEarned || 0;

            if (isCorrect) {
                score += pts;
                correctAnswers++;
                streak++;
            } else {
                streak = 0;
            }

            // Color the buttons
            btns.forEach((btn, i) => {
                btn.classList.remove('dimmed', 'selected');
                if (i === data.correctAnswer) btn.classList.add('correct');
                else if (i === answerIndex && !isCorrect) btn.classList.add('incorrect');
                else btn.classList.add('dimmed');
            });

            // Animate score
            animateScore(pts, isCorrect);
            showFeedback(isCorrect, pts, isCorrect ? getCorrectMsg() : 'Not quite!', data.correctAnswer);

            // WS notify (for distribution)
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'submit-answer',
                    questionIndex: currentQuestion.questionIndex,
                    selectedAnswer: answerIndex
                }));
            }
        } else {
            console.warn('Answer rejected:', data.message);
            showFeedback(false, 0, data.message || 'Could not submit', null);
        }
    } catch (e) {
        console.error('Submit error:', e);
        showFeedback(false, 0, 'Network error', null);
    }
}

function getCorrectMsg() {
    const msgs = ['Correct! 🔥', 'Nailed it! ⚡', 'Brilliant! 🎯', 'Awesome! ✨', 'Perfect! 🌟'];
    if (streak >= 3) return `${streak}x Streak! 🔥`;
    return msgs[Math.floor(Math.random() * msgs.length)];
}

function animateScore(pts, isCorrect) {
    const el = document.getElementById('currentScore');
    if (!el) return;
    el.textContent = score;
    el.style.transform = 'scale(1.4)';
    el.style.color = isCorrect ? '#00D084' : '#FF5A5F';
    if (pts > 0) {
        // floating +pts
        const pip = document.createElement('span');
        pip.className = 'score-pip';
        pip.textContent = `+${pts}`;
        el.parentElement.appendChild(pip);
        setTimeout(() => pip.remove(), 1200);
    }
    setTimeout(() => { el.style.transform = ''; el.style.color = ''; }, 600);
}

// ── Feedback ──
function showFeedback(isCorrect, pts, msg, correctIdx) {
    const fb = document.getElementById('answerFeedback');
    const icon = document.getElementById('feedbackIcon');
    const text = document.getElementById('feedbackText');
    const ptsEl = document.getElementById('pointsEarned');
    const streakEl = document.getElementById('streakBadge');

    icon.innerHTML = isCorrect
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#00D084" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
        : (msg.includes('up') ? '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FF5A5F" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>');

    text.textContent = msg;
    text.style.color = isCorrect ? '#00D084' : '#FF5A5F';
    ptsEl.textContent = pts > 0 ? `+${pts} points` : '—';
    ptsEl.style.color = pts > 0 ? '#00D084' : 'var(--text-gray)';

    if (streakEl) {
        streakEl.style.display = streak >= 2 ? 'inline-flex' : 'none';
        streakEl.textContent = `🔥 ${streak}x streak`;
    }

    fb.style.display = 'block';
}

// ── Answer Distribution bar (live) ──
function updateAnswerDistribution(dist) {
    if (!hasAnswered) return;
    const bar = document.getElementById('distributionBar');
    if (!bar) return;
    bar.style.display = 'flex';
    const total = dist.total || 1;
    ['A', 'B', 'C', 'D'].forEach((letter, i) => {
        const pct = Math.round(((dist[letter] || 0) / total) * 100);
        const fillEl = bar.querySelector(`[data-letter="${letter}"] .dist-fill`);
        const pctEl = bar.querySelector(`[data-letter="${letter}"] .dist-pct`);
        if (fillEl) fillEl.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct + '%';
    });
}

// ── Results ──
async function showResults() {
    showSection('quizPlay', false);
    showSection('quizResults', true);

    document.getElementById('finalScore').textContent = score.toLocaleString();
    document.getElementById('correctAnswers').textContent = correctAnswers;
    document.getElementById('totalQuestionsResult').textContent = totalQuestionsCount;

    const pct = totalQuestionsCount > 0 ? Math.round((correctAnswers / totalQuestionsCount) * 100) : 0;
    const accEl = document.getElementById('accuracy');
    if (accEl) accEl.textContent = pct + '%';

    // Animate score counter
    animateCounter('finalScore', score);

    try {
        const res = await fetch(`/api/quiz/${quizCode}/leaderboard`);
        const data = await res.json();
        if (data.ok) updateLeaderboard(data.leaderboard);
    } catch (e) { }
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
        cur = Math.min(cur + step, target);
        el.textContent = cur.toLocaleString();
        if (cur >= target) clearInterval(t);
    }, 40);
}

function updateLeaderboard(leaderboard) {
    if (!leaderboard?.length) return;

    const myName = localStorage.getItem('firstName') || '';
    const myEmail = localStorage.getItem('email') || '';
    const myRank = leaderboard.findIndex(e => e.name === myName || e.email === myEmail) + 1;

    const rankEl = document.getElementById('yourRank');
    if (rankEl) rankEl.textContent = myRank > 0 ? `#${myRank}` : '—';

    const rankMsgEl = document.getElementById('rankMessage');
    if (rankMsgEl) {
        rankMsgEl.textContent = myRank === 1 ? '🏆 You\'re #1!' : myRank <= 3 ? '🎉 Top 3!' : myRank > 0 ? `Keep it up!` : '';
    }

    const podium = document.getElementById('podium');
    if (!podium) return;

    const top3 = leaderboard.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd
    const medals = ['🥈', '🥇', '🥉'];
    const heights = ['medium', 'tall', 'short'];
    const colors = ['rgba(192,192,192,0.2)', 'rgba(255,215,0,0.25)', 'rgba(205,127,50,0.2)'];
    const positions = [2, 1, 3];

    podium.innerHTML = order.map((e, i) => {
        if (!e) return `<div class="podium-place ${heights[i]} empty"></div>`;
        const initials = (e.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        return `
        <div class="podium-place ${heights[i]}" style="animation-delay:${0.1 + i * 0.15}s">
            <div class="podium-medal">${medals[i]}</div>
            <div class="podium-avatar" style="background:${colors[i]}">${initials}</div>
            <div class="podium-name">${e.name || 'Player'}</div>
            <div class="podium-score">${(e.score || 0).toLocaleString()}</div>
            <div class="podium-stand" style="background:${colors[i]}">
                <div class="stand-number">${positions[i]}</div>
            </div>
        </div>`;
    }).join('');

    // Full leaderboard list
    const list = document.getElementById('leaderboardList');
    if (list) {
        list.innerHTML = leaderboard.slice(0, 10).map((e, i) => {
            const isMe = e.name === myName || e.email === myEmail;
            return `<div class="lb-row${isMe ? ' lb-you' : ''}">
                <span class="lb-rank">${i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}</span>
                <span class="lb-name">${e.name || 'Player'}${isMe ? ' (You)' : ''}</span>
                <span class="lb-points">${(e.score || 0).toLocaleString()} pts</span>
            </div>`;
        }).join('');
    }
}

function showError(msg) {
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;color:#fff;font-family:sans-serif;">
        <div style="font-size:3rem">⚠️</div><h2>${msg}</h2>
        <button onclick="window.history.back()" style="padding:12px 28px;border-radius:99px;background:#6366f1;color:#fff;border:none;font-size:1rem;cursor:pointer;">Go Back</button>
    </div>`;
}
