// Faculty Create Spinner - Interactive Spinning Wheel Creator
let spinnerOptions = [];
let isSpinning = false;
let currentRotation = 0;

// Canvas and wheel setup
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 180;

// Color palette for wheel segments
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
    '#FF9FF3', '#54A0FF', '#48DBFB', '#FF6348', '#1DD1A1'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    drawWheel();
});

function setupEventListeners() {
    // Add option button
    document.getElementById('addOptionBtn').addEventListener('click', addOption);

    // Enter key to add option
    document.getElementById('optionInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addOption();
        }
    });

    // Preview spin button
    document.getElementById('previewSpinBtn').addEventListener('click', spinWheel);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishSpinner);
}

function addOption() {
    const input = document.getElementById('optionInput');
    const optionText = input.value.trim();

    if (!optionText) {
        alert('Please enter an option name');
        return;
    }

    if (spinnerOptions.length >= 15) {
        alert('Maximum 15 options allowed');
        return;
    }

    spinnerOptions.push({
        id: Date.now(),
        text: optionText,
        color: colors[spinnerOptions.length % colors.length]
    });

    input.value = '';
    updateOptionsList();
    drawWheel();
}

function updateOptionsList() {
    const container = document.getElementById('optionsList');

    if (spinnerOptions.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; margin-top: 60px;">No options added yet</p>';
        return;
    }

    container.innerHTML = spinnerOptions.map((option, index) => `
        <div class="list-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 24px; height: 24px; border-radius: 6px; background: ${option.color}; flex-shrink: 0;"></div>
            <span style="flex: 1;">${option.text}</span>
            <button data-option-id="${option.id}" class="remove-option-btn" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
        </div>
    `).join('');
}

function removeOption(id) {
    spinnerOptions = spinnerOptions.filter(opt => opt.id !== id);
    updateOptionsList();
    drawWheel();
}

function drawWheel() {
    if (spinnerOptions.length === 0) {
        // Draw empty wheel
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#1E2433';
        ctx.fill();
        ctx.strokeStyle = '#00D9FF';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#9ea4b6';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Add options to see wheel', centerX, centerY);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const anglePerSegment = (2 * Math.PI) / spinnerOptions.length;

    spinnerOptions.forEach((option, index) => {
        const startAngle = index * anglePerSegment + currentRotation;
        const endAngle = startAngle + anglePerSegment;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = option.color;
        ctx.fill();
        ctx.strokeStyle = '#1E2433';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + anglePerSegment / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Inter';
        ctx.fillText(option.text, radius * 0.65, 5);
        ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#1E2433';
    ctx.fill();
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 3;
    ctx.stroke();
}

function spinWheel() {
    if (spinnerOptions.length === 0) {
        alert('Please add at least one option to spin!');
        return;
    }

    if (isSpinning) return;

    isSpinning = true;
    document.getElementById('previewSpinBtn').disabled = true;
    document.getElementById('resultDisplay').textContent = '';

    // Random spin duration and rotations
    const spinDuration = 3000 + Math.random() * 2000;
    const totalRotations = 5 + Math.random() * 5;
    const randomStop = Math.random() * 2 * Math.PI;
    const totalRotation = totalRotations * 2 * Math.PI + randomStop;

    const startTime = Date.now();
    const startRotation = currentRotation;

    // Play sound if enabled
    if (document.getElementById('enableSound').checked) {
        playSpinSound();
    }

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Easing function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);

        currentRotation = startRotation + totalRotation * easeOut;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Determine winner
            const normalizedRotation = (currentRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
            const pointerAngle = Math.PI / 2; // Pointer at top
            const adjustedAngle = (2 * Math.PI - normalizedRotation + pointerAngle) % (2 * Math.PI);
            const anglePerSegment = (2 * Math.PI) / spinnerOptions.length;
            const winnerIndex = Math.floor(adjustedAngle / anglePerSegment);
            const winner = spinnerOptions[winnerIndex];

            // Show result
            document.getElementById('resultDisplay').textContent = `🎉 ${winner.text}`;

            // Remove option if enabled
            if (document.getElementById('removeAfterSpin').checked) {
                setTimeout(() => {
                    removeOption(winner.id);
                }, 2000);
            }

            isSpinning = false;
            document.getElementById('previewSpinBtn').disabled = false;
        }
    }

    animate();
}

function playSpinSound() {
    // Create simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

async function publishSpinner() {
    const title = document.getElementById('spinnerTitle').value.trim();
    const description = document.getElementById('spinnerDescription').value.trim();

    if (!title) {
        alert('Please enter a spinner title');
        return;
    }

    if (spinnerOptions.length === 0) {
        alert('Please add at least one option');
        return;
    }

    const spinnerData = {
        title,
        description,
        options: spinnerOptions,
        removeAfterSpin: document.getElementById('removeAfterSpin').checked,
        enableSound: document.getElementById('enableSound').checked,
        type: 'spinner',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(spinnerData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Spinner published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish spinner');
        }
    } catch (error) {
        console.error('Error publishing spinner:', error);
        alert('❌ Error publishing spinner. Please try again.');
    }
}

// Event delegation for remove buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-option-btn')) {
        const optionId = parseInt(e.target.dataset.optionId);
        if (optionId) {
            removeOption(optionId);
        }
    }
});

// Back button handler
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
}
