// Faculty Create Video Response - Webcam Recording Activity Creator

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Update preview on changes
    document.getElementById('activityTitle').addEventListener('input', updatePreview);
    document.getElementById('questionText').addEventListener('input', updatePreview);
    document.getElementById('maxDuration').addEventListener('input', updatePreview);
    document.getElementById('retakesAllowed').addEventListener('change', updatePreview);
    document.getElementById('showTimer').addEventListener('change', updatePreview);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishActivity);

    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => window.history.back());
    }
}

function updatePreview() {
    const title = document.getElementById('activityTitle').value.trim() || 'Your activity will appear here';
    const question = document.getElementById('questionText').value.trim();
    const maxDuration = parseInt(document.getElementById('maxDuration').value) || 180;
    const retakes = document.getElementById('retakesAllowed').value;
    const showTimer = document.getElementById('showTimer').checked;

    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewQuestion').textContent = question;

    // Update timer display
    const minutes = Math.floor(maxDuration / 60);
    const seconds = maxDuration % 60;
    document.getElementById('maxTimeDisplay').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timerPreview').style.display = showTimer ? 'block' : 'none';

    // Update retakes info
    const retakesInfo = document.getElementById('retakesInfo');
    if (retakes === 'unlimited') {
        retakesInfo.textContent = '♾️ Unlimited retakes allowed';
    } else {
        retakesInfo.textContent = `🔄 ${retakes} attempt(s) allowed`;
    }
}

async function publishActivity() {
    const title = document.getElementById('activityTitle').value.trim();
    const questionText = document.getElementById('questionText').value.trim();
    const maxDuration = parseInt(document.getElementById('maxDuration').value);

    if (!title) {
        alert('Please enter an activity title');
        return;
    }

    if (!questionText) {
        alert('Please enter a question/prompt');
        return;
    }

    if (!maxDuration || maxDuration < 10) {
        alert('Please enter a valid maximum duration (at least 10 seconds)');
        return;
    }

    const minDuration = parseInt(document.getElementById('minDuration').value) || null;

    if (minDuration && minDuration >= maxDuration) {
        alert('Minimum duration must be less than maximum duration');
        return;
    }

    const activityData = {
        title,
        questionText,
        minDuration,
        maxDuration,
        retakesAllowed: document.getElementById('retakesAllowed').value,
        requireReview: document.getElementById('requireReview').checked,
        showTimer: document.getElementById('showTimer').checked,
        rubricText: document.getElementById('rubricText').value.trim(),
        type: 'video-response',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(activityData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Video response activity published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish activity');
        }
    } catch (error) {
        console.error('Error publishing activity:', error);
        alert('❌ Error publishing activity. Please try again.');
    }
}
