// AI Game Builder - Frontend Logic
const API_BASE = window.location.origin;

let chatHistory = [];
let currentGameData = null;
let editMode = false;
let originalGameData = null; // For cancel functionality
let editingQuestionIndex = null;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const previewContent = document.getElementById('previewContent');
const editModeToggle = document.getElementById('editModeToggle');
const editModeToggleContainer = document.getElementById('editModeToggleContainer');
const questionModal = document.getElementById('questionModal');
const questionForm = document.getElementById('questionForm');
const closeModal = document.getElementById('closeModal');
const cancelModal = document.getElementById('cancelModal');
const modalTitle = document.getElementById('modalTitle');

// Send Message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Handle "preview" command locally if game data exists
    if (message.toLowerCase() === 'preview' && currentGameData) {
        addMessage(message, 'user');
        addMessage("Here's your current game preview!", 'ai');
        renderPreview(currentGameData);
        chatInput.value = '';
        return;
    }

    // Add user message to chat
    addMessage(message, 'user');
    chatInput.value = '';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/api/ai-game-builder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                context: { history: chatHistory }
            })
        });

        const data = await response.json();

        // Remove typing indicator
        removeMessage(typingId);

        // Debug logging
        console.log('AI Response:', data);
        if (data.gameData) {
            console.log('Game Data Type:', data.gameData.type);
            console.log('Game Data:', data.gameData);
        }

        if (data.ok) {
            // Add AI response
            addMessage(data.reply, 'ai');

            // Update chat history
            chatHistory.push({ role: 'user', parts: [{ text: message }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });

            // Handle game data
            if (data.gameData) {
                currentGameData = data.gameData;
                originalGameData = JSON.parse(JSON.stringify(data.gameData)); // Deep copy
                renderPreview(data.gameData);
            }

            // Handle publish action
            if (data.action === 'publish' && currentGameData) {
                await publishGame(currentGameData);
            }
        } else {
            console.error('Server returned error:', data);
            addMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    } catch (error) {
        console.error('Error:', error);
        removeMessage(typingId);
        addMessage('Network error. Please check your connection.', 'ai');
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Add Message to Chat
function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = text.replace(/\n/g, '<br>');
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div.id = 'msg-' + Date.now();
}

// Add Typing Indicator
function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    const id = 'typing-' + Date.now();
    div.id = id;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

// Remove Message
function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Render Game Preview
function renderPreview(gameData) {
    // Show edit mode toggle
    editModeToggleContainer.style.display = 'flex';

    let html = `
        <div class="game-preview">
            <h3>${gameData.title || 'Untitled Game'}</h3>
            <p><strong>Type:</strong> ${formatGameType(gameData.type)}</p>
            <p><strong>Description:</strong> ${gameData.description || gameData.brief || 'No description'}</p>
            <div class="game-meta">
                <span>⏱️ ${gameData.duration || 10} minutes</span>
                <span>🎯 ${gameData.totalPoints || 100} points</span>
            </div>
        </div>
    `;

    // Add game-specific details
    if (gameData.type === 'quiz' && gameData.questions) {
        html += renderQuizPreview(gameData.questions);
    }

    if (gameData.type === 'sql-builder') {
        html += `<div class="game-preview">
            <h3>SQL Challenge</h3>
            <p><strong>Correct Query:</strong></p>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${gameData.correctQuery}</pre>
            <p><strong>Blocks:</strong> ${gameData.blocks ? gameData.blocks.length : 0}</p>
            <p><strong>Distractors:</strong> ${gameData.distractors ? gameData.distractors.length : 0}</p>
        </div>`;
    }

    if (gameData.type === 'code-unjumble' && gameData.lines) {
        // Ensure all lines are strings (handle both string arrays and object arrays)
        const linesAsStrings = gameData.lines.map(line => {
            if (typeof line === 'string') {
                return line;
            } else if (typeof line === 'object' && line !== null) {
                // If it's an object, try to get a text property or convert to string
                return line.text || line.content || line.code || JSON.stringify(line);
            }
            return String(line);
        });

        html += `<div class="game-preview">
            <h3>Code Lines (${linesAsStrings.length})</h3>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${linesAsStrings.join('\n')}</pre>
        </div>`;
    }

    if (gameData.type === 'syntax-fill' && gameData.content) {
        html += `<div class="game-preview">
            <h3>Syntax Fill-in Challenge</h3>
            <p><strong>Content:</strong></p>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${gameData.content}</pre>
            <p><strong>Blanks:</strong> ${gameData.blanks ? gameData.blanks.length : 0}</p>
        </div>`;
    }


    if (gameData.type === 'bug-hunt') {
        // Handle different possible property names for buggy code
        const buggyCode = gameData.buggyCode || gameData.code || gameData.content || '';
        const perfectCode = gameData.perfectCode || gameData.correctCode || '';

        if (buggyCode) {
            html += `<div class="game-preview">
                <h3>Bug Hunt Challenge</h3>
                <p><strong>Language:</strong> ${gameData.language || 'Not specified'}</p>
                <p><strong>Bugs to Find:</strong> ${gameData.bugCount || gameData.bugs?.length || 0}</p>
                <p><strong>Buggy Code:</strong></p>
                <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${buggyCode}</pre>
                ${perfectCode ? `<p><strong>Perfect Code:</strong></p>
                <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${perfectCode}</pre>` : ''}
            </div>`;
        } else {
            console.warn('Bug hunt game data missing buggyCode:', gameData);
            html += `<div class="game-preview">
                <h3>Bug Hunt Challenge</h3>
                <p style="color: #ff6b6b;">⚠️ Preview unavailable - buggy code not generated yet</p>
                <p>Game data: ${JSON.stringify(gameData, null, 2)}</p>
            </div>`;
        }
    }


    if (gameData.type === 'tech-sorter') {
        // Ensure items and categories are strings
        const items = gameData.items ? gameData.items.map(item =>
            typeof item === 'string' ? item : (item.name || item.text || String(item))
        ) : [];

        const categories = gameData.categories ? gameData.categories.map(cat =>
            typeof cat === 'string' ? cat : (cat.name || cat.text || String(cat))
        ) : [];

        html += `<div class="game-preview">
            <h3>Tech Sorter Challenge</h3>
            <p><strong>Categories:</strong> ${categories.join(', ')}</p>
            <p><strong>Items to Sort:</strong> ${items.join(', ')}</p>
            <p><strong>Total Items:</strong> ${items.length}</p>
        </div>`;
    }


    // Add publish button if not in edit mode
    if (!editMode) {
        html += '<button class="publish-btn" id="publishGameBtn">📤 Publish Game</button>';
    }

    previewContent.innerHTML = html;

    // Add event listener for publish button
    const publishBtn = document.getElementById('publishGameBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', function () {
            publishGame();
        });
    }
}

// Render Quiz Preview with Edit Controls
function renderQuizPreview(questions) {
    let html = '<div class="game-preview"><h3>Questions (' + questions.length + ')</h3>';

    questions.forEach(function (q, i) {
        html += '<div class="question-item">';
        html += '<div class="question-header">';
        html += '<strong>Q' + (i + 1) + ': ' + q.text + '</strong>';

        if (editMode) {
            html += '<div class="question-actions">';
            html += '<button class="edit-btn" data-question-index="' + i + '">✏️ Edit</button>';
            html += '<button class="delete-btn" data-question-index="' + i + '">🗑️ Delete</button>';
            html += '</div>';
        }

        html += '</div>';
        html += '<ul style="margin: 8px 0 16px 20px; color: #9ea4b6;">';

        q.options.forEach(function (opt, idx) {
            const isCorrect = idx === q.correctIndex;
            html += '<li style="color: ' + (isCorrect ? '#34c759' : '#9ea4b6') + '">';
            html += opt + (isCorrect ? ' ✓' : '');
            html += '</li>';
        });

        html += '</ul>';

        if (q.explanation) {
            html += '<p style="font-size: 13px; color: #9ea4b6; font-style: italic;">💡 ' + q.explanation + '</p>';
        }

        html += '</div>';
    });

    if (editMode) {
        html += '<button class="add-question-btn" id="addQuestionBtn">➕ Add New Question</button>';
        html += '<div class="save-cancel-controls">';
        html += '<button class="save-btn" id="saveChangesBtn">💾 Save Changes</button>';
        html += '<button class="cancel-btn" id="cancelEditBtn">❌ Cancel</button>';
        html += '</div>';
    }

    html += '</div>';

    // Need to attach event listeners after rendering
    setTimeout(function () {
        attachQuestionEventListeners();
    }, 0);

    return html;
}

// Attach event listeners to question buttons
function attachQuestionEventListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-question-index'));
            editQuestion(index);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const index = parseInt(this.getAttribute('data-question-index'));
            deleteQuestion(index);
        });
    });

    // Add question button
    const addBtn = document.getElementById('addQuestionBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addQuestion);
    }

    // Save button
    const saveBtn = document.getElementById('saveChangesBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveGameChanges);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }
}

// Format Game Type
function formatGameType(type) {
    const types = {
        'quiz': 'Quiz Game',
        'sql-builder': 'SQL Builder',
        'code-unjumble': 'Code Unjumble',
        'syntax-fill': 'Syntax Fill-in',
        'bug-hunt': 'Bug Hunt',
        'tech-sorter': 'Tech Sorter'
    };
    return types[type] || type;
}

// Toggle Edit Mode
editModeToggle.addEventListener('click', function () {
    editMode = !editMode;
    editModeToggle.classList.toggle('active');

    if (editMode) {
        // Save original for cancel
        originalGameData = JSON.parse(JSON.stringify(currentGameData));
    }

    renderPreview(currentGameData);
});

// Edit Question
function editQuestion(index) {
    if (!currentGameData || !currentGameData.questions) return;

    editingQuestionIndex = index;
    const question = currentGameData.questions[index];

    // Populate modal
    modalTitle.textContent = 'Edit Question ' + (index + 1);
    document.getElementById('questionText').value = question.text;
    document.getElementById('optionA').value = question.options[0] || '';
    document.getElementById('optionB').value = question.options[1] || '';
    document.getElementById('optionC').value = question.options[2] || '';
    document.getElementById('optionD').value = question.options[3] || '';
    document.getElementById('questionPoints').value = question.points || 10;
    document.getElementById('questionExplanation').value = question.explanation || '';

    // Set correct answer radio
    const radios = document.querySelectorAll('input[name="correctAnswer"]');
    radios[question.correctIndex].checked = true;

    // Show modal
    questionModal.style.display = 'flex';
}

// Add Question
function addQuestion() {
    editingQuestionIndex = null;

    // Clear modal
    modalTitle.textContent = 'Add New Question';
    questionForm.reset();

    // Show modal
    questionModal.style.display = 'flex';
}

// Delete Question
function deleteQuestion(index) {
    if (!confirm('Are you sure you want to delete this question?')) return;

    currentGameData.questions.splice(index, 1);

    // Recalculate total points
    currentGameData.totalPoints = currentGameData.questions.reduce(function (sum, q) {
        return sum + (q.points || 10);
    }, 0);

    renderPreview(currentGameData);
}

// Save Question from Modal
questionForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const questionData = {
        text: document.getElementById('questionText').value,
        options: [
            document.getElementById('optionA').value,
            document.getElementById('optionB').value,
            document.getElementById('optionC').value,
            document.getElementById('optionD').value
        ],
        correctIndex: parseInt(document.querySelector('input[name="correctAnswer"]:checked').value),
        points: parseInt(document.getElementById('questionPoints').value),
        explanation: document.getElementById('questionExplanation').value
    };

    if (editingQuestionIndex !== null) {
        // Update existing question
        currentGameData.questions[editingQuestionIndex] = questionData;
    } else {
        // Add new question
        currentGameData.questions.push(questionData);
    }

    // Recalculate total points
    currentGameData.totalPoints = currentGameData.questions.reduce(function (sum, q) {
        return sum + (q.points || 10);
    }, 0);

    // Close modal and refresh preview
    questionModal.style.display = 'none';
    renderPreview(currentGameData);
});

// Close Modal
closeModal.addEventListener('click', function () {
    questionModal.style.display = 'none';
});

cancelModal.addEventListener('click', function () {
    questionModal.style.display = 'none';
});

// Close modal on outside click
questionModal.addEventListener('click', function (e) {
    if (e.target === questionModal) {
        questionModal.style.display = 'none';
    }
});

// Save Game Changes
async function saveGameChanges() {
    if (!currentGameData) return;

    if (!confirm('Save all changes to this game?')) return;

    try {
        // Update the game data
        originalGameData = JSON.parse(JSON.stringify(currentGameData));

        alert('✅ Changes saved! You can now publish the game or continue editing.');

        // Exit edit mode
        editMode = false;
        editModeToggle.classList.remove('active');
        renderPreview(currentGameData);

    } catch (error) {
        console.error('Save error:', error);
        alert('Failed to save changes. Please try again.');
    }
}

// Cancel Edit
function cancelEdit() {
    if (!confirm('Discard all changes?')) return;

    // Restore original data
    currentGameData = JSON.parse(JSON.stringify(originalGameData));

    // Exit edit mode
    editMode = false;
    editModeToggle.classList.remove('active');
    renderPreview(currentGameData);
}

// Publish Game
async function publishGame(gameData = currentGameData) {
    if (!gameData) {
        alert('No game data to publish');
        return;
    }

    try {
        // Add published flag to make game visible to students
        const publishData = {
            ...gameData,
            published: true,
            status: 'active'
        };

        const response = await fetch(`${API_BASE}/api/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(publishData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('🎉 Game published successfully!');
            addMessage('✅ Your game has been published and is now live for students!', 'ai');

            // Clear preview
            currentGameData = null;
            editMode = false;
            editModeToggle.classList.remove('active');
            editModeToggleContainer.style.display = 'none';

            previewContent.innerHTML = `
                <div class="empty-preview">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p>Game published! Create another one?</p>
                </div>
            `;
        } else {
            const error = await response.json();
            alert('Failed to publish: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Publish error:', error);
        alert('Failed to publish game. Please try again.');
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendMessage();
});

// Focus input on load
chatInput.focus();
