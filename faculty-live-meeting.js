// Faculty Live Meeting - WebRTC Video Conferencing
let socket;
let localStream;
let peers = new Map();
let meetingCode;
let isMuted = false;
let isCameraOff = false;
let isCaptionsEnabled = false;
let recognition;
let meetingStartTime;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeMeeting();
    setupEventListeners();
    startMeetingTimer();
});

// Initialize meeting
async function initializeMeeting() {
    try {
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

        // Create meeting and get code
        const response = await fetch('/api/meetings/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.ok) {
            meetingCode = data.code;
            document.getElementById('codeText').textContent = meetingCode;
            document.getElementById('modalCodeDisplay').textContent = meetingCode;

            // Show meeting code modal
            document.getElementById('codeModal').classList.add('active');

            // Join the meeting room
            socket.emit('join-meeting', meetingCode, getUserId());
        }

        // Setup Socket.IO listeners
        setupSocketListeners();

    } catch (error) {
        console.error('Error initializing meeting:', error);
        alert('Failed to access camera/microphone. Please check permissions.');
    }
}

// Setup Socket.IO listeners
function setupSocketListeners() {
    // User joined - CREATE PEER CONNECTION
    socket.on('user-joined', (userId) => {
        console.log('User joined:', userId);
        // Faculty initiates connection to new student
        const peer = createPeer(userId, true); // true = initiator
        updateParticipantCount();
        addParticipantToList(userId);
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

    // User left
    socket.on('user-left', (userId) => {
        removePeer(userId);
        updateParticipantCount();
        removeParticipantFromList(userId);
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

    // Screen share
    document.getElementById('shareScreenBtn').addEventListener('click', shareScreen);

    // Captions toggle
    document.getElementById('captionsBtn').addEventListener('click', toggleCaptions);

    // Chat toggle
    document.getElementById('chatBtn').addEventListener('click', () => toggleSidebar('chat'));

    // Participants toggle
    document.getElementById('participantsBtn').addEventListener('click', () => toggleSidebar('participants'));

    // More options
    document.getElementById('moreBtn').addEventListener('click', toggleMoreMenu);

    // End call
    document.getElementById('endCallBtn').addEventListener('click', endCall);

    // Close sidebar
    document.getElementById('closeSidebar').addEventListener('click', closeSidebar);

    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchSidebarTab(tabName);
        });
    });

    // Chat input
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Meeting code copy
    document.getElementById('meetingCodeDisplay').addEventListener('click', copyMeetingCode);
    document.getElementById('copyCodeBtn').addEventListener('click', copyMeetingCode);

    // WhatsApp share
    document.getElementById('shareWhatsAppBtn').addEventListener('click', shareOnWhatsApp);

    // Close modal
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        document.getElementById('codeModal').classList.remove('active');
    });

    // More menu items
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
}

// Toggle microphone
function toggleMic() {
    isMuted = !isMuted;
    localStream.getAudioTracks()[0].enabled = !isMuted;

    const micIcon = document.getElementById('micIcon');
    const micBtn = document.getElementById('micBtn');

    if (isMuted) {
        // Muted mic icon (mic with slash)
        micIcon.innerHTML = '<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>';
        micBtn.classList.add('active');
    } else {
        // Unmuted mic icon
        micIcon.innerHTML = '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>';
        micBtn.classList.remove('active');
    }
}

// Toggle camera
function toggleCamera() {
    isCameraOff = !isCameraOff;
    localStream.getVideoTracks()[0].enabled = !isCameraOff;

    const cameraIcon = document.getElementById('cameraIcon');
    const cameraBtn = document.getElementById('cameraBtn');

    if (isCameraOff) {
        // Camera off icon (camera with slash)
        cameraIcon.innerHTML = '<path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>';
        cameraBtn.classList.add('active');
    } else {
        // Camera on icon
        cameraIcon.innerHTML = '<path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>';
        cameraBtn.classList.remove('active');
    }
}

// Share screen
async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = localStream.getVideoTracks()[0];

        // Update all peer connections
        peers.forEach(peer => {
            const senders = peer._pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
                videoSender.replaceTrack(videoTrack);
            }
        });

        // Update local video
        document.getElementById('localVideo').srcObject = screenStream;

        // When screen sharing stops, switch back to camera
        videoTrack.onended = () => {
            switchBackToCamera();
        };

    } catch (error) {
        console.error('Error sharing screen:', error);
    }
}

// Switch back to camera
function switchBackToCamera() {
    const videoTrack = localStream.getVideoTracks()[0];

    peers.forEach(peer => {
        const senders = peer._pc.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            videoSender.replaceTrack(videoTrack);
        }
    });

    document.getElementById('localVideo').srcObject = localStream;
}

// Toggle captions
function toggleCaptions() {
    isCaptionsEnabled = !isCaptionsEnabled;
    const captionsBtn = document.getElementById('captionsBtn');

    if (isCaptionsEnabled) {
        startCaptions();
        captionsBtn.classList.add('active');
    } else {
        stopCaptions();
        captionsBtn.classList.remove('active');
    }
}

// Start live captions using Web Speech API
function startCaptions() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition not supported in this browser');
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        displayCaption(transcript);
        socket.emit('caption', transcript, meetingCode);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
    };

    recognition.start();
}

// Stop captions
function stopCaptions() {
    if (recognition) {
        recognition.stop();
    }
    document.getElementById('captionsContainer').classList.remove('active');
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

// Toggle sidebar
function toggleSidebar(tab) {
    const sidebar = document.getElementById('rightSidebar');
    sidebar.classList.toggle('open');

    if (sidebar.classList.contains('open')) {
        switchSidebarTab(tab);
    }
}

// Close sidebar
function closeSidebar() {
    document.getElementById('rightSidebar').classList.remove('open');
}

// Switch sidebar tab
function switchSidebarTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });

    // Show/hide tab content
    document.getElementById('chatTab').style.display = tabName === 'chat' ? 'block' : 'none';
    document.getElementById('participantsTab').style.display = tabName === 'participants' ? 'block' : 'none';
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

// Update participant count
function updateParticipantCount() {
    const count = peers.size + 1; // +1 for self
    document.getElementById('participantNumber').textContent = count;
}

// Add participant to list
function addParticipantToList(userId) {
    const participantsList = document.getElementById('participantsList');

    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-item';
    participantDiv.id = `participant-${userId}`;

    participantDiv.innerHTML = `
        <div class="participant-info">
            <div class="participant-avatar">${userId.substring(0, 1).toUpperCase()}</div>
            <div>Participant ${userId.substring(0, 4)}</div>
        </div>
        <div class="participant-controls">
            <button class="control-btn" onclick="muteParticipant('${userId}')" title="Mute">🔇</button>
            <button class="control-btn" onclick="removeParticipant('${userId}')" title="Remove">❌</button>
        </div>
    `;

    participantsList.appendChild(participantDiv);
}

// Remove participant from list
function removeParticipantFromList(userId) {
    const participantDiv = document.getElementById(`participant-${userId}`);
    if (participantDiv) {
        participantDiv.remove();
    }
}

// Mute participant (admin only)
window.muteParticipant = function (userId) {
    socket.emit('mute-participant', userId, meetingCode);
    alert(`Muted participant ${userId.substring(0, 4)}`);
};

// Remove participant (admin only)
window.removeParticipant = function (userId) {
    if (confirm(`Remove participant ${userId.substring(0, 4)} from meeting?`)) {
        socket.emit('remove-participant', userId, meetingCode);
        removePeer(userId);
        removeParticipantFromList(userId);
    }
};

// Copy meeting code
function copyMeetingCode() {
    navigator.clipboard.writeText(meetingCode);
    alert('Meeting code copied to clipboard!');
}

// Share on WhatsApp
function shareOnWhatsApp() {
    const message = `Join my MindWave live class! Meeting code: ${meetingCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Toggle more menu
function toggleMoreMenu() {
    const moreMenu = document.getElementById('moreMenu');
    moreMenu.classList.toggle('active');
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
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

// End call
async function endCall() {
    if (confirm('End meeting for everyone?')) {
        // Stop all tracks
        localStream.getTracks().forEach(track => track.stop());

        // Close all peer connections
        peers.forEach(peer => peer.destroy());

        // Generate meeting summary
        await generateMeetingSummary();

        // Redirect to dashboard
        window.location.href = 'admin.html';
    }
}

// Generate meeting summary
async function generateMeetingSummary() {
    try {
        // This would use your AI service to generate summary
        const response = await fetch('/api/ai/summarize-meeting', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meetingCode,
                duration: Math.floor((Date.now() - meetingStartTime) / 1000)
            })
        });

        const data = await response.json();
        console.log('Meeting summary:', data.summary);
    } catch (error) {
        console.error('Error generating summary:', error);
    }
}

// Get user ID
function getUserId() {
    // Get from localStorage or generate
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(7);
        localStorage.setItem('userId', userId);
    }
    return userId;
}

// Close more menu when clicking outside
document.addEventListener('click', (e) => {
    const moreMenu = document.getElementById('moreMenu');
    const moreBtn = document.getElementById('moreBtn');

    if (!moreMenu.contains(e.target) && !moreBtn.contains(e.target)) {
        moreMenu.classList.remove('active');
    }
});
