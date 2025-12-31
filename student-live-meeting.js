// Student Live Meeting - Join and Participate
let socket;
let localStream;
let peers = new Map();
let meetingCode;
let isMuted = false;
let isCameraOff = false;
let isHandRaised = false;
let meetingStartTime;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupJoinScreen();
});

// Setup join screen
function setupJoinScreen() {
    const codeInput = document.getElementById('codeInput');
    const joinBtn = document.getElementById('joinBtn');
    const backBtn = document.getElementById('backBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Auto-format code input
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        errorMessage.classList.remove('show');

        // Enable join button when 6 digits entered
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

    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'student-community.html';
    });

    // Focus code input
    codeInput.focus();
}

// Join meeting
async function joinMeeting() {
    const codeInput = document.getElementById('codeInput');
    const errorMessage = document.getElementById('errorMessage');
    meetingCode = codeInput.value;

    if (meetingCode.length !== 6) {
        errorMessage.textContent = 'Please enter a 6-digit code';
        errorMessage.classList.add('show');
        return;
    }

    try {
        // Check if meeting exists
        const response = await fetch(`/api/meetings/${meetingCode}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            errorMessage.textContent = 'Meeting not found. Please check the code.';
            errorMessage.classList.add('show');
            return;
        }

        // Get local media stream
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Display local video
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;

        // Connect to Socket.IO
        socket = io();

        // Join the meeting room
        socket.emit('join-meeting', meetingCode, getUserId());

        // Setup Socket.IO listeners
        setupSocketListeners();

        // Setup event listeners
        setupEventListeners();

        // Switch to meeting view
        document.getElementById('joinContainer').style.display = 'none';
        document.getElementById('meetingContainer').classList.add('active');
        document.getElementById('meetingCodeDisplay').textContent = meetingCode;

        // Start meeting timer
        startMeetingTimer();

    } catch (error) {
        console.error('Error joining meeting:', error);
        errorMessage.textContent = 'Failed to access camera/microphone. Please check permissions.';
        errorMessage.classList.add('show');
    }
}

// Setup Socket.IO listeners
function setupSocketListeners() {
    // User joined
    socket.on('user-joined', (userId) => {
        console.log('User joined:', userId);
        updateParticipantCount();
    });

    // WebRTC signaling
    socket.on('offer', async (offer, peerId) => {
        const peer = createPeer(peerId, false);
        await peer.signal(offer);
    });

    socket.on('answer', (answer, peerId) => {
        const peer = peers.get(peerId);
        if (peer) {
            peer.signal(answer);
        }
    });

    socket.on('ice-candidate', (candidate, peerId) => {
        const peer = peers.get(peerId);
        if (peer) {
            peer.signal(candidate);
        }
    });

    // Live captions
    socket.on('caption', (text, peerId) => {
        displayCaption(text);
    });

    // Chat messages
    socket.on('chat-message', (message) => {
        displayChatMessage(message);
    });

    // Participant muted (by admin)
    socket.on('participant-muted', (userId) => {
        if (userId === getUserId()) {
            forceMute();
        }
    });

    // Participant removed (by admin)
    socket.on('participant-removed', (userId) => {
        if (userId === getUserId()) {
            alert('You have been removed from the meeting by the host');
            leaveMeeting();
        }
    });

    // User left
    socket.on('user-left', (userId) => {
        removePeer(userId);
        updateParticipantCount();
    });
}

// Create WebRTC peer connection
function createPeer(peerId, initiator) {
    console.log(`Creating peer for ${peerId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: localStream,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

    peer.on('signal', (data) => {
        console.log('Sending signal:', data.type, 'to', peerId);
        if (data.type === 'offer') {
            socket.emit('offer', data, meetingCode, peerId);
        } else if (data.type === 'answer') {
            socket.emit('answer', data, meetingCode, peerId);
        } else {
            socket.emit('ice-candidate', data, meetingCode, peerId);
        }
    });

    peer.on('stream', (stream) => {
        console.log('Received stream from', peerId);
        addVideoTile(peerId, stream);
    });

    peer.on('error', (err) => {
        console.error('Peer error for', peerId, ':', err);
    });

    peer.on('connect', () => {
        console.log('Peer connected:', peerId);
    });

    peers.set(peerId, peer);
    console.log('Peer created and stored for', peerId);
    return peer;
}

// Add video tile for remote participant
function addVideoTile(peerId, stream) {
    console.log('Adding video tile for', peerId, 'with stream:', stream);
    const videoGrid = document.getElementById('videoGrid');

    // Check if tile already exists
    const existingTile = document.getElementById(`video-${peerId}`);
    if (existingTile) {
        console.log('Tile already exists for', peerId, '- updating stream');
        const existingVideo = existingTile.querySelector('video');
        existingVideo.srcObject = stream;
        return;
    }

    const videoTile = document.createElement('div');
    videoTile.className = 'video-tile';
    videoTile.id = `video-${peerId}`;

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsinline = true;
    video.muted = false; // Remote video should NOT be muted

    // Add event listeners for debugging
    video.onloadedmetadata = () => {
        console.log('Video metadata loaded for', peerId);
        video.play().catch(err => console.error('Error playing video:', err));
    };

    video.onerror = (e) => {
        console.error('Video error for', peerId, ':', e);
    };

    const nameTag = document.createElement('div');
    nameTag.className = 'participant-name';
    nameTag.textContent = `Participant ${peerId.substring(0, 4)}`;

    videoTile.appendChild(video);
    videoTile.appendChild(nameTag);
    videoGrid.appendChild(videoTile);

    console.log('Video tile added to grid for', peerId);
}

// Remove peer
function removePeer(peerId) {
    const peer = peers.get(peerId);
    if (peer) {
        peer.destroy();
        peers.delete(peerId);
    }

    const videoTile = document.getElementById(`video-${peerId}`);
    if (videoTile) {
        videoTile.remove();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mic toggle
    document.getElementById('micBtn').addEventListener('click', toggleMic);

    // Camera toggle
    document.getElementById('cameraBtn').addEventListener('click', toggleCamera);

    // Raise hand
    document.getElementById('raiseHandBtn').addEventListener('click', toggleRaiseHand);

    // Chat toggle
    document.getElementById('chatBtn').addEventListener('click', toggleChat);

    // Leave meeting
    document.getElementById('leaveBtn').addEventListener('click', leaveMeeting);

    // Close sidebar
    document.getElementById('closeSidebar').addEventListener('click', () => {
        document.getElementById('rightSidebar').classList.remove('open');
    });

    // Chat input
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
}

// Toggle microphone
function toggleMic() {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;

    const micIcon = document.getElementById('micIcon');
    const micBtn = document.getElementById('micBtn');

    if (isMuted) {
        micIcon.textContent = '🔇';
        micBtn.classList.add('active');
    } else {
        micIcon.textContent = '🎤';
        micBtn.classList.remove('active');
    }
}

// Force mute (by admin)
function forceMute() {
    if (!isMuted) {
        toggleMic();
        alert('You have been muted by the host');
    }
}

// Toggle camera
function toggleCamera() {
    isCameraOff = !isCameraOff;
    localStream.getVideoTracks()[0].enabled = !isCameraOff;

    const cameraIcon = document.getElementById('cameraIcon');
    const cameraBtn = document.getElementById('cameraBtn');

    if (isCameraOff) {
        cameraIcon.textContent = '📷';
        cameraBtn.classList.add('active');
    } else {
        cameraIcon.textContent = '📹';
        cameraBtn.classList.remove('active');
    }
}

// Toggle raise hand
function toggleRaiseHand() {
    isHandRaised = !isHandRaised;
    const handRaised = document.getElementById('handRaised');
    const raiseHandBtn = document.getElementById('raiseHandBtn');

    if (isHandRaised) {
        handRaised.style.display = 'block';
        raiseHandBtn.classList.add('active');
        // Notify others
        socket.emit('hand-raised', getUserId(), meetingCode);
    } else {
        handRaised.style.display = 'none';
        raiseHandBtn.classList.remove('active');
        socket.emit('hand-lowered', getUserId(), meetingCode);
    }
}

// Toggle chat
function toggleChat() {
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.toggle('open');
}

// Send chat message
function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (message) {
        const messageData = {
            sender: 'You',
            text: message,
            timestamp: new Date().toISOString()
        };

        displayChatMessage(messageData);
        socket.emit('chat-message', messageData, meetingCode);
        input.value = '';
    }
}

// Display chat message
function displayChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';

    messageDiv.innerHTML = `
        <div class="message-sender">${message.sender}</div>
        <div class="message-text">${message.text}</div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Display caption
function displayCaption(text) {
    const captionsContainer = document.getElementById('captionsContainer');
    const captionText = document.getElementById('captionText');

    captionText.textContent = text;
    captionsContainer.classList.add('active');

    // Hide after 3 seconds
    setTimeout(() => {
        captionsContainer.classList.remove('active');
    }, 3000);
}

// Update participant count
function updateParticipantCount() {
    const count = peers.size + 1; // +1 for self
    document.getElementById('participantNumber').textContent = count;
}

// Start meeting timer
function startMeetingTimer() {
    meetingStartTime = Date.now();

    setInterval(() => {
        const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        document.getElementById('meetingTime').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Leave meeting
function leaveMeeting() {
    if (confirm('Leave meeting?')) {
        // Stop all tracks
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        peers.forEach(peer => peer.destroy());

        // Disconnect from socket
        if (socket) {
            socket.disconnect();
        }

        // Redirect to dashboard
        window.location.href = 'student-community.html';
    }
}

// Get user ID
function getUserId() {
    // Get from localStorage or generate
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'student_' + Math.random().toString(36).substring(7);
        localStorage.getItem('userId', userId);
    }
    return userId;
}
