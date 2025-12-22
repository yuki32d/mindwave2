// Live Quiz - Faculty Control
// This script handles quiz creation, WebSocket connection, and quiz control

let currentQuiz = null;
let ws = null;
let questions = [];
let uploadedPdfFile = null;

document.addEventListener('DOMContentLoaded', function () {
    // Only run on faculty community page
    if (!document.getElementById('quizBuilder')) return;

    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const launchQuizBtn = document.getElementById('launchQuizBtn');
    const startQuizBtn = document.getElementById('startQuizBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const endQuizBtn = document.getElementById('endQuizBtn');

    // PDF Upload Elements
    const pdfUploadArea = document.getElementById('pdfUploadArea');
    const pdfFileInput = document.getElementById('pdfFileInput');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadProgress = document.getElementById('uploadProgress');
    const generateQuestionsBtn = document.getElementById('generateQuestionsBtn');

    // Add first question by default
    addQuestion();

    // PDF Upload Area Click
    pdfUploadArea.addEventListener('click', () => {
        pdfFileInput.click();
    });

    // PDF File Selected
    pdfFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('File size must be less than 10MB');
                return;
            }
            uploadedPdfFile = file;
            uploadPlaceholder.innerHTML = `
                <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                <p><strong>${file.name}</strong></p>
                <small>${(file.size / 1024).toFixed(2)} KB</small>
            `;
            generateQuestionsBtn.style.display = 'block';
        }
    });

    // Drag and Drop
    pdfUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#667eea';
    });

    pdfUploadArea.addEventListener('dragleave', () => {
        pdfUploadArea.style.borderColor = '#e2e8f0';
    });

    pdfUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfUploadArea.style.borderColor = '#e2e8f0';

        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
            uploadedPdfFile = file;
            pdfFileInput.files = e.dataTransfer.files;
            uploadPlaceholder.innerHTML = `
                <i class="fas fa-file-pdf" style="color: #e74c3c;"></i>
                <p><strong>${file.name}</strong></p>
                <small>${(file.size / 1024).toFixed(2)} KB</small>
            `;
            generateQuestionsBtn.style.display = 'block';
        }
    });

    // Generate Questions from PDF
    generateQuestionsBtn.addEventListener('click', async () => {
        await generateQuestionsFromPDF();
    });

    // Add Question Button
    addQuestionBtn.addEventListener('click', () => {
        addQuestion();
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

async function generateQuestionsFromPDF() {
    if (!uploadedPdfFile) {
        alert('Please select a PDF file first');
        return;
    }

    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    try {
        // Show progress
        uploadPlaceholder.style.display = 'none';
        uploadProgress.style.display = 'block';
        progressText.textContent = 'Uploading PDF...';
        progressFill.style.width = '30%';

        const formData = new FormData();
        formData.append('pdf', uploadedPdfFile);

        const token = localStorage.getItem('auth_token');

        progressText.textContent = 'Analyzing PDF with AI...';
        progressFill.style.width = '60%';

        const response = await fetch('/api/quiz/generate-from-pdf', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.ok) {
            progressText.textContent = 'Questions generated!';
            progressFill.style.width = '100%';

            // Clear existing questions
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';
            questions = [];

            // Add generated questions
            data.questions.forEach((question, index) => {
                addQuestionWithData(question, index);
            });

            setTimeout(() => {
                uploadProgress.style.display = 'none';
                uploadPlaceholder.style.display = 'block';
                uploadPlaceholder.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #2ecc71; font-size: 3rem;"></i>
                    <p><strong>✅ ${data.questions.length} questions generated!</strong></p>
                    <small>You can edit them below or generate again</small>
                `;
            }, 1000);

            alert(`Successfully generated ${data.questions.length} questions from PDF!`);
        } else {
            throw new Error(data.message || 'Failed to generate questions');
        }
    } catch (error) {
        console.error('PDF generation error:', error);
        uploadProgress.style.display = 'none';
        uploadPlaceholder.style.display = 'block';
        alert('Failed to generate questions: ' + error.message);
    }
}

function addQuestionWithData(questionData, index) {
    const container = document.getElementById('questionsContainer');
    const questionIndex = questions.length;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-card';
    questionDiv.innerHTML = `
        <div class="question-header">
            <h3>Question ${questionIndex + 1}</h3>
            <button class="delete-question-btn" onclick="deleteQuestion(${questionIndex})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" class="input-field question-text" placeholder="Enter your question" />
        </div>

        <div class="form-group">
            <label>Time Limit (seconds)</label>
            <input type="number" class="input-field question-time" value="15" min="5" max="60" />
        </div>

        <div class="options-grid">
            <div class="option-item">
                <input type="text" class="input-field option-input" placeholder="Option A" />
                <input type="radio" name="correct-${questionIndex}" value="0" />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" placeholder="Option B" />
                <input type="radio" name="correct-${questionIndex}" value="1" />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" placeholder="Option C" />
                <input type="radio" name="correct-${questionIndex}" value="2" />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" placeholder="Option D" />
                <input type="radio" name="correct-${questionIndex}" value="3" />
            </div>
        </div>
        <small style="color: #888;">Select the correct answer by clicking the radio button</small>
    `;

    container.appendChild(questionDiv);
    questions.push({ index: questionIndex, element: questionDiv });
}

function addQuestionWithData(questionData, index) {
    const container = document.getElementById('questionsContainer');
    const questionIndex = questions.length;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-card';
    questionDiv.innerHTML = `
        <div class="question-header">
            <h3>Question ${questionIndex + 1}</h3>
            <button class="delete-question-btn" onclick="deleteQuestion(${questionIndex})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="form-group">
            <label>Question Text</label>
            <input type="text" class="input-field question-text" value="${questionData.text.replace(/"/g, '&quot;')}" />
        </div>

        <div class="form-group">
            <label>Time Limit (seconds)</label>
            <input type="number" class="input-field question-time" value="${questionData.timeLimit}" min="5" max="60" />
        </div>

        <div class="options-grid">
            <div class="option-item">
                <input type="text" class="input-field option-input" value="${questionData.options[0].replace(/"/g, '&quot;')}" />
                <input type="radio" name="correct-${questionIndex}" value="0" ${questionData.correctIndex === 0 ? 'checked' : ''} />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" value="${questionData.options[1].replace(/"/g, '&quot;')}" />
                <input type="radio" name="correct-${questionIndex}" value="1" ${questionData.correctIndex === 1 ? 'checked' : ''} />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" value="${questionData.options[2].replace(/"/g, '&quot;')}" />
                <input type="radio" name="correct-${questionIndex}" value="2" ${questionData.correctIndex === 2 ? 'checked' : ''} />
            </div>
            <div class="option-item">
                <input type="text" class="input-field option-input" value="${questionData.options[3].replace(/"/g, '&quot;')}" />
                <input type="radio" name="correct-${questionIndex}" value="3" ${questionData.correctIndex === 3 ? 'checked' : ''} />
            </div>
        </div>
        <small style="color: #888;">Select the correct answer by clicking the radio button</small>
    `;

    container.appendChild(questionDiv);
    questions.push({ index: questionIndex, element: questionDiv });
}

function deleteQuestion(index) {
    const question = questions.find(q => q.index === index);
    if (question) {
        question.element.remove();
        questions = questions.filter(q => q.index !== index);

        // Renumber remaining questions
        questions.forEach((q, i) => {
            const header = q.element.querySelector('.question-header h3');
            header.textContent = `Question ${i + 1}`;
        });
    }
}

async function launchQuiz() {
    const title = document.getElementById('quizTitle').value.trim();

    if (!title) {
        alert('Please enter a quiz title');
        return;
    }

    // Collect questions
    const questionCards = document.querySelectorAll('.question-card');
    const quizQuestions = [];

    for (let i = 0; i < questionCards.length; i++) {
        const card = questionCards[i];
        const text = card.querySelector('.question-text').value.trim();
        const timeLimit = parseInt(card.querySelector('.question-time').value);
        const options = Array.from(card.querySelectorAll('.option-input')).map(input => input.value.trim());
        const correctRadio = card.querySelector(`input[name="correct-${i}"]:checked`);

        if (!text || options.some(opt => !opt) || !correctRadio) {
            alert(`Please complete Question ${i + 1}`);
            return;
        }

        quizQuestions.push({
            text,
            options,
            correctIndex: parseInt(correctRadio.value),
            timeLimit,
            points: 1000
        });
    }

    if (quizQuestions.length === 0) {
        alert('Please add at least one question');
        return;
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
                questions: quizQuestions
            })
        });

        const data = await response.json();

        if (data.ok) {
            currentQuiz = {
                sessionCode: data.sessionCode,
                title,
                questions: quizQuestions
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
            // Could show real-time answer counts here
            break;
    }
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
            // Broadcast start event via WebSocket
            ws.send(JSON.stringify({
                type: 'start-quiz'
            }));

            // Show first question
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
                // Quiz completed
                await showFinalLeaderboard();
            } else {
                // Show question
                displayCurrentQuestion(data.question, data.questionIndex);

                // Broadcast question via WebSocket
                ws.send(JSON.stringify({
                    type: 'show-question',
                    questionIndex: data.questionIndex
                }));

                // After time limit, show leaderboard
                setTimeout(() => {
                    showLeaderboard();
                }, data.question.timeLimit * 1000 + 3000); // Add 3s buffer
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
    display.innerHTML = `
        <div class="current-question">
            <h3>Question ${index + 1}</h3>
            <p class="question-text">${question.text}</p>
            <div class="timer-display">
                <i class="fas fa-clock"></i> ${question.timeLimit}s
            </div>
        </div>
    `;
}

async function showLeaderboard() {
    if (!currentQuiz) return;

    try {
        const response = await fetch(`/api/quiz/${currentQuiz.sessionCode}/leaderboard`);
        const data = await response.json();

        if (data.ok) {
            displayLeaderboard(data.leaderboard);

            // Broadcast leaderboard via WebSocket
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

    let html = '<div class="leaderboard"><h3>🏆 Leaderboard</h3><div class="leaderboard-list">';

    leaderboard.forEach((player, index) => {
        html += `
            <div class="leaderboard-item rank-${index + 1}">
                <span class="rank">${index + 1}</span>
                <span class="name">${player.name}</span>
                <span class="score">${player.score} pts</span>
            </div>
        `;
    });

    html += '</div></div>';
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
            // Broadcast end event via WebSocket
            ws.send(JSON.stringify({
                type: 'end-quiz'
            }));

            if (ws) {
                ws.close();
            }

            alert('Quiz ended successfully');

            // Reload page to reset
            window.location.reload();
        } else {
            alert('Failed to end quiz: ' + data.message);
        }
    } catch (error) {
        console.error('End quiz error:', error);
        alert('Failed to end quiz');
    }
}
