// Student Live Activity - Join with Code
document.addEventListener('DOMContentLoaded', () => {
    const codeInput = document.getElementById('codeInput');
    const joinBtn = document.getElementById('joinBtn');
    const joinBtnText = document.getElementById('joinBtnText');
    const joinBtnLoader = document.getElementById('joinBtnLoader');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const backBtn = document.getElementById('backBtn');

    // Back button
    backBtn.addEventListener('click', () => {
        window.location.href = 'homepage.html';
    });

    // Auto-focus on code input
    codeInput.focus();

    // Format code input (uppercase, remove spaces)
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        hideMessages();
    });

    // Join on Enter key
    codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && codeInput.value.length === 6) {
            joinActivity();
        }
    });

    // Join button click
    joinBtn.addEventListener('click', joinActivity);

    async function joinActivity() {
        const code = codeInput.value.trim();

        // Validate code format
        if (!/^[A-Z0-9]{6}$/.test(code)) {
            showError('Please enter a valid 6-character code');
            return;
        }

        // Show loading state
        setLoading(true);
        hideMessages();

        try {
            // Get user info from token
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            const userInfo = JSON.parse(atob(token.split('.')[1]));
            const studentName = userInfo.name || 'Student';

            // Step 1: Validate code and get session info
            const sessionResponse = await fetch(`/api/live-sessions/code/${code}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok || !sessionData.success) {
                showError(sessionData.message || 'Invalid or expired code. Please check with your instructor.');
                setLoading(false);
                return;
            }

            // Step 2: Join the session
            const joinResponse = await fetch(`/api/live-sessions/${code}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentName: studentName
                })
            });

            const joinData = await joinResponse.json();

            if (!joinResponse.ok || !joinData.success) {
                showError(joinData.message || 'Failed to join session. Please try again.');
                setLoading(false);
                return;
            }

            // Success! Show message and redirect
            showSuccess(`Joined ${sessionData.session.activityTitle}! Redirecting...`);

            // Store session info
            localStorage.setItem('currentSessionId', sessionData.session.sessionId);
            localStorage.setItem('currentSessionCode', code);

            // Redirect to appropriate activity player based on type
            setTimeout(() => {
                redirectToActivityPlayer(sessionData.session);
            }, 1500);

        } catch (error) {
            console.error('Error joining activity:', error);
            showError('Network error. Please check your connection and try again.');
            setLoading(false);
        }
    }

    function redirectToActivityPlayer(session) {
        const { activityType, sessionId } = session;

        // Map activity types to player pages
        const playerPages = {
            'quiz': 'student-play-quiz.html',
            'poll': 'student-play-poll.html',
            'true-false': 'student-play-quiz.html',
            'type-answer': 'student-play-type-answer.html',
            'pin-answer': 'student-play-pin-answer.html',
            'puzzle': 'student-play-puzzle.html',
            'slider': 'student-play-slider.html',
            'scale': 'student-play-scale.html',
            'nps': 'student-play-nps.html',
            'ranking': 'student-play-ranking.html',
            'drop-pin': 'student-play-drop-pin.html',
            'brainstorm': 'student-play-brainstorm.html',
            'slide-classic': 'student-view-slide.html',
            'slide-big-title': 'student-view-slide.html',
            'slide-title-text': 'student-view-slide.html',
            'slide-bullets': 'student-view-slide.html',
            'slide-quote': 'student-view-slide.html',
            'slide-big-media': 'student-view-slide.html',
            'draw': 'student-play-draw.html',
            'video-response': 'student-play-video.html',
            'spinner': 'student-play-spinner.html',
            'sorter': 'student-play-sorter.html'
        };

        const playerPage = playerPages[activityType] || 'student-play-generic.html';
        window.location.href = `${playerPage}?session=${sessionId}`;
    }

    function setLoading(loading) {
        joinBtn.disabled = loading;
        codeInput.disabled = loading;

        if (loading) {
            joinBtnText.style.display = 'none';
            joinBtnLoader.style.display = 'inline-block';
        } else {
            joinBtnText.style.display = 'inline';
            joinBtnLoader.style.display = 'none';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';

        // Shake animation
        codeInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
            codeInput.style.animation = '';
        }, 500);
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
});
