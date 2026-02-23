// Faculty Create Unjumble - Game Creation Logic

document.getElementById('unjumbleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const rawCode = formData.get('code');

    // Split code into lines, removing empty lines
    const lines = rawCode.split('\n').filter(line => line.trim().length > 0);

    if (lines.length < 2) {
        alert('Please provide at least 2 lines of code.');
        return;
    }

    // Store game data for modal (use global variable)
    window.gameDataToPublish = {
        type: 'code-unjumble',
        title: formData.get('title'),
        brief: formData.get('description') || 'Code unjumble challenge',
        description: formData.get('description') || 'Reorder the code lines correctly',
        duration: parseInt(formData.get('duration')),
        lines: lines,
        totalPoints: lines.length * 10,
        published: true
    };

    // Show publish modal instead of directly publishing
    showPublishModal();
});

// Cancel button handler
const cancelBtn = document.getElementById('cancelBtn');
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
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

    console.log('Publishing Code Unjumble with classes:', gameData);

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
            alert('✅ Code Challenge published successfully!');
            window.location.href = 'admin.html';
        } else {
            const error = await response.json();
            alert('Failed to publish: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Publish error:', err);
        alert('Failed to publish. Please check your connection.');
    }
}
