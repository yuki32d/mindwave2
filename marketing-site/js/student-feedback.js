/**
 * Student Feedback - Submission JavaScript
 * Real-time feedback submission with Socket.io
 */

// ===================================
// State Management
// ===================================

let selectedConfidence = null;
let socket = null;
let feedbackActive = false;

// ===================================
// Initialize
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeEventListeners();
    checkFeedbackStatus();
});

// ===================================
// Socket.io Setup
// ===================================

function initializeSocket() {
    socket = io();

    socket.on('feedback-started', () => {
        feedbackActive = true;
        showFeedbackForm();
    });

    socket.on('feedback-stopped', () => {
        feedbackActive = false;
        showInactiveState();
    });
}

// ===================================
// Event Listeners
// ===================================

function initializeEventListeners() {
    // Emoji button selection
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => selectConfidence(btn));
    });

    // Character count
    const textarea = document.getElementById('feedbackComment');
    textarea.addEventListener('input', updateCharCount);

    // Submit button
    document.getElementById('submitBtn').addEventListener('click', submitFeedback);
}

// ===================================
// Check Feedback Status
// ===================================

async function checkFeedbackStatus() {
    try {
        const response = await fetch('/api/feedback/status', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (result.ok && result.active) {
            feedbackActive = true;
            showFeedbackForm();
        } else {
            showInactiveState();
        }
    } catch (error) {
        console.error('Error checking feedback status:', error);
        showInactiveState();
    }
}

// ===================================
// Show States
// ===================================

function showFeedbackForm() {
    document.getElementById('feedbackSection').style.display = 'block';
    document.getElementById('successSection').style.display = 'none';
    document.getElementById('inactiveSection').style.display = 'none';
}

function showSuccessState() {
    document.getElementById('feedbackSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'block';
    document.getElementById('inactiveSection').style.display = 'none';
}

function showInactiveState() {
    document.getElementById('feedbackSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
    document.getElementById('inactiveSection').style.display = 'block';
}

// ===================================
// Select Confidence
// ===================================

function selectConfidence(button) {
    // Remove previous selection
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Add selection to clicked button
    button.classList.add('selected');

    selectedConfidence = parseInt(button.getAttribute('data-value'));

    // Enable submit button
    document.getElementById('submitBtn').disabled = false;
}

// ===================================
// Update Character Count
// ===================================

function updateCharCount() {
    const textarea = document.getElementById('feedbackComment');
    const charCount = document.getElementById('charCount');
    const count = textarea.value.length;

    charCount.textContent = count;

    // Limit to 500 characters
    if (count > 500) {
        textarea.value = textarea.value.substring(0, 500);
        charCount.textContent = '500';
    }
}

// ===================================
// Submit Feedback
// ===================================

async function submitFeedback() {
    if (!selectedConfidence) {
        showError('Please select your confidence level');
        return;
    }

    const comment = document.getElementById('feedbackComment').value.trim();

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch('/api/feedback/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                confidence: selectedConfidence,
                comment: comment || null
            })
        });

        const result = await response.json();

        if (result.ok) {
            // Emit to Socket.io for real-time update
            socket.emit('feedback-submitted', {
                confidence: selectedConfidence,
                comment: comment || null
            });

            // Show success
            setTimeout(() => {
                showSuccessState();
            }, 500);
        } else {
            showError(result.message || 'Failed to submit feedback');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showError('Failed to submit feedback');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
    }
}

// ===================================
// Utility Functions
// ===================================

function showError(message) {
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
