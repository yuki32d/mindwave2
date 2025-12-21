// Live Quiz - Faculty Creator
// ===================================

let questions = [];
let currentQuestionIndex = 0;
let socket;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    setupEventListeners();
});

// Socket.io Setup
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('quiz-response', (data) => {
        updateLiveResults(data);
    });
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('addQuestionBtn').addEventListener('click', openQuestionModal);
    document.getElementById('saveQuestionBtn').addEventListener('click', saveQuestion);
    document.getElementById('launchQuizBtn').addEventListener('click', launchQuiz);
    document.getElementById('endQuizBtn')?.addEventListener('click', endQuiz);
}

// Question Modal
function openQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.classList.add('active');
    clearQuestionForm();
}

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    modal.classList.remove('active');
}

function clearQuestionForm() {
    document.getElementById('questionText').value = '';
    document.getElementById('answerA').value = '';
    document.getElementById('answerB').value = '';
    document.getElementById('answerC').value = '';
    document.getElementById('answerD').value = '';
    document.querySelectorAll('input[name="correctAnswer"]').forEach(radio => {
        radio.checked = false;
    });
}

// Save Question
function saveQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const answerA = document.getElementById('answerA').value.trim();
    const answerB = document.getElementById('answerB').value.trim();
    const answerC = document.getElementById('answerC').value.trim();
    const answerD = document.getElementById('answerD').value.trim();
    const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');

    // Validation
    if (!questionText || !answerA || !answerB || !answerC || !answerD) {
        alert('Please fill in all fields');
        return;
    }

    if (!correctAnswer) {
        alert('Please select the correct answer');
        return;
    }

    // Create question object
    const question = {
        id: Date.now(),
        question: questionText,
        options: [answerA, answerB, answerC, answerD],
        correctAnswer: parseInt(correctAnswer.value),
        timeLimit: parseInt(document.getElementById('timeLimit').value)
    };

    questions.push(question);
    renderQuestionsList();
    closeQuestionModal();
    updateLaunchButton();
}

// Render Questions List
function renderQuestionsList() {
    const container = document.getElementById('questionsList');

    if (questions.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-gray);">
                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No questions yet. Click "Add Question" to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = questions.map((q, index) => `
        <div class="question-item">
            <div class="question-content">
                <h4>Question ${index + 1}: ${q.question}</h4>
                <div class="question-options">
                    ${q.options.map((opt, i) => `
                        <span class="option-badge ${['red', 'blue', 'yellow', 'green'][i]} ${i === q.correctAnswer ? 'correct' : ''}">
                            ${String.fromCharCode(65 + i)}: ${opt}
                        </span>
                    `).join('')}
                </div>
            </div>
            <div class="question-actions">
                <button class="btn-icon btn-delete" onclick="deleteQuestion(${q.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Delete Question
function deleteQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        questions = questions.filter(q => q.id !== id);
        renderQuestionsList();
        updateLaunchButton();
    }
}

// Update Launch Button
function updateLaunchButton() {
    const btn = document.getElementById('launchQuizBtn');
    const title = document.getElementById('quizTitle').value.trim();

    if (questions.length > 0 && title) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

// Launch Quiz
function launchQuiz() {
    const title = document.getElementById('quizTitle').value.trim();

    if (!title || questions.length === 0) {
        alert('Please add a title and at least one question');
        return;
    }

    const quizData = {
        title,
        questions,
        createdAt: new Date().toISOString()
    };

    // Emit to server
    socket.emit('launch-quiz', quizData);

    // Show live results
    document.querySelector('.quiz-builder').style.display = 'none';
    document.getElementById('liveResults').style.display = 'block';

    // Start quiz
    startQuiz();
}

// Start Quiz
function startQuiz() {
    currentQuestionIndex = 0;
    showQuestion(currentQuestionIndex);
}

// Show Question
function showQuestion(index) {
    if (index >= questions.length) {
        endQuiz();
        return;
    }

    const question = questions[index];

    // Broadcast question to students
    socket.emit('show-question', {
        questionIndex: index,
        question: question.question,
        options: question.options,
        timeLimit: question.timeLimit
    });

    // Display current question
    document.getElementById('currentQuestionDisplay').innerHTML = `
        <h3>Question ${index + 1} of ${questions.length}</h3>
        <p>${question.question}</p>
    `;

    // Auto-advance after time limit + 5 seconds for results
    setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        } else {
            endQuiz();
        }
    }, (question.timeLimit + 5) * 1000);
}

// Update Live Results
function updateLiveResults(data) {
    // Update chart with current responses
    // This would integrate with Chart.js
    console.log('Live results:', data);
}

// End Quiz
function endQuiz() {
    socket.emit('end-quiz');

    alert('Quiz completed! Students can now see their final results.');

    // Show final leaderboard
    socket.emit('get-leaderboard');
}

// Listen for title changes
document.getElementById('quizTitle')?.addEventListener('input', updateLaunchButton);
