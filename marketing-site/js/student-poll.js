/**
 * Student Poll Response - Interactive JavaScript
 * Real-time poll participation with Socket.io
 */

// ===================================
// State Management
// ===================================

let currentPoll = null;
let selectedOption = null;
let socket = null;

// ===================================
// Initialize
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    checkActivePoll();
});

// ===================================
// Socket.io Setup
// ===================================

function initializeSocket() {
    socket = io();

    // Listen for new poll
    socket.on('poll-launched', (poll) => {
        currentPoll = poll;
        showActivePoll();
    });

    // Listen for poll ended
    socket.on('poll-ended', () => {
        if (document.getElementById('activePollSection').style.display !== 'none') {
            showPollEndedMessage();
        }
    });

    // Listen for live results updates
    socket.on('results-update', (results) => {
        if (document.getElementById('resultsSection').style.display !== 'none') {
            updateResults(results);
        }
    });
}

// ===================================
// Check for Active Poll
// ===================================

async function checkActivePoll() {
    try {
        const response = await fetch('/api/polls/active', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (result.ok && result.poll) {
            currentPoll = result.poll;

            // Check if already responded
            if (result.hasResponded) {
                showResults(result.results);
            } else {
                showActivePoll();
            }
        } else {
            showWaitingState();
        }
    } catch (error) {
        console.error('Error checking active poll:', error);
        showWaitingState();
    }
}

// ===================================
// Show States
// ===================================

function showWaitingState() {
    document.getElementById('waitingSection').style.display = 'block';
    document.getElementById('activePollSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
}

function showActivePoll() {
    document.getElementById('waitingSection').style.display = 'none';
    document.getElementById('activePollSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';

    // Display question
    document.getElementById('pollQuestion').textContent = currentPoll.question;

    // Display options
    displayOptions();
}

function showResults(results) {
    document.getElementById('waitingSection').style.display = 'none';
    document.getElementById('activePollSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';

    displayResults(results);
}

// ===================================
// Display Options
// ===================================

function displayOptions() {
    const container = document.getElementById('optionsGrid');

    container.innerHTML = currentPoll.options.map(option => `
        <div class="option-card" data-option="${option.letter}" onclick="selectOption('${option.letter}')">
            <div class="option-letter">${option.letter}</div>
            <div class="option-text">${option.text}</div>
            <div class="option-check">
                <i class="fas fa-check"></i>
            </div>
        </div>
    `).join('');

    // Add submit button listener
    document.getElementById('submitBtn').addEventListener('click', submitResponse);
}

// ===================================
// Select Option
// ===================================

function selectOption(letter) {
    // Remove previous selection
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked option
    const selectedCard = document.querySelector(`[data-option="${letter}"]`);
    selectedCard.classList.add('selected');

    selectedOption = letter;

    // Enable submit button
    document.getElementById('submitBtn').disabled = false;
}

// ===================================
// Submit Response
// ===================================

async function submitResponse() {
    if (!selectedOption) {
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch('/api/polls/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                pollId: currentPoll._id,
                answer: selectedOption
            })
        });

        const result = await response.json();

        if (result.ok) {
            // Emit to Socket.io for real-time update
            socket.emit('poll-response', {
                pollId: currentPoll._id,
                answer: selectedOption
            });

            // Show results if allowed
            if (currentPoll.showResults) {
                setTimeout(() => {
                    showResults(result.results);
                }, 500);
            } else {
                showThankYouMessage();
            }
        } else {
            showError(result.message || 'Failed to submit response');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Submit Answer';
        }
    } catch (error) {
        console.error('Error submitting response:', error);
        showError('Failed to submit response');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Submit Answer';
    }
}

// ===================================
// Display Results
// ===================================

function displayResults(results) {
    const container = document.getElementById('resultsContainer');
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C7CEEA', '#FFDAC1'
    ];

    const totalResponses = results.reduce((sum, r) => sum + r.count, 0);

    container.innerHTML = results.map((result, index) => {
        const percentage = totalResponses > 0 ? Math.round((result.count / totalResponses) * 100) : 0;
        const isSelected = result.option === selectedOption;

        return `
            <div class="result-bar ${isSelected ? 'selected' : ''}">
                <div class="result-header">
                    <div class="result-label">
                        <div class="result-letter-small" style="background: ${colors[index]}">
                            ${result.option}
                        </div>
                        <span>${result.text}</span>
                    </div>
                    <div class="result-percentage">${percentage}%</div>
                </div>
                <div class="result-progress">
                    <div class="result-progress-fill" style="width: ${percentage}%; background: linear-gradient(90deg, ${colors[index]}, ${colors[index]}dd)"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// Update Results (Real-time)
// ===================================

function updateResults(results) {
    const totalResponses = results.reduce((sum, r) => sum + r.count, 0);

    results.forEach((result, index) => {
        const percentage = totalResponses > 0 ? Math.round((result.count / totalResponses) * 100) : 0;

        const percentageEl = document.querySelectorAll('.result-percentage')[index];
        const fillEl = document.querySelectorAll('.result-progress-fill')[index];

        if (percentageEl) percentageEl.textContent = `${percentage}%`;
        if (fillEl) fillEl.style.width = `${percentage}%`;
    });
}

// ===================================
// Messages
// ===================================

function showThankYouMessage() {
    const section = document.getElementById('activePollSection');
    section.innerHTML = `
        <div class="waiting-card">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h1>Thank You!</h1>
            <p>Your response has been submitted.</p>
            <button class="btn-back" onclick="location.href='homepage.html'">
                <i class="fas fa-arrow-left"></i> Back to Home
            </button>
        </div>
    `;
}

function showPollEndedMessage() {
    const section = document.getElementById('activePollSection');
    section.innerHTML = `
        <div class="waiting-card">
            <div class="waiting-icon" style="background: #F59E0B;">
                <i class="fas fa-clock"></i>
            </div>
            <h1>Poll Ended</h1>
            <p>This poll has been closed by your instructor.</p>
            <button class="btn-back" onclick="location.href='homepage.html'">
                <i class="fas fa-arrow-left"></i> Back to Home
            </button>
        </div>
    `;
}

function showError(message) {
    // Simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #EF4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
