// Live Quiz - Kahoot-Style Interface with AI Generation
// This handles the new quiz builder interface

let questions = [];
let currentQuestionIndex = -1;
let currentQuiz = null;
let ws = null;

document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('quizBuilder')) return;

    const generateAiBtn = document.getElementById('generateAiBtn');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const launchQuizBtn = document.getElementById('launchQuizBtn');
    const startQuizBtn = document.getElementById('startQuizBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const endQuizBtn = document.getElementById('endQuizBtn');

    // AI Generate Button
    generateAiBtn.addEventListener('click', async () => {
        await generateQuestionsWithAI();
    });

    // Add Question Button
    addQuestionBtn.addEventListener('click', () => {
        addNewQuestion();
    });

    // Launch Quiz Button
    launchQuizBtn.addEventListener('click', async () => {
        await launchQuiz();
    });

    // Start Quiz Button
    startQuizBtn.addEventListener('click', async () => {
        await startQuiz();
    });

    // Next Question Button
    nextQuestionBtn.addEventListener('click', async () => {
        await showNextQuestion();
    });

    // End Quiz Button
    endQuizBtn.addEventListener('click', async () => {
        await endQuiz();
    });
});

// AI Generation Function
async function generateQuestionsWithAI() {
    const topic = document.getElementById('aiTopicInput').value.trim();

    if (!topic) {
        alert('Please describe your quiz topic first');
        return;
    }

    const generateBtn = document.getElementById('generateAiBtn');
    const originalText = generateBtn.innerHTML;

    try {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/quiz/generate-from-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ topic })
        });

        const data = await response.json();

        if (data.ok) {
            // Clear existing questions
            questions = [];
            document.getElementById('questionsList').innerHTML = '';

            // Add generated questions
            data.questions.forEach((q, index) => {
                const questionData = {
                    text: q.text,
                    options: q.options,
                    correctIndex: q.correctIndex,
                    timeLimit: q.timeLimit || 20,
                    points: q.points || 1000
                };
                questions.push(questionData);
                addQuestionToSidebar(index);
            });

            // Select first question
            if (questions.length > 0) {
                selectQuestion(0);
            }

            alert(`✅ Generated ${data.questions.length} questions!`);
        } else {
            throw new Error(data.message || 'Failed to generate questions');
        }
    } catch (error) {
        console.error('AI generation error:', error);
        alert('Failed to generate questions: ' + error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// Add New Question
function addNewQuestion() {
    const questionData = {
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        timeLimit: 20,
        points: 1000
    };

    questions.push(questionData);
    const index = questions.length - 1;
    addQuestionToSidebar(index);
    selectQuestion(index);
}

// Add Question to Sidebar
function addQuestionToSidebar(index) {
    const questionsList = document.getElementById('questionsList');

    const questionItem = document.createElement('div');
    questionItem.className = 'question-item';
    questionItem.dataset.index = index;
    questionItem.onclick = () => selectQuestion(index);

    questionItem.innerHTML = `
        <div class="question-number">${index + 1}</div>
        <div class="question-preview">${questions[index].text || 'New Question'}</div>
    `;

    questionsList.appendChild(questionItem);
}

// Select Question
function selectQuestion(index) {
    currentQuestionIndex = index;

    // Update sidebar active state
    document.querySelectorAll('.question-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // Render question editor
    renderQuestionEditor(index);
}

// Render Question Editor
function renderQuestionEditor(index) {
    const editor = document.getElementById('questionEditor');
    const question = questions[index];

    const colors = ['red', 'blue', 'yellow', 'green'];

    editor.innerHTML = `
        <div class="editor-content">
            <div class="editor-header">
                <h3>Question ${index + 1}</h3>
                <button class="delete-btn" onclick="deleteQuestion(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>

            <div class="question-input-group">
                <label>Question</label>
                <input type="text" class="question-input" 
                    placeholder="Start typing your question" 
                    value="${question.text}"
                    oninput="updateQuestionText(${index}, this.value)" />
            </div>

            <div class="question-input-group">
                <label>Answer options</label>
                <div class="answers-grid">
                    ${question.options.map((opt, i) => `
                        <div class="answer-option ${colors[i]} ${question.correctIndex === i ? 'correct' : ''}" 
                            onclick="setCorrectAnswer(${index}, ${i})">
                            <div class="answer-shape"></div>
                            <input type="text" class="answer-input" 
                                placeholder="Add answer ${i + 1}" 
                                value="${opt}"
                                oninput="updateOption(${index}, ${i}, this.value)"
                                onclick="event.stopPropagation()" />
                            ${question.correctIndex === i ? '<i class="fas fa-check-circle correct-indicator"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="settings-row">
                <div class="setting-group">
                    <label>Time limit (seconds)</label>
                    <input type="number" class="setting-input" 
                        value="${question.timeLimit}" 
                        min="5" max="60"
                        oninput="updateTimeLimit(${index}, this.value)" />
                </div>
                <div class="setting-group">
                    <label>Points</label>
                    <input type="number" class="setting-input" 
                        value="${question.points}" 
                        min="100" max="2000" step="100"
                        oninput="updatePoints(${index}, this.value)" />
                </div>
            </div>
        </div>
    `;
}

// Update Functions
function updateQuestionText(index, value) {
    questions[index].text = value;
    updateSidebarPreview(index);
}

function updateOption(index, optionIndex, value) {
    questions[index].options[optionIndex] = value;
}

function setCorrectAnswer(index, optionIndex) {
    questions[index].correctIndex = optionIndex;
    renderQuestionEditor(index);
}

function updateTimeLimit(index, value) {
    questions[index].timeLimit = parseInt(value) || 20;
}

function updatePoints(index, value) {
    questions[index].points = parseInt(value) || 1000;
}

function updateSidebarPreview(index) {
    const item = document.querySelector(`.question-item[data-index="${index}"]`);
    if (item) {
        const preview = item.querySelector('.question-preview');
        preview.textContent = questions[index].text || 'New Question';
    }
}

function deleteQuestion(index) {
    if (!confirm('Delete this question?')) return;

    questions.splice(index, 1);

    // Rebuild sidebar
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';
    questions.forEach((q, i) => addQuestionToSidebar(i));

    // Select previous or first question
    if (questions.length > 0) {
        const newIndex = Math.max(0, index - 1);
        selectQuestion(newIndex);
    } else {
        document.getElementById('questionEditor').innerHTML = `
            <div class="editor-placeholder">
                <i class="fas fa-arrow-left"></i>
                <p>Select a question from the sidebar or click "Add" to create one</p>
            </div>
        `;
    }
}

// Launch Quiz
async function launchQuiz() {
    const title = document.getElementById('quizTitle').value.trim();

    if (!title) {
        alert('Please enter a quiz title');
        return;
    }

    if (questions.length === 0) {
        alert('Please add at least one question');
        return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text || q.options.some(opt => !opt)) {
            alert(`Please complete Question ${i + 1}`);
            return;
        }
    }

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/quiz/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                questions
            })
        });

        const data = await response.json();

        if (data.ok) {
            currentQuiz = {
                sessionCode: data.sessionCode,
                title,
                questions
            };

            // Hide builder, show control panel
            document.getElementById('quizBuilder').style.display = 'none';
            document.getElementById('quizControlPanel').style.display = 'block';
            document.getElementById('sessionCodeDisplay').textContent = data.sessionCode;

            // Connect to WebSocket
            connectWebSocket(data.sessionCode);

            alert(`Quiz created! Code: ${data.sessionCode}`);
        } else {
            alert('Failed to create quiz: ' + data.message);
        }
    } catch (error) {
        console.error('Launch quiz error:', error);
        alert('Failed to launch quiz');
    }
}

// WebSocket and Quiz Control Functions (same as before)
function connectWebSocket(sessionCode) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/quiz`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✅ WebSocket connected');
        const userId = localStorage.getItem('user_id') || 'faculty';
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
            document.getElementById('participantCount').textContent = message.count;
            break;

        case 'answer-submitted':
            console.log('Student submitted answer');
            break;

        case 'answer-distribution':
            updateAnswerDistribution(message.distribution);
            break;
    }
}

function updateAnswerDistribution(data) {
    const display = document.getElementById('answerDistribution');
    if (!display) return;

    const { A, B, C, D, total, expected } = data;

    // Show the panel
    display.style.display = 'block';

    const createBar = (letter, count, total, color) => {
        const percentage = total > 0 ? (count / total * 100) : 0;
        return `
            <div class="answer-bar ${color}">
                <div class="bar-label">${letter}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="bar-count">${count}</div>
            </div>
        `;
    };

    display.innerHTML = `
        <div class="response-counter">
            <i class="fas fa-users"></i> ${total}/${expected} answered
        </div>
        <div class="distribution-bars">
            ${createBar('A', A, total, 'red')}
            ${createBar('B', B, total, 'blue')}
            ${createBar('C', C, total, 'yellow')}
            ${createBar('D', D, total, 'green')}
        </div>
    `;
}

async function startQuiz() {
    if (!currentQuiz) return;

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            ws.send(JSON.stringify({
                type: 'start-quiz'
            }));

            await showNextQuestion();

            document.getElementById('startQuizBtn').style.display = 'none';
            document.getElementById('nextQuestionBtn').style.display = 'inline-block';
        } else {
            alert('Failed to start quiz: ' + data.message);
        }
    } catch (error) {
        console.error('Start quiz error:', error);
        alert('Failed to start quiz');
    }
}

async function showNextQuestion() {
    if (!currentQuiz) return;

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/next`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            if (data.status === 'ended') {
                await showFinalLeaderboard();
            } else {
                displayCurrentQuestion(data.question, data.questionIndex);

                ws.send(JSON.stringify({
                    type: 'show-question',
                    questionIndex: data.questionIndex
                }));

                setTimeout(() => {
                    showLeaderboard();
                }, data.question.timeLimit * 1000 + 3000);
            }
        } else {
            alert('Failed to show next question: ' + data.message);
        }
    } catch (error) {
        console.error('Next question error:', error);
        alert('Failed to show next question');
    }
}

function displayCurrentQuestion(question, index) {
    const display = document.getElementById('currentQuestionDisplay');

    const colors = ['red', 'blue', 'yellow', 'green'];
    const letters = ['A', 'B', 'C', 'D'];

    display.innerHTML = `
        <div class="faculty-question-card">
            <div class="question-meta">
                <span><i class="fas fa-hashtag"></i> Question ${index + 1}</span>
                <div class="faculty-timer-container">
                    <div class="faculty-timer-circle" id="facultyTimer">
                        <span id="facultyTimerValue">${question.timeLimit}</span>
                    </div>
                </div>
                <span><i class="fas fa-star"></i> ${question.points} pts</span>
            </div>
            <div class="question-text-display">
                ${question.text}
            </div>
            <div class="faculty-answers-grid">
                ${question.options.map((option, i) => `
                    <div class="faculty-answer ${colors[i]} ${i === question.correctIndex ? 'correct' : ''}">
                        <div class="answer-letter">${letters[i]}</div>
                        <div class="answer-text">${option}</div>
                        ${i === question.correctIndex ? '<i class="fas fa-check-circle"></i>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Start countdown timer
    startFacultyTimer(question.timeLimit);
}

let facultyTimerInterval = null;

function startFacultyTimer(duration) {
    // Clear any existing timer
    if (facultyTimerInterval) {
        clearInterval(facultyTimerInterval);
    }

    let timeRemaining = duration;
    const timerElement = document.getElementById('facultyTimerValue');
    const timerCircle = document.getElementById('facultyTimer');

    if (!timerElement || !timerCircle) return;

    // Update immediately
    updateFacultyTimerDisplay(timeRemaining, duration, timerElement, timerCircle);

    // Start countdown
    facultyTimerInterval = setInterval(() => {
        timeRemaining--;
        updateFacultyTimerDisplay(timeRemaining, duration, timerElement, timerCircle);

        if (timeRemaining <= 0) {
            clearInterval(facultyTimerInterval);
            timerCircle.classList.add('expired');

            // Auto-advance to next question after 3 seconds
            setTimeout(async () => {
                await showNextQuestion();
            }, 3000);
        }
    }, 1000);
}

function updateFacultyTimerDisplay(timeRemaining, totalTime, timerElement, timerCircle) {
    timerElement.textContent = timeRemaining;

    // Calculate percentage for conic gradient
    const percentage = (timeRemaining / totalTime) * 100;
    const degrees = (percentage / 100) * 360;
    timerCircle.style.background = `conic-gradient(var(--cyan-bright) ${degrees}deg, var(--card-darker) ${degrees}deg)`;

    // Add warning class when time is low
    if (timeRemaining <= 5 && timeRemaining > 0) {
        timerCircle.classList.add('warning');
    } else {
        timerCircle.classList.remove('warning');
    }
}

async function showLeaderboard() {
    if (!currentQuiz) return;

    try {
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/leaderboard`);
        const data = await response.json();

        if (data.ok) {
            displayLeaderboard(data.leaderboard);

            ws.send(JSON.stringify({
                type: 'show-leaderboard',
                leaderboard: data.leaderboard
            }));
        }
    } catch (error) {
        console.error('Get leaderboard error:', error);
    }
}

function displayLeaderboard(leaderboard) {
    const display = document.getElementById('liveLeaderboard');
    if (!leaderboard || leaderboard.length === 0) {
        display.innerHTML = '';
        return;
    }

    const getMedalIcon = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return '';
    };

    const getRankClass = (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    };

    let html = `
        <div class="faculty-leaderboard-panel">
            <div class="leaderboard-header">
                <h3><i class="fas fa-trophy"></i> Live Leaderboard</h3>
                <div class="total-participants">${leaderboard.length} students</div>
            </div>
            <div class="leaderboard-table">
                <div class="leaderboard-table-header">
                    <div class="col-rank">Rank</div>
                    <div class="col-name">Student</div>
                    <div class="col-score">Score</div>
                </div>
                <div class="leaderboard-table-body">
    `;

    leaderboard.forEach((player, index) => {
        const rank = index + 1;
        const medal = getMedalIcon(rank);
        const rankClass = getRankClass(rank);

        html += `
            <div class="leaderboard-row ${rankClass}" style="animation-delay: ${index * 0.05}s">
                <div class="col-rank">
                    <div class="rank-badge ${rankClass}">
                        ${medal ? medal : rank}
                    </div>
                </div>
                <div class="col-name">${player.name}</div>
                <div class="col-score">${player.score}</div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    display.innerHTML = html;
}

async function showFinalLeaderboard() {
    await showLeaderboard();
    document.getElementById('nextQuestionBtn').style.display = 'none';
    alert('Quiz completed! 🎉');
}

async function endQuiz() {
    if (!currentQuiz) return;

    if (!confirm('Are you sure you want to end this quiz?')) return;

    try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok) {
            ws.send(JSON.stringify({
                type: 'end-quiz'
            }));

            if (ws) {
                ws.close();
            }

            alert('Quiz ended successfully');
            window.location.reload();
        } else {
            alert('Failed to end quiz: ' + data.message);
        }
    } catch (error) {
        console.error('End quiz error:', error);
        alert('Failed to end quiz');
    }
}
