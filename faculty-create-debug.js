let perfectCodeEditor;
let buggyCodeEditor;
let manualBuggyEditor;
let currentMode = 'auto'; // 'auto' | 'manual'

// Initialize CodeMirror
window.addEventListener('DOMContentLoaded', () => {
    perfectCodeEditor = CodeMirror.fromTextArea(document.getElementById('perfectCode'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4
    });

    buggyCodeEditor = CodeMirror.fromTextArea(document.getElementById('buggyCodePreview'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        readOnly: true
    });

    // Manual buggy code editor
    manualBuggyEditor = CodeMirror.fromTextArea(document.getElementById('manualBuggyCode'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4
    });

    // Mode toggle
    const modeAutoBtn   = document.getElementById('modeAutoBtn');
    const modeManualBtn = document.getElementById('modeManualBtn');
    const autoPanel     = document.getElementById('autoModePanel');
    const manualPanel   = document.getElementById('manualModePanel');

    function setMode(mode) {
        currentMode = mode;
        if (mode === 'auto') {
            autoPanel.style.display   = 'block';
            manualPanel.style.display = 'none';
            modeAutoBtn.style.background   = 'var(--primary,#6366f1)';
            modeAutoBtn.style.color        = '#fff';
            modeManualBtn.style.background = 'transparent';
            modeManualBtn.style.color      = 'var(--text-muted,#888)';
        } else {
            autoPanel.style.display   = 'none';
            manualPanel.style.display = 'block';
            modeManualBtn.style.background = 'var(--primary,#6366f1)';
            modeManualBtn.style.color      = '#fff';
            modeAutoBtn.style.background   = 'transparent';
            modeAutoBtn.style.color        = 'var(--text-muted,#888)';
            // Pre-fill manual editor with perfect code if it is empty
            if (!manualBuggyEditor.getValue().trim() && perfectCodeEditor.getValue().trim()) {
                manualBuggyEditor.setValue(perfectCodeEditor.getValue());
            }
            // Sync language mode
            const lang = document.getElementById('language').value;
            const cm = lang === 'python' ? 'python' : lang === 'java' ? 'text/x-java' : lang === 'cpp' ? 'text/x-c++src' : 'javascript';
            manualBuggyEditor.setOption('mode', cm);
        }
        lucide.createIcons();
    }

    modeAutoBtn.addEventListener('click',   () => setMode('auto'));
    modeManualBtn.addEventListener('click', () => setMode('manual'));

    // Update mode when language changes
    document.getElementById('language').addEventListener('change', (e) => {
        const mode = e.target.value === 'python' ? 'python' :
            e.target.value === 'java' ? 'text/x-java' :
                e.target.value === 'cpp' ? 'text/x-c++src' : 'javascript';
        perfectCodeEditor.setOption('mode', mode);
        buggyCodeEditor.setOption('mode', mode);
        manualBuggyEditor.setOption('mode', mode);
    });

    // Add event listeners for buttons
    document.getElementById('previewBtn').addEventListener('click', generatePreview);
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
    document.getElementById('publishBtn').addEventListener('click', publishGame);
});


function generatePreview() {
    const code = perfectCodeEditor.getValue();
    if (!code.trim()) {
        alert('Please enter some code first!');
        return;
    }

    const bugCount = parseInt(document.getElementById('bugCount').value);
    const result = injectBugs(code, bugCount);

    buggyCodeEditor.setValue(result.buggyCode);

    const bugList = document.getElementById('bugList');
    bugList.innerHTML = result.bugs.map(bug =>
        `<span class="bug-badge">${bug.type}: Line ${bug.line}</span>`
    ).join('');

    document.getElementById('previewContainer').style.display = 'block';
}

async function publishGame() {
    const title       = document.getElementById('gameTitle').value.trim();
    const description = document.getElementById('gameDesc').value.trim();
    const perfectCode = perfectCodeEditor.getValue().trim();

    // Base validation — always required
    if (!title || !description) {
        alert('Please fill in the Game Title and Description!');
        return;
    }

    // In AUTO mode the perfect code is the source — it must be filled
    if (currentMode === 'auto' && !perfectCode) {
        alert('Please enter your Perfect Code (the bug-free version) before publishing.');
        return;
    }

    let buggyCode, bugs, bugCount;

    if (currentMode === 'manual') {
        // ── MANUAL MODE ──
        buggyCode = manualBuggyEditor.getValue().trim();
        if (!buggyCode) {
            alert('Please write your buggy code in the editor.');
            return;
        }
        // Only warn about identical code if perfectCode was also provided
        if (perfectCode && buggyCode === perfectCode) {
            alert('⚠️ Your buggy code is identical to the perfect code! Please introduce some bugs.');
            return;
        }

        // Parse bug annotations into a bugs array
        const annotations = (document.getElementById('bugAnnotations').value || '').trim();
        bugs = annotations
            ? annotations.split('\n').filter(Boolean).map((line, i) => {
                const m = line.match(/^[Ll]ine\s*(\d+)[:\-\s]+(.+)$/);
                return m
                    ? { type: 'Manual', line: parseInt(m[1]), description: m[2].trim(), original: '', bugged: '' }
                    : { type: 'Manual', line: i + 1, description: line.trim(), original: '', bugged: '' };
            })
            : [{ type: 'Manual', line: 1, description: 'Custom bug introduced by faculty', original: '', bugged: '' }];

        bugCount = bugs.length;

    } else {
        // ── AUTO MODE ──
        bugCount = parseInt(document.getElementById('bugCount').value);
        const result = injectBugs(perfectCode, bugCount);

        if (result.buggyCode === perfectCode) {
            alert('⚠️ Bug injection failed! The code is too simple or doesn\'t have enough lines to inject bugs.');
            return;
        }
        if (result.bugs.length === 0) {
            alert('⚠️ No bugs were injected! Please make sure your code has enough content.');
            return;
        }

        buggyCode = result.buggyCode;
        bugs      = result.bugs;
    }


    // Store game data for modal (use global variable)
    window.gameDataToPublish = {
        type: 'bug-hunt',
        title,
        description,
        difficulty: document.getElementById('difficulty').value,
        duration:   parseInt(document.getElementById('duration').value),
        language:   document.getElementById('language').value,
        perfectCode,
        buggyCode,
        bugCount,
        bugs,
        explanation: currentMode === 'manual'
            ? (document.getElementById('bugAnnotations').value || document.getElementById('explanation').value)
            : document.getElementById('explanation').value,
        totalPoints: parseInt(document.getElementById('totalPoints').value),
        creator:     localStorage.getItem('email') || 'admin',
        bugMode:     currentMode,
        published:   true
    };

    // Show publish modal instead of directly publishing
    showPublishModal();
}


// Function called by publish modal when confirmed (MUST be global)
async function publishGameWithClasses(targetClasses, isPublic) {
    if (!window.gameDataToPublish) {
        alert('Error: No game data to publish');
        return;
    }

    const gameData = {
        ...window.gameDataToPublish,
        targetClasses,
        isPublic
    };

    console.log('Publishing Bug Hunt with classes:', gameData);

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            showProfessionalPopup('Published!', 'Bug Hunt game published successfully.');

        } else {
            const error = await response.json();
            alert('Failed to publish: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Publish error:', err);
        alert('Failed to publish. Please check your connection.');
    }
}
