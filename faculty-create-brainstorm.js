// Faculty Create Brainstorm - Collaborative Sticky Notes Board
document.addEventListener('DOMContentLoaded', () => {
    // Back button event listener
    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());

    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Update preview on changes
    document.getElementById('boardTitle').addEventListener('input', updatePreview);
    document.getElementById('promptText').addEventListener('input', updatePreview);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishBoard);
}

function updatePreview() {
    const title = document.getElementById('boardTitle').value.trim() || 'Your brainstorm board will appear here';
    const prompt = document.getElementById('promptText').value.trim();

    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewPrompt').textContent = prompt;
}

async function publishBoard() {
    const title = document.getElementById('boardTitle').value.trim();
    const promptText = document.getElementById('promptText').value.trim();

    if (!title) {
        alert('Please enter a board title');
        return;
    }

    if (!promptText) {
        alert('Please enter a prompt/question');
        return;
    }

    const boardData = {
        title,
        promptText,
        timeLimit: parseInt(document.getElementById('timeLimit').value) || null,
        allowAnonymous: document.getElementById('allowAnonymous').checked,
        allowVoting: document.getElementById('allowVoting').checked,
        showRealTime: document.getElementById('showRealTime').checked,
        maxIdeas: parseInt(document.getElementById('maxIdeas').value) || null,
        type: 'brainstorm',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(boardData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Brainstorm board published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish board');
        }
    } catch (error) {
        console.error('Error publishing board:', error);
        alert('❌ Error publishing board. Please try again.');
    }
}
