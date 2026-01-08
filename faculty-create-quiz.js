// Quiz Creation - Clean version with API integration
function createQuestionHTML(id, index) {
    return `
        <div class="question-card" id="q-${id}">
            <h3>Question ${index + 1}</h3>
            <button type="button" class="remove-btn" data-question-id="${id}">Remove</button>
            
            <label>Question Text</label>
            <input type="text" name="q-${id}-text" placeholder="Enter your question..." required>
            
            
            <div style="margin-top: 20px;">
                <label>Options (Select the correct one)</label>
            </div>
            <div class="options-grid">
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="0" required>
                    <input type="text" name="q-${id}-opt-0" placeholder="Option A" required>
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="1">
                    <input type="text" name="q-${id}-opt-1" placeholder="Option B" required>
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="2">
                    <input type="text" name="q-${id}-opt-2" placeholder="Option C">
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="3">
                    <input type="text" name="q-${id}-opt-3" placeholder="Option D">
                </div>
            </div>
            
            <div style="margin-top: 16px;">
                <label>Points for this question</label>
                <input type="number" name="q-${id}-points" value="10" min="1" class="points-input">
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing quiz form');

    const container = document.getElementById('questionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const countSpan = document.getElementById('questionCount');
    const pointsSpan = document.getElementById('totalPoints');

    if (!container || !addBtn || !countSpan || !pointsSpan) {
        console.error('Required elements not found!', { container, addBtn, countSpan, pointsSpan });
        alert('Error: Page elements not found. Please refresh the page.');
        return;
    }

    addBtn.addEventListener('click', () => {
        const id = Date.now().toString();
        const index = container.children.length;
        const div = document.createElement('div');
        div.innerHTML = createQuestionHTML(id, index);
        container.appendChild(div);
        updateStats();
    });

    window.removeQuestion = function (id) {
        const card = document.getElementById(`q-${id}`);
        if (card) {
            card.remove();
            // Renumber questions
            Array.from(container.children).forEach((child, idx) => {
                child.querySelector('h3').textContent = `Question ${idx + 1}`;
            });
            updateStats();
        }
    };

    window.updateTotalPoints = function () {
        updateStats();
    }

    function updateStats() {
        countSpan.textContent = container.children.length;
        let total = 0;
        container.querySelectorAll('input[name$="-points"]').forEach(input => {
            total += parseInt(input.value) || 0;
        });
        pointsSpan.textContent = total;
    }

    // Form Submission
    const quizForm = document.getElementById('quizForm');
    if (!quizForm) {
        console.error('Quiz form not found!');
        alert('Error: Quiz form not found. Please refresh the page.');
        return;
    }

    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('=== QUIZ FORM SUBMITTED ===');
        const formData = new FormData(e.target);

        // Parse Questions
        const questionNodes = container.querySelectorAll('.question-card');
        const parsedQuestions = Array.from(questionNodes).map(node => {
            const id = node.id.replace('q-', '');
            return {
                text: formData.get(`q-${id}-text`),
                options: [
                    formData.get(`q-${id}-opt-0`),
                    formData.get(`q-${id}-opt-1`),
                    formData.get(`q-${id}-opt-2`),
                    formData.get(`q-${id}-opt-3`)
                ].filter(Boolean), // Remove empty options
                correctIndex: parseInt(formData.get(`q-${id}-correct`)),
                points: parseInt(formData.get(`q-${id}-points`))
            };
        });

        if (parsedQuestions.length === 0) {
            alert('Please add at least one question.');
            return;
        }

        // Store quiz data for modal (use global variable)
        window.quizDataToPublish = {
            type: 'quiz',
            title: formData.get('title'),
            description: formData.get('description') || 'Multiple choice quiz',
            duration: parseInt(formData.get('duration')),
            questions: parsedQuestions,
            totalPoints: parsedQuestions.reduce((sum, q) => sum + q.points, 0),
            published: true
        };

        // Show publish modal instead of directly publishing
        showPublishModal();
    });

    // Add first question by default
    addBtn.click();
});

// Function called by publish modal when confirmed (MUST be global)
async function publishGameWithClasses(targetClasses, isPublic) {
    if (!window.quizDataToPublish) {
        alert('Error: No quiz data to publish');
        return;
    }

    const gameData = {
        ...window.quizDataToPublish,
        targetClasses,
        isPublic
    };

    console.log('=== PUBLISHING QUIZ WITH CLASSES ===');
    console.log('Full data:', JSON.stringify(gameData, null, 2));

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(gameData)
        });

        console.log('=== RESPONSE RECEIVED ===');
        console.log('Status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('=== SUCCESS ===');
            alert('✅ Quiz published successfully!');
            window.location.href = 'admin.html';
        } else {
            const error = await response.json();
            console.error('=== ERROR RESPONSE ===', error);
            alert('Failed to publish quiz: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('=== FETCH ERROR ===', err);
        alert('Failed to publish quiz. Please check your connection.');
    }
}

// Live Session Modal Functions
function showSuccessModal(activityId, activityTitle) {
    const modalHTML = `
        <div id="successModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 40px; max-width: 500px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
                    <h2 style="color: #f5f7ff; margin: 0 0 8px; font-size: 28px;">Activity Created!</h2>
                    <p style="color: #9ea4b6; margin: 0;">${activityTitle}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="startLiveBtn" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">
                        🎮 Start Live Session
                    </button>
                    <button id="viewDashboardBtn" class="secondary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #f5f7ff; cursor: pointer;">
                        📊 View Dashboard
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('startLiveBtn').addEventListener('click', () => startLiveSession(activityId));
    document.getElementById('viewDashboardBtn').addEventListener('click', () => window.location.href = 'interactive-tools-selector.html');
}

async function startLiveSession(activityId) {
    try {
        const response = await fetch(`/api/live-sessions/${activityId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
            const result = await response.json();
            showLiveSessionCode(result.session);
        } else throw new Error('Failed to start live session');
    } catch (error) {
        console.error('Error starting live session:', error);
        alert('❌ Error starting live session. Please try again.');
    }
}

function showLiveSessionCode(session) {
    document.getElementById('successModal')?.remove();
    const modalHTML = `
        <div id="liveSessionModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: #1a1d2e; border-radius: 16px; padding: 48px; max-width: 600px; width: 90%; border: 1px solid rgba(0, 217, 255, 0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.5); text-align: center;">
                <div style="font-size: 64px; margin-bottom: 24px;">🎮</div>
                <h2 style="color: #f5f7ff; margin: 0 0 12px; font-size: 32px;">Live Session Started!</h2>
                <p style="color: #9ea4b6; margin: 0 0 32px;">Share this code with your students</p>
                <div style="background: rgba(0, 217, 255, 0.1); border: 2px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 32px; margin-bottom: 32px;">
                    <div style="font-size: 72px; font-weight: 700; letter-spacing: 16px; color: #00d9ff; font-family: 'Courier New', monospace;">${session.code}</div>
                </div>
                <button id="closeLiveModal" class="primary-btn" style="width: 100%; padding: 16px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #00d9ff 0%, #8b5cf6 100%); border: none; border-radius: 8px; color: white; cursor: pointer;">Done</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('closeLiveModal').addEventListener('click', () => window.location.href = 'interactive-tools-selector.html');
}

// Event delegation for dynamically created elements
document.addEventListener('click', (e) => {
    // Handle remove button clicks
    if (e.target.classList.contains('remove-btn')) {
        const questionId = e.target.dataset.questionId;
        if (questionId) {
            removeQuestion(questionId);
        }
    }
});

// Event delegation for points input
document.addEventListener('input', (e) => {
    if (e.target.classList.contains('points-input')) {
        updateTotalPoints();
    }
});

// Cancel button handler
const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
}
