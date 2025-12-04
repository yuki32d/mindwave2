let perfectCodeEditor;
let buggyCodeEditor;

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

    // Update mode when language changes
    document.getElementById('language').addEventListener('change', (e) => {
        const mode = e.target.value === 'python' ? 'python' :
            e.target.value === 'java' ? 'text/x-java' :
                e.target.value === 'cpp' ? 'text/x-c++src' : 'javascript';
        perfectCodeEditor.setOption('mode', mode);
        buggyCodeEditor.setOption('mode', mode);
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
    const title = document.getElementById('gameTitle').value;
    const description = document.getElementById('gameDesc').value;
    const perfectCode = perfectCodeEditor.getValue();

    if (!title || !description || !perfectCode.trim()) {
        alert('Please fill in all required fields!');
        return;
    }

    const bugCount = parseInt(document.getElementById('bugCount').value);
    const result = injectBugs(perfectCode, bugCount);

    // CRITICAL: Verify that bugs were actually injected
    if (result.buggyCode === perfectCode) {
        alert('⚠️ Bug injection failed! The code is too simple or doesn\'t have enough lines to inject bugs. Please add more code or reduce the number of bugs.');
        return;
    }

    if (result.bugs.length === 0) {
        alert('⚠️ No bugs were injected! Please make sure your code has enough content for bug injection.');
        return;
    }

    const game = {
        type: 'bug-hunt',
        title: title,
        description: description,
        difficulty: document.getElementById('difficulty').value,
        duration: parseInt(document.getElementById('duration').value),
        language: document.getElementById('language').value,
        perfectCode: perfectCode,
        buggyCode: result.buggyCode,
        bugCount: bugCount,
        bugs: result.bugs,
        explanation: document.getElementById('explanation').value,
        totalPoints: parseInt(document.getElementById('totalPoints').value),
        creator: localStorage.getItem('email') || 'admin',
        published: true
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(game)
        });

        if (response.ok) {
            alert('✅ Debug game published successfully!');
            window.location.href = 'admin.html';
        } else {
            const error = await response.json();
            alert('Failed to publish game: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error publishing game:', err);
        alert('Failed to publish game. Please check your connection.');
    }
}
