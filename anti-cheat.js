// Anti-Cheat Protection for Student Games
// Prevents copy-paste, right-click, and other cheating methods

(function () {
    'use strict';

    /* ============================================================
       STARTUP GRACE PERIOD
       Ignore blur / visibilitychange for the first 4 seconds.
       This prevents false 'Cheating Detected' popups when the browser
       opens the game in a new tab and focus briefly returns to the
       parent tab or OS.
    ============================================================ */
    let startupComplete = false;
    setTimeout(() => { startupComplete = true; }, 4000);

    /* ============================================================
       FULLSCREEN LOCKDOWN
       NOTE: Browsers require a real user gesture (click/keypress) to
       enter fullscreen. A window.open() tab load is NOT a user gesture.
       Fullscreen is therefore triggered only from actual user clicks.
       The fullscreenchange listener re-enforces it if the student exits.
    ============================================================ */

    function enterFullscreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
        return Promise.resolve();
    }

    function isFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    // Only re-enter fullscreen on user interaction AFTER startup
    function tryEnterFullscreen() {
        if (startupComplete && !isFullscreen()) {
            enterFullscreen().catch(() => {});
        }
    }

    // Re-enter fullscreen on any click/key (after grace period)
    document.addEventListener('click', tryEnterFullscreen, { once: false });
    document.addEventListener('keydown', tryEnterFullscreen, { once: false });

    // Blocking overlay shown while fullscreen is temporarily exited (e.g. ESC press)
    // so the student cannot interact with the OS desktop during the re-entry window.
    let fsOverlay = null;
    function showFsOverlay() {
        if (fsOverlay) return;
        fsOverlay = document.createElement('div');
        fsOverlay.style.cssText = `
            position: fixed; inset: 0; background: #000;
            z-index: 99999999; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 16px;
        `;
        fsOverlay.innerHTML = `
            <div style="width:48px;height:48px;border:4px solid rgba(99,102,241,0.3);border-top:4px solid #6366f1;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <p style="color:#9ca3af;font-family:sans-serif;font-size:0.95rem;">Re-entering secure session…</p>
        `;
        document.body.appendChild(fsOverlay);
    }
    function hideFsOverlay() {
        if (fsOverlay) { fsOverlay.remove(); fsOverlay = null; }
    }

    // If user somehow exits fullscreen, immediately re-enter and log it
    function onFullscreenChange() {
        if (!isFullscreen()) {
            handleCheatAttempt('Exited fullscreen / pressed ESC');
            showFsOverlay();
            // Re-enter immediately — no delay
            enterFullscreen()
                .catch(() => {})
                .finally(() => {
                    // Hide overlay once fullscreen is re-established (or after 1.5s max)
                    setTimeout(hideFsOverlay, 1500);
                });
        } else {
            // Fullscreen restored
            hideFsOverlay();
        }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);

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

        // --- EXIT / NAVIGATION KEYS ---

        // ESC — blocked (fullscreen exit is handled by fullscreenchange event)
        if (e.key === 'Escape') {
            e.preventDefault();
            // Re-enter fullscreen is handled by the fullscreenchange listener.
            // Show a soft reminder so the student knows;
            // the critical warning only fires if fullscreen actually exits.
            showCheatWarning('Press ESC is disabled during the game');
            return false;
        }

        // Alt+F4 (Windows close window)
        if (e.altKey && e.key === 'F4') {
            e.preventDefault();
            showCheatWarning('Closing the window is disabled during the game');
            return false;
        }

        // Meta/Win key (Windows Start menu / macOS Spotlight)
        if (e.key === 'Meta') {
            e.preventDefault();
            showCheatWarning('System keys are disabled during the game');
            return false;
        }

        // Alt+Tab (Windows task switcher)
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            showCheatWarning('Switching windows is disabled during the game');
            return false;
        }

        // Ctrl+Alt+Delete (caught only in some browsers/environments)
        if (e.ctrlKey && e.altKey && e.key === 'Delete') {
            e.preventDefault();
            return false;
        }

        // Ctrl+W (Close tab)
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            showCheatWarning('Closing the tab is disabled during the game');
            return false;
        }

        // Ctrl+T (New tab)
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            showCheatWarning('Opening new tabs is disabled during the game');
            return false;
        }

        // Ctrl+N (New window)
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            showCheatWarning('Opening new windows is disabled during the game');
            return false;
        }

        // Ctrl+R / F5 (Reload)
        if (((e.ctrlKey || e.metaKey) && e.key === 'r') || e.key === 'F5') {
            e.preventDefault();
            showCheatWarning('Reloading is disabled during the game');
            return false;
        }

        // F11 (Toggle fullscreen — we manage it ourselves)
        if (e.key === 'F11') {
            e.preventDefault();
            return false;
        }

        // Cmd+Q (macOS quit app)
        if (e.metaKey && e.key === 'q') {
            e.preventDefault();
            showCheatWarning('Quitting is disabled during the game');
            return false;
        }

        // Cmd+H (macOS hide window)
        if (e.metaKey && e.key === 'h') {
            e.preventDefault();
            return false;
        }

        // Cmd+M (macOS minimise)
        if (e.metaKey && e.key === 'm') {
            e.preventDefault();
            return false;
        }

        // Alt+F (Open File menu on Windows)
        if (e.altKey && e.key === 'F') {
            e.preventDefault();
            return false;
        }

        // --- ANTI-CHEAT KEYS ---

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
    }, true); // Use capture phase to intercept before browser default handling

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

    // Visibility Detection — guarded by startup grace period
    document.addEventListener('visibilitychange', () => {
        if (!startupComplete) return; // ignore during startup
        if (document.visibilityState === 'hidden') {
            handleCheatAttempt('Tab switched / window minimized');
        }
    });

    window.addEventListener('blur', () => {
        if (!startupComplete) return; // ignore during startup
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

    // Block beforeunload / page navigation
    let gameCompleted = false;
    function beforeUnloadHandler(e) {
        if (gameCompleted) return; // allow exit after game is done
        e.preventDefault();
        e.returnValue = 'The game is still in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
    window.addEventListener('beforeunload', beforeUnloadHandler);

    /**
     * Call this when the game is completed so that fullscreen enforcement
     * and the unload block are lifted, allowing the student to exit cleanly.
     */
    window.releaseGameLock = function () {
        gameCompleted = true;
        // Exit fullscreen gracefully
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
        else if (document.msExitFullscreen) document.msExitFullscreen();
        console.log('🔓 Game lock released — student completed the game');
    };

    console.log('🔒 Anti-cheat protection enabled | Fullscreen lockdown active');
})();
