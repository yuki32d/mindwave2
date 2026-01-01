// Student Live Meeting JavaScript
const codeInput = document.getElementById('codeInput');
const joinBtn = document.getElementById('joinBtn');

// Get user info
const token = localStorage.getItem('token');
let userName = 'Student';
let userId = 'student-' + Math.random().toString(36).substr(2, 9);

if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userName = payload.name || 'Student';
        userId = payload.userId || userId;
    } catch (e) {
        console.log('Could not parse token');
    }
}

// Auto-format code input
codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
    joinBtn.disabled = e.target.value.length !== 6;
});

// Join on Enter key
codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && codeInput.value.length === 6) {
        joinMeeting();
    }
});

// Join button click
joinBtn.addEventListener('click', joinMeeting);

function joinMeeting() {
    const meetingCode = codeInput.value;

    if (meetingCode.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }

    // Redirect to Jitsi Meet
    const roomId = 'MindWave' + meetingCode;
    const meetingUrl = `https://meet.jit.si/${roomId}`;

    console.log('Joining Meeting Code:', meetingCode);
    console.log('Room ID:', roomId);
    console.log('Student:', userName);

    // Redirect directly
    window.location.href = meetingUrl;
}

// Focus on input
codeInput.focus();
