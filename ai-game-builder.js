// AI Game Builder - Frontend Logic
const API_BASE = window.location.origin;

let chatHistory = [];
let currentGameData = null;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const previewContent = document.getElementById('previewContent');

// Send Message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

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

        if (data.ok) {
            // Add AI response
            addMessage(data.reply, 'ai');

            // Update chat history
            chatHistory.push({ role: 'user', parts: [{ text: message }] });
            chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });

            // Handle game data
            if (data.gameData) {
                currentGameData = data.gameData;
                renderPreview(data.gameData);
            }

            // Handle publish action
            if (data.action === 'publish' && currentGameData) {
                await publishGame(currentGameData);
            }
        } else {
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
        html += `<div class="game-preview">
            <h3>Questions (${gameData.questions.length})</h3>`;
        gameData.questions.forEach((q, i) => {
            html += `
                <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                <ul style="margin: 8px 0 16px 20px; color: #9ea4b6;">
                    ${q.options.map((opt, idx) => `
                        <li style="color: ${idx === q.correctIndex ? '#34c759' : '#9ea4b6'}">
                            ${opt} ${idx === q.correctIndex ? '✓' : ''}
                        </li>
                    `).join('')}
                </ul>
            `;
        });
        html += `</div>`;
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
        html += `<div class="game-preview">
            <h3>Code Lines (${gameData.lines.length})</h3>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${gameData.lines.join('\n')}</pre>
        </div>`;
    }

    if (gameData.type === 'syntax-fill') {
        html += `<div class="game-preview">
            <h3>Code Template</h3>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${gameData.content}</pre>
            <p><strong>Blanks:</strong> ${gameData.blanks ? gameData.blanks.length : 0}</p>
        </div>`;
    }

    if (gameData.type === 'bug-hunt') {
        html += `<div class="game-preview">
            <h3>Buggy Code</h3>
            <pre style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto;">${gameData.buggyCode}</pre>
            <p><strong>Bugs to find:</strong> ${gameData.bugCount || 0}</p>
            <p><strong>Language:</strong> ${gameData.language || 'Not specified'}</p>
        </div>`;
    }

    if (gameData.type === 'tech-sorter') {
        html += `<div class="game-preview">
            <h3>Items to Sort</h3>
            <p><strong>Items:</strong> ${gameData.items ? gameData.items.join(', ') : 'None'}</p>
            <p><strong>Categories:</strong> ${gameData.categories ? gameData.categories.join(', ') : 'None'}</p>
        </div>`;
    }

    // Add publish button
    // Add publish button (without inline onclick)
    html += `<button class="publish-btn" id="publishGameBtn">✅ Publish Game</button>`;

    previewContent.innerHTML = html;

    // Add event listener to publish button
    const publishBtn = document.getElementById('publishGameBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => publishGame());
    }
}

// Format Game Type
function formatGameType(type) {
    const types = {
        'quiz': 'Quiz',
        'sql-builder': 'SQL Builder',
        'code-unjumble': 'Code Unjumble',
        'syntax-fill': 'Syntax Fill-in',
        'bug-hunt': 'Bug Hunt',
        'tech-sorter': 'Tech Sorter'
    };
    return types[type] || type;
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
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Focus input on load
chatInput.focus();
