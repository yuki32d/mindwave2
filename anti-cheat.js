// Anti-Cheat Protection for Student Games
// Prevents copy-paste, right-click, and other cheating methods

(function () {
    'use strict';

    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        showCheatWarning('Right-click is disabled during games');
        return false;
    });

    // Disable copy (Ctrl+C / Cmd+C)
    document.addEventListener('copy', function (e) {
        e.preventDefault();
        showCheatWarning('Copying is disabled during games');
        return false;
    });

    // Disable cut (Ctrl+X / Cmd+X)
    document.addEventListener('cut', function (e) {
        e.preventDefault();
        showCheatWarning('Cutting is disabled during games');
        return false;
    });

    // Disable paste (Ctrl+V / Cmd+V)
    document.addEventListener('paste', function (e) {
        e.preventDefault();
        showCheatWarning('Pasting is disabled during games');
        return false;
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Ctrl/Cmd + A (Select All)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            showCheatWarning('Select all is disabled during games');
            return false;
        }

        // Ctrl/Cmd + C (Copy)
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            showCheatWarning('Copying is disabled during games');
            return false;
        }

        // Ctrl/Cmd + X (Cut)
        if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            e.preventDefault();
            showCheatWarning('Cutting is disabled during games');
            return false;
        }

        // Ctrl/Cmd + V (Paste)
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            showCheatWarning('Pasting is disabled during games');
            return false;
        }

        // Ctrl/Cmd + U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            showCheatWarning('View source is disabled during games');
            return false;
        }

        // Ctrl/Cmd + S (Save Page)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showCheatWarning('Saving page is disabled during games');
            return false;
        }

        // F12 (Developer Tools)
        if (e.key === 'F12') {
            e.preventDefault();
            showCheatWarning('Developer tools are disabled during games');
            return false;
        }

        // Ctrl+Shift+I (Developer Tools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            showCheatWarning('Developer tools are disabled during games');
            return false;
        }

        // Ctrl+Shift+J (Console)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            showCheatWarning('Console is disabled during games');
            return false;
        }

        // Ctrl+Shift+C (Inspect Element)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            showCheatWarning('Inspect element is disabled during games');
            return false;
        }
    });

    // Disable text selection on game content
    const style = document.createElement('style');
    style.textContent = `
        .question-display,
        .options-grid,
        .game-card,
        .CodeMirror-readonly {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        /* Allow selection only in input fields and editable areas */
        input,
        textarea,
        .CodeMirror:not(.CodeMirror-readonly) {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
        }
    `;
    document.head.appendChild(style);

    // Cheat metrics
    window.cheatingAttempts = 0;
    window.cheatLogs = [];

    // Show warning message
    let warningTimeout;
    function showCheatWarning(message, isCritical = false) {
        // Remove existing warning if any
        const existingWarning = document.getElementById('cheat-warning');
        if (existingWarning) {
            if (isCritical) return; // Don't replace a critical warning
            existingWarning.remove();
        }

        // Create warning element
        const warning = document.createElement('div');
        warning.id = 'cheat-warning';
        
        if (isCritical) {
            warning.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(20px);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                padding: 40px;
                text-align: center;
                animation: mwFadeIn 0.3s ease;
            `;
            warning.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 24px; padding: 48px; max-width: 500px; box-shadow: 0 0 50px rgba(239,68,68,0.2);">
                    <div style="font-size: 64px; margin-bottom: 24px;">🚫</div>
                    <h2 style="color: #fff; font-size: 28px; font-weight: 800; margin-bottom: 16px;">Cheating Detected!</h2>
                    <p style="color: #9ca3af; font-size: 18px; line-height: 1.6; margin-bottom: 32px;">
                        You have navigated away from the exam tab. This action has been <strong>logged</strong> and sent to your teacher.
                    </p>
                    <p style="color: #ef4444; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">
                        Return to the exam immediately to avoid disqualification.
                    </p>
                    <button id="resumeExamBtn" style="margin-top: 32px; background: #fff; color: #000; border: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                        Resume Exam
                    </button>
                </div>
            `;
        } else {
            warning.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(255, 59, 48, 0.95);
                backdrop-filter: blur(10px);
                color: white;
                padding: 12px 24px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                z-index: 99999;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                animation: slideDown 0.3s ease;
            `;
            warning.textContent = '⚠️ ' + message;
        }

        document.body.appendChild(warning);

        if (isCritical) {
            const btn = document.getElementById('resumeExamBtn');
            btn.onclick = () => {
                warning.remove();
                if (window.isProMode && typeof toggleFullScreen === 'function') {
                    toggleFullScreen();
                }
            };
        } else {
            // Auto-remove standard warnings after 3 seconds
            clearTimeout(warningTimeout);
            warningTimeout = setTimeout(() => {
                warning.style.animation = 'slideDown 0.3s ease reverse';
                setTimeout(() => warning.remove(), 300);
            }, 3000);
        }
    }

    // Visibility Detection
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            handleCheatAttempt('Tab switched / window minimized');
        }
    });

    window.addEventListener('blur', () => {
        handleCheatAttempt('Focus lost');
    });

    function handleCheatAttempt(reason) {
        window.cheatingAttempts++;
        const logEntry = {
            timestamp: new Date().toISOString(),
            reason: reason,
            attemptNumber: window.cheatingAttempts
        };
        window.cheatLogs.push(logEntry);
        
        console.warn('⚠️ Anti-Cheat Warning:', reason, logEntry);
        showCheatWarning('Please close other tabs or applications to continue.', true);
    }

    // Detect if DevTools is open (optional - more aggressive)
    let devtoolsOpen = false;
    const detectDevTools = () => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold ||
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                showCheatWarning('Please close developer tools to continue');
            }
        } else {
            devtoolsOpen = false;
        }
    };

    // Check every 1 second
    setInterval(detectDevTools, 1000);

    // Disable drag and drop (except for game elements)
    document.addEventListener('dragstart', function (e) {
        // Allow dragging for code unjumble game blocks
        if (e.target.classList.contains('draggable-line') ||
            e.target.closest('.draggable-line')) {
            return true; // Allow the drag
        }

        e.preventDefault();
        return false;
    });

    // Disable print
    window.addEventListener('beforeprint', function (e) {
        e.preventDefault();
        showCheatWarning('Printing is disabled during games');
        return false;
    });

    console.log('🔒 Anti-cheat protection enabled');
})();
