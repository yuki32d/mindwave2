document.addEventListener('DOMContentLoaded', () => {
    const queryInput = document.getElementById('correctQuery');
    const blocksPreview = document.getElementById('blocksPreview');
    let distractors = [];

    function updateBlocks() {
        const query = queryInput.value;
        // Simple tokenizer: split by spaces, keeping quotes together if possible (simplified for now)
        // For MVP, just split by space.
        const blocks = query.split(/\s+/).filter(b => b.length > 0);

        blocksPreview.innerHTML = blocks.map(b => `<div class="sql-block">${b}</div>`).join('');
    }

    function addDistractor() {
        const input = document.getElementById('distractorInput');
        const val = input.value.trim();
        if (val && !distractors.includes(val)) {
            distractors.push(val);
            input.value = '';
            renderDistractors();
        }
    }

    function renderDistractors() {
        const container = document.getElementById('distractorPreview');
        container.innerHTML = distractors.map(d => `<div class="sql-block distractor-block">${d}</div>`).join('');
    }

    queryInput.addEventListener('input', updateBlocks);

    document.getElementById('sqlForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = queryInput.value.trim();
        if (!query) {
            alert('Please enter a valid SQL query.');
            return;
        }

        const blocks = query.split(/\s+/).filter(b => b.length > 0);

        const formData = new FormData(e.target);
        const gameData = {
            type: 'sql-builder',
            title: formData.get('title'),
            description: formData.get('description'),
            duration: parseInt(formData.get('duration')),
            correctQuery: query,
            blocks: blocks,
            distractors: distractors,
            totalPoints: 20, // Fixed points for SQL
            status: 'active'
        };

        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData)
            });

            const result = await response.json();

            if (result.ok) {
                alert('SQL Challenge published successfully!');
                window.location.href = 'admin.html';
            } else {
                alert('Error: ' + (result.message || 'Failed to publish game'));
            }
        } catch (error) {
            console.error('Error publishing SQL game:', error);
            alert('Failed to publish game. Please try again.');
        }
    });

    // Add distractor button
    const addDistractorBtn = document.getElementById('addDistractorBtn');
    if (addDistractorBtn) {
        addDistractorBtn.addEventListener('click', addDistractor);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    }
});
