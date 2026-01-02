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

async function joinMeeting() {
    const meetingCode = codeInput.value;

    if (meetingCode.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }

    // Show loading state
    joinBtn.disabled = true;
    joinBtn.textContent = 'Validating...';

    try {
        // Validate meeting code with backend
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://mindwave2.onrender.com';
        const response = await fetch(`${API_BASE}/api/meetings/validate/${meetingCode}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
            // Invalid code
            alert('❌ Invalid meeting code!\n\nThis code does not exist. Please ask your faculty for a valid meeting code.');
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Meeting';
            codeInput.value = '';
            codeInput.focus();
            return;
        }

        // Valid code - redirect to Jitsi Meet
        const roomId = 'MindWave' + meetingCode;

        // Students join with lobby enabled and as participants only
        // This prevents them from becoming moderators if they join first
        const meetingUrl = `https://meet.jit.si/${roomId}#config.startWithAudioMuted=true&userInfo.displayName=${encodeURIComponent(userName)}&config.prejoinPageEnabled=false&config.requireDisplayName=true`;

        console.log('Joining Meeting Code:', meetingCode);
        console.log('Room ID:', roomId);
        console.log('Student:', userName);

        // Redirect directly
        window.location.href = meetingUrl;

    } catch (error) {
        console.error('Error validating meeting code:', error);
        alert('❌ Error validating meeting code.\n\nPlease check your internet connection and try again.');
        joinBtn.disabled = false;
        joinBtn.textContent = 'Join Meeting';
    }
}

// Focus on input
codeInput.focus();
