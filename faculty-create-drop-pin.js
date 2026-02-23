// Faculty Create Drop Pin - Collect Feedback on Images
let uploadedImage = null;
let imageData = null;
let canvas, ctx;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Back button event listener
    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());

    canvas = document.getElementById('imageCanvas');
    ctx = canvas.getContext('2d');
    setupEventListeners();
});

function setupEventListeners() {
    // Image upload
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishActivity);
}

function handleImageUpload(e) {
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
            uploadedImage = img;
            setupCanvas();
            document.getElementById('uploadPrompt').style.display = 'none';
            canvas.style.display = 'block';
            updatePinsInfo();
        };
        img.src = event.target.result;
        imageData = event.target.result; // Store base64 for saving
    };
    reader.readAsDataURL(file);
}

function setupCanvas() {
    // Set canvas size to match image (max 800px width)
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / uploadedImage.width);

    canvas.width = uploadedImage.width * scale;
    canvas.height = uploadedImage.height * scale;

    drawCanvas();
}

function drawCanvas() {
    if (!uploadedImage) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

    // Draw sample pins for preview
    drawSamplePins();
}

function drawSamplePins() {
    const samplePins = [
        { x: canvas.width * 0.3, y: canvas.height * 0.4, color: '#FF6B6B' },
        { x: canvas.width * 0.6, y: canvas.height * 0.3, color: '#4ECDC4' },
        { x: canvas.width * 0.5, y: canvas.height * 0.7, color: '#45B7D1' }
    ];

    samplePins.forEach(pin => {
        // Draw pin shadow
        ctx.beginPath();
        ctx.arc(pin.x, pin.y + 2, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // Draw pin
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = pin.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw pin stem
        ctx.beginPath();
        ctx.moveTo(pin.x, pin.y);
        ctx.lineTo(pin.x, pin.y + 15);
        ctx.strokeStyle = pin.color;
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

function updatePinsInfo() {
    const allowMultiple = document.getElementById('allowMultiplePins').checked;
    const requireComment = document.getElementById('requireComment').checked;
    const showAll = document.getElementById('showAllPins').checked;

    let info = '📌 Students can drop pins on the image';
    if (allowMultiple) info += ' (multiple pins allowed)';
    if (requireComment) info += ' • Comments required';
    if (showAll) info += ' • All pins visible to class';

    document.getElementById('pinsInfo').textContent = info;
}

async function publishActivity() {
    const title = document.getElementById('activityTitle').value.trim();
    const questionText = document.getElementById('questionText').value.trim();

    if (!title) {
        alert('Please enter an activity title');
        return;
    }

    if (!questionText) {
        alert('Please enter a question/prompt');
        return;
    }

    if (!uploadedImage) {
        alert('Please upload an image');
        return;
    }

    const activityData = {
        title,
        questionText,
        imageData,
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        allowMultiplePins: document.getElementById('allowMultiplePins').checked,
        requireComment: document.getElementById('requireComment').checked,
        showAllPins: document.getElementById('showAllPins').checked,
        type: 'drop-pin',
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
            alert('✅ Drop Pin activity published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish activity');
        }
    } catch (error) {
        console.error('Error publishing activity:', error);
        alert('❌ Error publishing activity. Please try again.');
    }
}

// Update info when checkboxes change
document.addEventListener('DOMContentLoaded', () => {
    // Back button event listener
    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());

    ['allowMultiplePins', 'requireComment', 'showAllPins'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', updatePinsInfo);
    });
});
