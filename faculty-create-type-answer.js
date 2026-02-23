// Faculty Create Type Answer - Smart Text Input with Auto-Grading
let correctAnswers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Back button
    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());

    // Add answer button
    document.getElementById('addAnswerBtn').addEventListener('click', addAnswer);

    // Enter key to add answer
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAnswer();
        }
    });

    // Update preview on input changes
    document.getElementById('questionText').addEventListener('input', updatePreview);
    document.getElementById('hintText').addEventListener('input', updatePreview);
    document.getElementById('charLimit').addEventListener('input', updatePreview);
    document.getElementById('showHint').addEventListener('change', updatePreview);

    // Character count for preview input
    document.getElementById('previewInput').addEventListener('input', updateCharCount);

    // Test answer button
    document.getElementById('testAnswerBtn').addEventListener('click', testAnswer);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishQuestion);
}

function addAnswer() {
    const input = document.getElementById('answerInput');
    const answerText = input.value.trim();

    if (!answerText) {
        alert('Please enter an answer');
        return;
    }

    if (correctAnswers.includes(answerText)) {
        alert('This answer is already added');
        return;
    }

    correctAnswers.push(answerText);
    input.value = '';
    updateAnswersList();
}

function updateAnswersList() {
    const container = document.getElementById('answersList');

    if (correctAnswers.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; margin-top: 20px;">No answers added yet</p>';
        return;
    }

    container.innerHTML = correctAnswers.map((answer, index) => `
        <div class="list-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="flex: 1; font-family: monospace; color: #00D9FF;">"${answer}"</span>
            <button onclick="removeAnswer(${index})" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
        </div>
    `).join('');
}

function removeAnswer(index) {
    correctAnswers.splice(index, 1);
    updateAnswersList();
}

function updatePreview() {
    const questionText = document.getElementById('questionText').value.trim();
    const hintText = document.getElementById('hintText').value.trim();
    const showHint = document.getElementById('showHint').checked;

    document.getElementById('previewQuestion').textContent = questionText || 'Your question will appear here';
    document.getElementById('previewHint').textContent = (showHint && hintText) ? `💡 Hint: ${hintText}` : '';

    updateCharCount();
}

function updateCharCount() {
    const input = document.getElementById('previewInput');
    const charLimit = parseInt(document.getElementById('charLimit').value) || 0;
    const currentLength = input.value.length;
    const countDisplay = document.getElementById('previewCharCount');

    if (charLimit > 0) {
        countDisplay.textContent = `${currentLength} / ${charLimit} characters`;
        countDisplay.style.color = currentLength > charLimit ? '#ff3b30' : '#9ea4b6';

        // Enforce limit
        if (currentLength > charLimit) {
            input.value = input.value.substring(0, charLimit);
        }
    } else {
        countDisplay.textContent = '';
    }
}

function testAnswer() {
    const studentAnswer = document.getElementById('previewInput').value;
    const resultDiv = document.getElementById('testResult');

    if (!studentAnswer.trim()) {
        alert('Please type an answer to test');
        return;
    }

    if (correctAnswers.length === 0) {
        alert('Please add at least one correct answer first');
        return;
    }

    const isCorrect = checkAnswer(studentAnswer);

    resultDiv.style.display = 'block';
    if (isCorrect) {
        resultDiv.style.background = 'rgba(16, 185, 129, 0.2)';
        resultDiv.style.border = '2px solid rgba(16, 185, 129, 0.4)';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">✅</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 4px;">Correct!</div>
                    <div style="color: #9ea4b6; font-size: 14px;">Your answer matches: "${isCorrect}"</div>
                </div>
            </div>
        `;
    } else {
        resultDiv.style.background = 'rgba(255, 59, 48, 0.2)';
        resultDiv.style.border = '2px solid rgba(255, 59, 48, 0.4)';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">❌</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: #ff3b30; margin-bottom: 4px;">Incorrect</div>
                    <div style="color: #9ea4b6; font-size: 14px;">Expected: ${correctAnswers.join(' or ')}</div>
                </div>
            </div>
        `;
    }
}

function checkAnswer(studentAnswer) {
    const caseSensitive = document.getElementById('caseSensitive').checked;
    const trimWhitespace = document.getElementById('trimWhitespace').checked;

    let processedAnswer = studentAnswer;
    if (trimWhitespace) {
        processedAnswer = processedAnswer.trim().replace(/\s+/g, ' ');
    }

    for (const correctAnswer of correctAnswers) {
        let processedCorrect = correctAnswer;
        if (trimWhitespace) {
            processedCorrect = processedCorrect.trim().replace(/\s+/g, ' ');
        }

        const match = caseSensitive
            ? processedAnswer === processedCorrect
            : processedAnswer.toLowerCase() === processedCorrect.toLowerCase();

        if (match) {
            return correctAnswer;
        }
    }

    return false;
}

async function publishQuestion() {
    const title = document.getElementById('questionTitle').value.trim();
    const questionText = document.getElementById('questionText').value.trim();

    if (!title) {
        alert('Please enter a question title');
        return;
    }

    if (!questionText) {
        alert('Please enter the question text');
        return;
    }

    if (correctAnswers.length === 0) {
        alert('Please add at least one correct answer');
        return;
    }

    const activityData = {
        type: 'type-answer',
        title,
        description: 'Type the correct answer',
        content: {
            questionText,
            correctAnswers,
            charLimit: parseInt(document.getElementById('charLimit').value) || null,
            caseSensitive: document.getElementById('caseSensitive').checked,
            trimWhitespace: document.getElementById('trimWhitespace').checked,
            showHint: document.getElementById('showHint').checked,
            hintText: document.getElementById('hintText').value.trim()
        },
        settings: {
            timeLimit: 0,
            showCorrectAnswers: true
        }
    };

    try {
        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(activityData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccessModal(result.activityId, title);
        } else {
            throw new Error('Failed to publish activity');
        }
    } catch (error) {
        console.error('Error publishing activity:', error);
        alert('❌ Error publishing activity. Please try again.');
    }
}

function showSuccessModal(activityId, activityTitle) {
    // Create modal HTML
    const modalHTML = `
        <div id="successModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                    <h2 style="color: #f5f7ff; margin: 0 0 8px; font-size: 28px;">Activity Created!</h2>
                    <p style="color: #9ea4b6; margin: 0;">${activityTitle}</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="startLiveBtn" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer; transition: transform 0.2s;">
                        🎮 Start Live Session
                    </button>
                    <button id="viewDashboardBtn" class="secondary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f5f7ff; cursor: pointer; transition: all 0.2s;">
                        📊 View Dashboard
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners
    document.getElementById('startLiveBtn').addEventListener('click', () => startLiveSession(activityId));
    document.getElementById('viewDashboardBtn').addEventListener('click', () => {
        window.location.href = 'interactive-tools-selector.html';
    });

    // Add hover effects
    const startBtn = document.getElementById('startLiveBtn');
    startBtn.addEventListener('mouseenter', () => {
        startBtn.style.transform = 'translateY(-2px)';
        startBtn.style.boxShadow = '0 8px 24px rgba(0, 217, 255, 0.4)';
    });
    startBtn.addEventListener('mouseleave', () => {
        startBtn.style.transform = 'translateY(0)';
        startBtn.style.boxShadow = 'none';
    });
}

async function startLiveSession(activityId) {
    try {
        const response = await fetch(`/api/live-sessions/${activityId}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            showLiveSessionCode(result.session);
        } else {
            throw new Error('Failed to start live session');
        }
    } catch (error) {
        console.error('Error starting live session:', error);
        alert('❌ Error starting live session. Please try again.');
    }
}

function showLiveSessionCode(session) {
    // Remove success modal
    document.getElementById('successModal')?.remove();

    // Create live session modal
    const modalHTML = `
        <div id="liveSessionModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 48px; max-width: 600px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center;">
                <div style="font-size: 64px; margin-bottom: 24px;">🎮</div>
                <h2 style="color: #f5f7ff; margin: 0 0 12px; font-size: 32px;">Live Session Started!</h2>
                <p style="color: #9ea4b6; margin: 0 0 32px; font-size: 16px;">Share this code with your students</p>
                
                <div style="background: rgba(0, 217, 255, 0.1); border: 2px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 32px; margin-bottom: 32px;">
                    <div style="font-size: 72px; font-weight: 700; letter-spacing: 16px; color: #00d9ff; font-family: 'Courier New', monospace;">${session.code}</div>
                </div>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #9ea4b6;">Activity:</span>
                        <span style="color: #f5f7ff; font-weight: 600;">${session.activityTitle}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #9ea4b6;">Type:</span>
                        <span style="color: #f5f7ff;">${session.activityType}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #9ea4b6;">Status:</span>
                        <span style="color: #10b981; font-weight: 600;">● Active</span>
                    </div>
                </div>
                
                <p style="color: #9ea4b6; font-size: 14px; margin-bottom: 24px;">
                    Students can join by entering this code on their Live Activity page
                </p>
                
                <button id="closeLiveModal" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                    Done
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('closeLiveModal').addEventListener('click', () => {
        window.location.href = 'interactive-tools-selector.html';
    });
}
