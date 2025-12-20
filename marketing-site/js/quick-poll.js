/**
 * Quick Poll - Interactive JavaScript
 * Real-time polling with Chart.js and Socket.io
 */

// ===================================
// State Management
// ===================================

let currentPoll = null;
let resultsChart = null;
let socket = null;

// ===================================
// Initialize
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadPastPolls();
    initializeSocket();
});

// ===================================
// Socket.io Setup
// ===================================

function initializeSocket() {
    socket = io();

    socket.on('poll-response', (data) => {
        updateLiveResults(data);
        addResponseToStream(data);
    });

    socket.on('poll-ended', () => {
        showPollEndedNotification();
    });
}

// ===================================
// Event Listeners
// ===================================

function initializeEventListeners() {
    // Add option button
    document.getElementById('addOptionBtn').addEventListener('click', addOption);

    // Launch poll button
    document.getElementById('launchPollBtn').addEventListener('click', launchPoll);

    // Save draft button
    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);

    // End poll button
    document.getElementById('endPollBtn').addEventListener('click', endPoll);

    // Remove option buttons (delegated)
    document.getElementById('optionsContainer').addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove')) {
            removeOption(e.target.closest('.option-input'));
        }
    });
}

// ===================================
// Poll Creation
// ===================================

function addOption() {
    const container = document.getElementById('optionsContainer');
    const currentOptions = container.querySelectorAll('.option-input').length;

    if (currentOptions >= 6) {
        showNotification('Maximum 6 options allowed', 'warning');
        return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const letter = letters[currentOptions];

    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.innerHTML = `
        <span class="option-letter">${letter}</span>
        <input type="text" placeholder="Option ${letter}" data-option="${letter}">
        <button class="btn-remove"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(optionDiv);
    updateRemoveButtons();
}

function removeOption(optionElement) {
    const container = document.getElementById('optionsContainer');
    const options = container.querySelectorAll('.option-input');

    if (options.length <= 2) {
        showNotification('Minimum 2 options required', 'warning');
        return;
    }

    optionElement.remove();
    updateRemoveButtons();
    reorderOptions();
}

function updateRemoveButtons() {
    const container = document.getElementById('optionsContainer');
    const options = container.querySelectorAll('.option-input');
    const removeButtons = container.querySelectorAll('.btn-remove');

    removeButtons.forEach((btn, index) => {
        btn.disabled = options.length <= 2;
    });
}

function reorderOptions() {
    const container = document.getElementById('optionsContainer');
    const options = container.querySelectorAll('.option-input');
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    options.forEach((option, index) => {
        const letter = letters[index];
        option.querySelector('.option-letter').textContent = letter;
        option.querySelector('input').setAttribute('data-option', letter);
        option.querySelector('input').placeholder = `Option ${letter}`;
    });
}

// ===================================
// Launch Poll
// ===================================

async function launchPoll() {
    const question = document.getElementById('pollQuestion').value.trim();
    const optionInputs = document.querySelectorAll('.option-input input');
    const options = Array.from(optionInputs).map(input => ({
        letter: input.getAttribute('data-option'),
        text: input.value.trim()
    })).filter(opt => opt.text);

    // Validation
    if (!question) {
        showNotification('Please enter a poll question', 'error');
        return;
    }

    if (options.length < 2) {
        showNotification('Please enter at least 2 options', 'error');
        return;
    }

    const anonymous = document.getElementById('anonymousToggle').checked;
    const showResults = document.getElementById('showResultsToggle').checked;

    // Create poll object
    const pollData = {
        question,
        options,
        anonymous,
        showResults,
        createdAt: new Date().toISOString()
    };

    try {
        // Send to backend
        const response = await fetch('/api/polls/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(pollData)
        });

        const result = await response.json();

        if (result.ok) {
            currentPoll = result.poll;
            showLiveResults();
            showSuccessModal();

            // Emit to students via Socket.io
            socket.emit('poll-launched', currentPoll);
        } else {
            showNotification(result.message || 'Failed to launch poll', 'error');
        }
    } catch (error) {
        console.error('Error launching poll:', error);
        showNotification('Failed to launch poll', 'error');
    }
}

// ===================================
// Live Results Display
// ===================================

function showLiveResults() {
    document.getElementById('createSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';

    // Display question
    document.getElementById('pollQuestionDisplay').textContent = currentPoll.question;

    // Initialize chart
    initializeResultsChart();

    // Initialize results list
    updateResultsList();
}

function initializeResultsChart() {
    const ctx = document.getElementById('resultsChart').getContext('2d');

    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C7CEEA', '#FFDAC1'
    ];

    resultsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentPoll.options.map(opt => `${opt.letter}. ${opt.text}`),
            datasets: [{
                label: 'Responses',
                data: currentPoll.options.map(() => 0),
                backgroundColor: colors.slice(0, currentPoll.options.length),
                borderRadius: 12,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function updateResultsList() {
    const container = document.getElementById('resultsList');
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#C7CEEA', '#FFDAC1'
    ];

    container.innerHTML = currentPoll.options.map((option, index) => `
        <div class="result-item">
            <div class="result-letter" style="background: ${colors[index]}">
                ${option.letter}
            </div>
            <div class="result-content">
                <div class="result-text">${option.text}</div>
                <div class="result-bar">
                    <div class="result-bar-fill" style="width: 0%" data-option="${option.letter}"></div>
                </div>
                <div class="result-stats">
                    <span class="result-count"><i class="fas fa-users"></i> <span data-count="${option.letter}">0</span> responses</span>
                    <span class="result-percentage" data-percentage="${option.letter}">0%</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===================================
// Update Live Results
// ===================================

function updateLiveResults(data) {
    if (!currentPoll || !resultsChart) return;

    // Update chart
    const optionIndex = currentPoll.options.findIndex(opt => opt.letter === data.answer);
    if (optionIndex !== -1) {
        resultsChart.data.datasets[0].data[optionIndex]++;
        resultsChart.update();
    }

    // Update stats
    const totalResponses = resultsChart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    document.getElementById('totalResponses').textContent = totalResponses;

    // Calculate response rate (assuming 30 students in class)
    const responseRate = Math.round((totalResponses / 30) * 100);
    document.getElementById('responseRate').textContent = `${responseRate}%`;

    // Update detailed results
    currentPoll.options.forEach((option, index) => {
        const count = resultsChart.data.datasets[0].data[index];
        const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;

        const countEl = document.querySelector(`[data-count="${option.letter}"]`);
        const percentageEl = document.querySelector(`[data-percentage="${option.letter}"]`);
        const barEl = document.querySelector(`[data-option="${option.letter}"]`);

        if (countEl) countEl.textContent = count;
        if (percentageEl) percentageEl.textContent = `${percentage}%`;
        if (barEl) barEl.style.width = `${percentage}%`;
    });
}

// ===================================
// Response Stream
// ===================================

function addResponseToStream(data) {
    const container = document.getElementById('responseStream');
    const placeholder = container.querySelector('.stream-placeholder');

    if (placeholder) {
        placeholder.remove();
    }

    const responseItem = document.createElement('div');
    responseItem.className = 'response-item';

    const timeAgo = 'Just now';
    const anonymousName = `Student ${Math.floor(Math.random() * 100)}`;

    responseItem.innerHTML = `
        <div class="response-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="response-content">
            <div class="response-answer">
                ${currentPoll.anonymous ? 'Anonymous' : anonymousName} selected <strong>${data.answer}</strong>
            </div>
            <div class="response-time">${timeAgo}</div>
        </div>
    `;

    container.insertBefore(responseItem, container.firstChild);

    // Keep only last 10 responses
    const responses = container.querySelectorAll('.response-item');
    if (responses.length > 10) {
        responses[responses.length - 1].remove();
    }
}

// ===================================
// End Poll
// ===================================

async function endPoll() {
    if (!confirm('Are you sure you want to end this poll?')) {
        return;
    }

    try {
        const response = await fetch(`/api/polls/${currentPoll._id}/end`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (result.ok) {
            socket.emit('poll-ended', currentPoll._id);
            showNotification('Poll ended successfully', 'success');

            // Reset to create section
            setTimeout(() => {
                document.getElementById('resultsSection').style.display = 'none';
                document.getElementById('createSection').style.display = 'block';
                resetPollForm();
                loadPastPolls();
            }, 2000);
        }
    } catch (error) {
        console.error('Error ending poll:', error);
        showNotification('Failed to end poll', 'error');
    }
}

// ===================================
// Save Draft
// ===================================

function saveDraft() {
    const question = document.getElementById('pollQuestion').value.trim();
    const optionInputs = document.querySelectorAll('.option-input input');
    const options = Array.from(optionInputs).map(input => input.value.trim());

    const draft = {
        question,
        options,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('poll_draft', JSON.stringify(draft));
    showNotification('Draft saved!', 'success');
}

// ===================================
// Load Past Polls
// ===================================

async function loadPastPolls() {
    try {
        const response = await fetch('/api/polls/history', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (result.ok) {
            displayPastPolls(result.polls);
        }
    } catch (error) {
        console.error('Error loading past polls:', error);
    }
}

function displayPastPolls(polls) {
    const container = document.getElementById('pastPollsGrid');

    if (!polls || polls.length === 0) {
        container.innerHTML = '<p style="color: #9CA3AF; text-align: center; grid-column: 1/-1;">No past polls yet</p>';
        return;
    }

    container.innerHTML = polls.map(poll => {
        const date = new Date(poll.createdAt).toLocaleDateString();
        const totalResponses = poll.responses ? poll.responses.length : 0;

        return `
            <div class="poll-card" onclick="viewPollResults('${poll._id}')">
                <div class="poll-card-header">
                    <span class="poll-card-date">${date}</span>
                </div>
                <div class="poll-card-question">${poll.question}</div>
                <div class="poll-card-stats">
                    <span class="poll-card-stat">
                        <i class="fas fa-users"></i> ${totalResponses} responses
                    </span>
                    <span class="poll-card-stat">
                        <i class="fas fa-list"></i> ${poll.options.length} options
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function viewPollResults(pollId) {
    // TODO: Implement view past poll results
    console.log('View poll:', pollId);
}

// ===================================
// Utility Functions
// ===================================

function resetPollForm() {
    document.getElementById('pollQuestion').value = '';
    const optionInputs = document.querySelectorAll('.option-input input');
    optionInputs.forEach(input => input.value = '');
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('active');
}

function showNotification(message, type = 'info') {
    // Simple notification (you can enhance this with a toast library)
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
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

function showPollEndedNotification() {
    showNotification('Poll has been ended by the instructor', 'info');
}
