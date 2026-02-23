// Live Quiz Student - WebSocket and Quiz Logic

let ws = null;
let currentQuiz = null;
let currentQuestion = null;
let questionStartTime = null;
let timerInterval = null;

document.addEventListener('DOMContentLoaded', function () {
    const joinBtn = document.getElementById('joinBtn');
    const quizCode = document.getElementById('quizCode');

    // Auto-uppercase code input
    quizCode.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Join quiz on button click
    joinBtn.addEventListener('click', joinQuiz);

    // Join quiz on Enter key
    quizCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinQuiz();
        }
    });
});

async function joinQuiz() {
    const code = document.getElementById('quizCode').value.trim();
    const errorMessage = document.getElementById('errorMessage');

    if (!code || code.length !== 6) {
        errorMessage.textContent = 'Please enter a valid 6-character code';
        return;
    }

    try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
            errorMessage.textContent = 'Please log in first';
            window.location.href = 'student-login.html';
            return;
        }

        // Join quiz via API
        const response = await fetch(`/api/quiz/${code}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            currentQuiz = { sessionCode: code };

            // Get quiz details
            const quizResponse = await fetch(`/api/quiz/${code}`);
            const quizData = await quizResponse.json();

            if (quizData.ok) {
                document.getElementById('quizTitle').textContent = quizData.quiz.title;
                document.getElementById('lobbyCode').textContent = code;

                // Connect to WebSocket
                connectWebSocket(code);

                // Show lobby screen
                showScreen('lobbyScreen');
            }
        } else {
            errorMessage.textContent = data.message || 'Failed to join quiz';
        }
    } catch (error) {
        console.error('Join quiz error:', error);
        errorMessage.textContent = 'Failed to join quiz. Please try again.';
    }
}

function connectWebSocket(sessionCode) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/quiz`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        const userId = localStorage.getItem('user_id') || 'student';
        ws.send(JSON.stringify({
            type: 'join',
            sessionCode,
            userId
        }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };
}

function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'joined':
            console.log('Joined quiz session');
            break;

        case 'participant-count':
            document.getElementById('lobbyParticipantCount').textContent = message.count;
            break;

        case 'quiz-started':
            console.log('Quiz started!');
            // Wait for first question
            break;

        case 'question-shown':
            showQuestion(message.questionIndex);
            break;

        case 'leaderboard-shown':
            showLeaderboard(message.leaderboard);
            break;

        case 'quiz-ended':
            showFinalPodium();
            break;
    }
}

async function showQuestion(questionIndex) {
    try {
        // Get question details
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}`);
        const data = await response.json();

        if (data.ok && data.quiz.currentQuestion) {
            currentQuestion = {
                index: questionIndex,
                ...data.quiz.currentQuestion
            };

            // Update UI
            document.getElementById('questionNumber').textContent = `Question ${questionIndex + 1}`;
            document.getElementById('questionText').textContent = currentQuestion.text;

            // Update answer buttons
            const answerBtns = document.querySelectorAll('.answer-btn');
            answerBtns.forEach((btn, index) => {
                btn.querySelector('.answer-text').textContent = currentQuestion.options[index];
                btn.classList.remove('selected', 'disabled');
                btn.onclick = () => selectAnswer(index);
            });

            // Start timer
            startTimer(currentQuestion.timeLimit);

            // Show question screen
            showScreen('questionScreen');

            questionStartTime = Date.now();
        }
    } catch (error) {
        console.error('Show question error:', error);
    }
}

function startTimer(seconds) {
    let timeLeft = seconds;
    const timerValue = document.getElementById('timerValue');

    // Clear any existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerValue.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerValue.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Disable all buttons
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.add('disabled');
            });
        }
    }, 1000);
}

async function selectAnswer(selectedIndex) {
    // Disable all buttons
    const answerBtns = document.querySelectorAll('.answer-btn');
    answerBtns.forEach(btn => {
        btn.classList.add('disabled');
    });

    // Highlight selected answer
    answerBtns[selectedIndex].classList.add('selected');

    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Calculate time to answer
    const timeToAnswer = Date.now() - questionStartTime;

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                questionIndex: currentQuestion.index,
                selectedIndex,
                timeToAnswer
            })
        });

        const data = await response.json();

        if (data.ok) {
            // Broadcast answer submission via WebSocket
            ws.send(JSON.stringify({
                type: 'submit-answer',
                questionIndex: currentQuestion.index
            }));

            // Show result
            showResult(data.isCorrect, data.pointsEarned, data.totalScore);
        } else {
            console.error('Submit answer error:', data.message);
        }
    } catch (error) {
        console.error('Submit answer error:', error);
    }
}

function showResult(isCorrect, pointsEarned, totalScore) {
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const pointsEarnedEl = document.getElementById('pointsEarned');
    const totalScoreEl = document.getElementById('totalScore');

    if (isCorrect) {
        resultIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        resultIcon.className = 'result-icon correct';
        resultTitle.textContent = 'Correct!';
        resultTitle.className = 'correct';
        pointsEarnedEl.textContent = `+${pointsEarned} points`;
    } else {
        resultIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
        resultIcon.className = 'result-icon incorrect';
        resultTitle.textContent = 'Incorrect';
        resultTitle.className = 'incorrect';
        pointsEarnedEl.textContent = '+0 points';
    }

    totalScoreEl.textContent = totalScore;

    showScreen('resultScreen');
}

function showLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboardList');

    let html = '';
    leaderboard.forEach((player, index) => {
        html += `
            <div class="leaderboard-item rank-${index + 1}">
                <span class="rank">${index + 1}</span>
                <span class="name">${player.name}</span>
                <span class="score">${player.score} pts</span>
            </div>
        `;
    });

    leaderboardList.innerHTML = html;
    showScreen('leaderboardScreen');
}

async function showFinalPodium() {
    try {
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/leaderboard`);
        const data = await response.json();

        if (data.ok && data.leaderboard.length > 0) {
            // Update podium
            if (data.leaderboard[0]) {
                document.getElementById('first-place-name').textContent = data.leaderboard[0].name;
                document.getElementById('first-place-score').textContent = data.leaderboard[0].score;
            }

            if (data.leaderboard[1]) {
                document.getElementById('second-place-name').textContent = data.leaderboard[1].name;
                document.getElementById('second-place-score').textContent = data.leaderboard[1].score;
            }

            if (data.leaderboard[2]) {
                document.getElementById('third-place-name').textContent = data.leaderboard[2].name;
                document.getElementById('third-place-score').textContent = data.leaderboard[2].score;
            }

            showScreen('podiumScreen');
        }
    } catch (error) {
        console.error('Show podium error:', error);
    }
}

function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show selected screen
    document.getElementById(screenId).classList.add('active');
}
