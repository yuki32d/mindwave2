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

        // Store game data for modal (use global variable)
        window.gameDataToPublish = {
            type: 'sql-builder',
            title: formData.get('title'),
            brief: formData.get('description'),
            description: formData.get('description'),
            duration: parseInt(formData.get('duration')),
            correctQuery: query,
            blocks: blocks,
            distractors: distractors,
            totalPoints: 20,
            published: true
        };

        // Show publish modal instead of directly publishing
        showPublishModal();
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

    console.log('Publishing SQL Builder with classes:', gameData);

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
            alert('✅ SQL Challenge published successfully!');
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
