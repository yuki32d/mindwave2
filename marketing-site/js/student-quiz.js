// Live Quiz - Student Interface
// ===================================

let socket;
let currentQuestion = null;
let timeRemaining = 0;
let timerInterval = null;
let score = 0; // Will be initialized from localStorage
let correctAnswers = 0;
let totalQuestions = 0;
let hasAnswered = false;
let quizCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get quiz code from URL
    const urlParams = new URLSearchParams(window.location.search);
    quizCode = urlParams.get('code');

    if (!quizCode) {
        alert('No quiz code provided');
        window.location.href = 'student-community.html';
        return;
    }

    // Initialize or reset score for this quiz session
    const storedScore = localStorage.getItem(`quizScore_${quizCode}`);
    if (storedScore) {
        score = parseInt(storedScore);
        console.log('📊 Restored score from localStorage:', score);
    } else {
        // Reset score for new quiz
        score = 0;
        localStorage.setItem(`quizScore_${quizCode}`, '0');
        console.log('📊 Initialized new quiz score:', score);
    }

    initializeWebSocket();
});

// WebSocket Setup
function initializeWebSocket() {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/quiz`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connected to quiz server');

        // Join the quiz session
        socket.send(JSON.stringify({
            type: 'join',
            sessionCode: quizCode,
            userId: localStorage.getItem('email') || 'student'
        }));
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'joined':
                    console.log('Successfully joined quiz:', message.sessionCode);
                    break;

                case 'participant-count':
                    console.log('Participants:', message.count);
                    break;

                case 'quiz-started':
                    console.log('Quiz started!');
                    showWaitingRoom(false);
                    showQuizPlay(true);
                    // The first question will come via 'question-shown' event
                    break;

                case 'question-shown':
                    console.log('New question:', message.questionIndex);
                    fetchAndDisplayQuestion(message.questionIndex);
                    break;

                case 'quiz-ended':
                    console.log('Quiz ended');
                    showResults();
                    break;

                case 'leaderboard-shown':
                    updateLeaderboard(message.leaderboard);
                    break;

                case 'error':
                    console.error('WebSocket error:', message.message);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('Disconnected from quiz server');
    };
}

// Fetch and display question from API
async function fetchAndDisplayQuestion(questionIndex) {
    try {
        const response = await fetch(`/api/quiz/${quizCode}`);
        const data = await response.json();

        if (data.ok && data.quiz.currentQuestion) {
            const question = data.quiz.currentQuestion;
            displayQuestion({
                questionIndex: questionIndex,
                question: question.text,
                options: question.options,
                timeLimit: question.timeLimit,
                correctAnswer: question.correctIndex,
                points: question.points
            });
        }
    } catch (error) {
        console.error('Error fetching question:', error);
    }
}

// Show/Hide Sections
function showWaitingRoom(show) {
    document.getElementById('waitingRoom').style.display = show ? 'block' : 'none';
}

function showQuizPlay(show) {
    document.getElementById('quizPlay').style.display = show ? 'flex' : 'none';
}

function showResultsScreen(show) {
    document.getElementById('quizResults').style.display = show ? 'flex' : 'none';
}

// Display Question
function displayQuestion(data) {
    currentQuestion = data;
    hasAnswered = false;
    timeRemaining = data.timeLimit;
    totalQuestions = totalQuestions || data.totalQuestions || 10;

    // Update question number
    document.getElementById('questionNumber').textContent =
        `Question ${data.questionIndex + 1} of ${totalQuestions}`;

    // Update score display
    document.getElementById('currentScore').textContent = score;

    // Set question text
    document.getElementById('questionText').textContent = data.question;

    // Set answer options
    const answers = ['answerA', 'answerB', 'answerC', 'answerD'];
    data.options.forEach((option, index) => {
        document.getElementById(answers[index]).textContent = option;
    });

    // Enable answer buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
        btn.disabled = false;
        btn.onclick = () => submitAnswer(index);
        btn.classList.remove('correct', 'incorrect');
        btn.style.boxShadow = '';
    });

    // Hide feedback
    document.getElementById('answerFeedback').style.display = 'none';

    // Start timer
    startTimer();
}

// Timer
function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeRemaining--;

        // Update timer display
        document.getElementById('timeRemaining').textContent = timeRemaining;

        // Update timer circle (conic gradient)
        const percentage = (timeRemaining / currentQuestion.timeLimit) * 360;
        document.getElementById('timerCircle').style.background =
            `conic-gradient(var(--cyan-bright) ${percentage}deg, var(--card-dark) ${percentage}deg)`;

        // Time's up
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            if (!hasAnswered) {
                submitAnswer(null); // No answer
            }
        }
    }, 1000);
}

// Submit Answer
async function submitAnswer(answerIndex) {
    if (hasAnswered) return;

    hasAnswered = true;
    clearInterval(timerInterval);

    // Disable all buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => btn.disabled = true);

    // Calculate time taken
    const timeToAnswer = (currentQuestion.timeLimit - timeRemaining) * 1000; // in milliseconds

    try {
        // Submit answer to server API
        const response = await fetch(`/api/quiz/${quizCode}/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                questionIndex: currentQuestion.questionIndex,
                selectedIndex: answerIndex,
                timeToAnswer: timeToAnswer
            })
        });

        const data = await response.json();

        console.log('✅ Server response:', data);

        if (data.ok) {
            const isCorrect = data.isCorrect;
            const points = data.pointsEarned;

            console.log(`${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'} - Points: ${points}`);

            if (isCorrect) {
                const oldScore = score;
                score += points;
                correctAnswers++;

                // Save to localStorage immediately
                localStorage.setItem(`quizScore_${quizCode}`, score.toString());
                console.log(`💰 Score updated: ${oldScore} → ${score} (+${points})`);
            }

            // Visual feedback
            buttons.forEach((btn, index) => {
                if (index === data.correctAnswer) {
                    btn.classList.add('correct');
                    btn.style.boxShadow = '0 0 30px rgba(0, 208, 132, 0.6)';
                } else if (index === answerIndex && !isCorrect) {
                    btn.classList.add('incorrect');
                    btn.style.boxShadow = '0 0 30px rgba(255, 90, 95, 0.6)';
                }
            });

            // Update score display immediately with animation
            const scoreElement = document.getElementById('currentScore');
            scoreElement.textContent = score;
            scoreElement.style.transform = 'scale(1.3)';
            scoreElement.style.color = isCorrect ? 'var(--quiz-green)' : 'var(--quiz-red)';
            setTimeout(() => {
                scoreElement.style.transform = 'scale(1)';
                scoreElement.style.color = '';
            }, 500);

            // Show feedback
            showFeedback(isCorrect, points);

            // Notify server via WebSocket
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'submit-answer',
                    questionIndex: currentQuestion.questionIndex,
                    selectedAnswer: answerIndex
                }));
            }
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

// Show Feedback
function showFeedback(isCorrect, points) {
    const feedback = document.getElementById('answerFeedback');
    const icon = document.getElementById('feedbackIcon');
    const text = document.getElementById('feedbackText');
    const pointsElem = document.getElementById('pointsEarned');

    if (isCorrect) {
        icon.innerHTML = '<i class="fas fa-check-circle" style="color: var(--quiz-green); font-size: 4rem;"></i>';
        text.textContent = 'Correct!';
        text.style.color = 'var(--quiz-green)';
        pointsElem.textContent = `+${points} points`;
    } else {
        icon.innerHTML = '<i class="fas fa-times-circle" style="color: var(--quiz-red); font-size: 4rem;"></i>';
        text.textContent = 'Incorrect';
        text.style.color = 'var(--quiz-red)';
        pointsElem.textContent = '0 points';
    }

    feedback.style.display = 'block';
}

// Show Results
async function showResults() {
    showQuizPlay(false);
    showResultsScreen(true);

    // Display final score
    document.getElementById('finalScore').textContent = score;
    document.getElementById('correctAnswers').textContent = correctAnswers;
    document.getElementById('totalQuestions').textContent = totalQuestions;

    // Fetch leaderboard
    try {
        const response = await fetch(`/api/quiz/${quizCode}/leaderboard`);
        const data = await response.json();

        if (data.ok) {
            updateLeaderboard(data.leaderboard);
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

// Update Leaderboard with Podium
function updateLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) return;

    // Find your rank
    const studentName = localStorage.getItem('firstName') || 'You';
    const yourRank = leaderboard.findIndex(entry => entry.name === studentName) + 1;

    if (yourRank > 0) {
        document.getElementById('yourRank').textContent = `#${yourRank}`;
    }

    // Create podium for top 3
    const podium = document.getElementById('podium');
    const top3 = leaderboard.slice(0, 3);

    if (top3.length === 0) {
        podium.innerHTML = '<p style="text-align: center; color: var(--text-gray);">No participants yet</p>';
        return;
    }

    // Podium order: 2nd, 1st, 3rd (visual arrangement)
    const podiumOrder = [
        top3[1], // 2nd place (left)
        top3[0], // 1st place (center, tallest)
        top3[2]  // 3rd place (right)
    ];

    const medals = ['🥈', '🥇', '🥉'];
    const heights = ['medium', 'tall', 'short'];
    const positions = [2, 1, 3];

    podium.innerHTML = podiumOrder.map((entry, index) => {
        if (!entry) return '';
        return `
            <div class="podium-place ${heights[index]}">
                <div class="podium-medal">${medals[index]}</div>
                <div class="podium-name">${entry.name}</div>
                <div class="podium-score">${entry.score}</div>
                <div class="podium-rank">#${positions[index]}</div>
                <div class="podium-stand">
                    <div class="stand-number">${positions[index]}</div>
                </div>
            </div>
        `;
    }).join('');
}
