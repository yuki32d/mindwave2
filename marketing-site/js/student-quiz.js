// Live Quiz - Student Interface
// ===================================

let socket;
let currentQuestion = null;
let timeRemaining = 0;
let timerInterval = null;
let score = 0;
let correctAnswers = 0;
let totalQuestions = 0;
let hasAnswered = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
});

// Socket.io Setup
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to quiz server');
    });

    socket.on('quiz-started', (data) => {
        totalQuestions = data.totalQuestions;
        showWaitingRoom(false);
        showQuizPlay(true);
    });

    socket.on('show-question', (data) => {
        displayQuestion(data);
    });

    socket.on('quiz-ended', () => {
        showResults();
    });

    socket.on('leaderboard-update', (data) => {
        updateLeaderboard(data);
    });
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
function submitAnswer(answerIndex) {
    if (hasAnswered) return;

    hasAnswered = true;
    clearInterval(timerInterval);

    // Disable all buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => btn.disabled = true);

    // Check if correct
    const isCorrect = answerIndex === currentQuestion.correctAnswer;

    // Calculate points (base 1000 * time remaining ratio)
    const points = isCorrect ? Math.round(1000 * (timeRemaining / currentQuestion.timeLimit)) : 0;

    if (isCorrect) {
        score += points;
        correctAnswers++;
    }

    // Visual feedback
    buttons.forEach((btn, index) => {
        if (index === currentQuestion.correctAnswer) {
            btn.classList.add('correct');
            btn.style.boxShadow = '0 0 30px rgba(0, 208, 132, 0.6)';
        } else if (index === answerIndex && !isCorrect) {
            btn.classList.add('incorrect');
            btn.style.boxShadow = '0 0 30px rgba(255, 90, 95, 0.6)';
        }
    });

    // Show feedback
    showFeedback(isCorrect, points);

    // Send response to server
    socket.emit('submit-answer', {
        questionIndex: currentQuestion.questionIndex,
        answer: answerIndex,
        timeRemaining,
        isCorrect,
        points
    });
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
function showResults() {
    showQuizPlay(false);
    showResultsScreen(true);

    // Display final score
    document.getElementById('finalScore').textContent = score;
    document.getElementById('correctAnswers').textContent = correctAnswers;
    document.getElementById('totalQuestions').textContent = totalQuestions;

    // Request leaderboard
    socket.emit('get-leaderboard');
}

// Update Leaderboard
function updateLeaderboard(data) {
    const { leaderboard, yourRank } = data;

    // Show your rank
    document.getElementById('yourRank').textContent = `#${yourRank}`;

    // Show top 5
    const topFive = document.getElementById('topFive');
    topFive.innerHTML = leaderboard.slice(0, 5).map((entry, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        return `
            <div class="leaderboard-entry">
                <div class="entry-rank ${rankClass}">${index + 1}</div>
                <div class="entry-name">${entry.name}</div>
                <div class="entry-score">${entry.score}</div>
            </div>
        `;
    }).join('');
}
