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

    // Show warning message
    let warningTimeout;
    function showCheatWarning(message) {
        // Remove existing warning if any
        const existingWarning = document.getElementById('cheat-warning');
        if (existingWarning) {
            existingWarning.remove();
        }

        // Create warning element
        const warning = document.createElement('div');
        warning.id = 'cheat-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 59, 48, 0.95);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 99999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease;
        `;
        warning.textContent = '⚠️ ' + message;

        // Add animation
        const keyframes = document.createElement('style');
        keyframes.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(keyframes);

        document.body.appendChild(warning);

        // Auto-remove after 3 seconds
        clearTimeout(warningTimeout);
        warningTimeout = setTimeout(() => {
            warning.style.animation = 'slideDown 0.3s ease reverse';
            setTimeout(() => warning.remove(), 300);
        }, 3000);
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
