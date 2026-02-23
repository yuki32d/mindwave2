// Faculty Create Draw - Canvas Drawing Activity Creator
let backgroundImage = null;
let backgroundImageData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Background image upload
    document.getElementById('backgroundUpload').addEventListener('change', handleBackgroundUpload);

    // Update preview on changes
    document.getElementById('activityTitle').addEventListener('input', updatePreview);
    document.getElementById('promptText').addEventListener('input', updatePreview);
    document.getElementById('allowText').addEventListener('change', updatePreview);
    document.getElementById('allowShapes').addEventListener('change', updatePreview);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishActivity);
}

function handleBackgroundUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image is too large. Maximum size is 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            backgroundImage = img;
            backgroundImageData = event.target.result;
            drawCanvasPreview();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updatePreview() {
    const title = document.getElementById('activityTitle').value.trim() || 'Your activity will appear here';
    const prompt = document.getElementById('promptText').value.trim();

    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewPrompt').textContent = prompt;

    // Update tool visibility
    const allowText = document.getElementById('allowText').checked;
    const allowShapes = document.getElementById('allowShapes').checked;

    document.getElementById('textTool').style.opacity = allowText ? '1' : '0.3';
    document.getElementById('shapesTool').style.opacity = allowShapes ? '1' : '0.3';

    drawCanvasPreview();
}

function drawCanvasPreview() {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background if exists
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Draw placeholder grid
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;

        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }

        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }
    }
}

async function publishActivity() {
    const title = document.getElementById('activityTitle').value.trim();
    const promptText = document.getElementById('promptText').value.trim();

    if (!title) {
        alert('Please enter an activity title');
        return;
    }

    if (!promptText) {
        alert('Please enter prompt/instructions');
        return;
    }

    const canvasSize = document.getElementById('canvasSize').value.split('x');

    const activityData = {
        title,
        promptText,
        backgroundImageData,
        canvasWidth: parseInt(canvasSize[0]),
        canvasHeight: parseInt(canvasSize[1]),
        timeLimit: parseInt(document.getElementById('timeLimit').value) || null,
        allowText: document.getElementById('allowText').checked,
        allowShapes: document.getElementById('allowShapes').checked,
        type: 'draw',
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
            alert('✅ Drawing activity published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish activity');
        }
    } catch (error) {
        console.error('Error publishing activity:', error);
        alert('❌ Error publishing activity. Please try again.');
    }
}

// Back button handler
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
}
