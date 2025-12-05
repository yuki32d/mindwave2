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

    const gameData = {
        type: 'code-unjumble',
        title: formData.get('title'),
        brief: formData.get('description') || 'Code unjumble challenge',
        description: formData.get('description') || 'Reorder the code lines correctly',
        duration: parseInt(formData.get('duration')),
        lines: lines, // This is the correct order
        totalPoints: lines.length * 10,
        published: true // Explicitly set published to true
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData)
        });

        const result = await response.json();

        if (result.ok) {
            alert('Code Challenge published successfully!');
            window.location.href = 'admin.html';
        } else {
            alert('Error: ' + (result.message || 'Failed to publish game'));
        }
    } catch (error) {
        console.error('Error publishing unjumble game:', error);
        alert('Failed to publish game. Please try again.');
    }
});
