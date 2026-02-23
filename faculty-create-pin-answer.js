// Faculty Create Pin Answer - Image Location Marking Tool
let uploadedImage = null;
let imageData = null;
let pins = [];
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

    // Canvas click to place pins
    canvas.addEventListener('click', placePinOnCanvas);

    // Tolerance slider
    document.getElementById('toleranceSlider').addEventListener('input', (e) => {
        document.getElementById('toleranceValue').textContent = e.target.value;
        redrawCanvas();
    });

    // Clear pins button
    document.getElementById('clearPinsBtn').addEventListener('click', clearAllPins);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishQuestion);
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

    redrawCanvas();
}

function redrawCanvas() {
    if (!uploadedImage) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

    // Draw tolerance circles and pins
    const tolerance = parseInt(document.getElementById('toleranceSlider').value);

    pins.forEach((pin, index) => {
        // Draw tolerance circle
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, tolerance, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 217, 255, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 217, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw pin marker
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#00D9FF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw pin number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(index + 1, pin.x, pin.y + 4);
    });
}

function placePinOnCanvas(e) {
    if (!uploadedImage) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pins.push({ x, y });
    redrawCanvas();
    updatePinsList();
}

function updatePinsList() {
    const container = document.getElementById('pinsList');

    if (pins.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <h3 style="margin-bottom: 16px; color: #f5f7ff;">Correct Locations (${pins.length})</h3>
        ${pins.map((pin, index) => `
            <div class="list-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; background: #00D9FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #1E2433; font-weight: 700;">${index + 1}</div>
                <span style="flex: 1; font-family: monospace;">x: ${Math.round(pin.x)}, y: ${Math.round(pin.y)}</span>
                <button onclick="removePin(${index})" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
        `).join('')}
    `;
}

function removePin(index) {
    pins.splice(index, 1);
    redrawCanvas();
    updatePinsList();
}

function clearAllPins() {
    if (pins.length === 0) return;

    if (confirm('Are you sure you want to clear all pins?')) {
        pins = [];
        redrawCanvas();
        updatePinsList();
    }
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

    if (!uploadedImage) {
        alert('Please upload an image');
        return;
    }

    if (pins.length === 0) {
        alert('Please place at least one pin on the image');
        return;
    }

    const questionData = {
        title,
        questionText,
        imageData,
        correctPins: pins,
        tolerance: parseInt(document.getElementById('toleranceSlider').value),
        imageWidth: canvas.width,
        imageHeight: canvas.height,
        type: 'pin-answer',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(questionData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Question published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish question');
        }
    } catch (error) {
        console.error('Error publishing question:', error);
        alert('❌ Error publishing question. Please try again.');
    }
}
