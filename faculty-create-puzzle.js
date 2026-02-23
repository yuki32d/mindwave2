//Faculty Create Puzzle - Drag & Drop Matching Game
let puzzleItems = [];
let puzzleMode = 'match';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Back button event listener
    document.getElementById('backBtn')?.addEventListener('click', () => window.history.back());

    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Mode selection
    document.getElementById('puzzleMode').addEventListener('change', (e) => {
        puzzleMode = e.target.value;
        toggleModeUI();
        updatePreview();
    });

    // Add pair button
    document.getElementById('addPairBtn').addEventListener('click', addMatchPair);

    // Add sequence button
    document.getElementById('addSequenceBtn').addEventListener('click', addSequenceItem);

    // Enter key handlers
    document.getElementById('rightItem').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addMatchPair();
        }
    });

    document.getElementById('sequenceItem').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSequenceItem();
        }
    });

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishPuzzle);
}

function toggleModeUI() {
    const matchSection = document.getElementById('matchPairsSection');
    const sequenceSection = document.getElementById('sequenceSection');
    const matchPreview = document.getElementById('matchPreview');
    const sequencePreview = document.getElementById('sequencePreview');

    if (puzzleMode === 'match') {
        matchSection.style.display = 'block';
        sequenceSection.style.display = 'none';
        matchPreview.style.display = 'block';
        sequencePreview.style.display = 'none';
    } else {
        matchSection.style.display = 'none';
        sequenceSection.style.display = 'block';
        matchPreview.style.display = 'none';
        sequencePreview.style.display = 'block';
    }

    // Clear items when switching modes
    puzzleItems = [];
    updateItemsList();
}

function addMatchPair() {
    const leftInput = document.getElementById('leftItem');
    const rightInput = document.getElementById('rightItem');
    const leftText = leftInput.value.trim();
    const rightText = rightInput.value.trim();

    if (!leftText || !rightText) {
        alert('Please enter both left and right items');
        return;
    }

    puzzleItems.push({
        id: Date.now(),
        left: leftText,
        right: rightText
    });

    leftInput.value = '';
    rightInput.value = '';
    leftInput.focus();

    updateItemsList();
    updatePreview();
}

function addSequenceItem() {
    const input = document.getElementById('sequenceItem');
    const text = input.value.trim();

    if (!text) {
        alert('Please enter an item');
        return;
    }

    puzzleItems.push({
        id: Date.now(),
        text: text,
        order: puzzleItems.length + 1
    });

    input.value = '';
    input.focus();

    updateItemsList();
    updatePreview();
}

function updateItemsList() {
    const container = document.getElementById('itemsList');

    if (puzzleItems.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; margin-top: 60px;">No items added yet</p>';
        return;
    }

    if (puzzleMode === 'match') {
        container.innerHTML = puzzleItems.map((item, index) => `
            <div class="list-item" style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; margin-bottom: 8px; align-items: center;">
                <span style="color: #00D9FF;">${item.left}</span>
                <span style="color: #10b981;">→ ${item.right}</span>
                <button onclick="removeItem(${item.id})" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
        `).join('');
    } else {
        container.innerHTML = puzzleItems.map((item, index) => `
            <div class="list-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="width: 32px; height: 32px; background: #00D9FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #1E2433; font-weight: 700;">${item.order}</div>
                <span style="flex: 1;">${item.text}</span>
                <button onclick="moveUp(${item.id})" ${index === 0 ? 'disabled' : ''} style="background: rgba(255,255,255,0.1); color: #f5f7ff; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">↑</button>
                <button onclick="moveDown(${item.id})" ${index === puzzleItems.length - 1 ? 'disabled' : ''} style="background: rgba(255,255,255,0.1); color: #f5f7ff; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">↓</button>
                <button onclick="removeItem(${item.id})" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
            </div>
        `).join('');
    }
}

function removeItem(id) {
    puzzleItems = puzzleItems.filter(item => item.id !== id);
    // Reorder sequence items
    if (puzzleMode === 'sequence') {
        puzzleItems.forEach((item, index) => {
            item.order = index + 1;
        });
    }
    updateItemsList();
    updatePreview();
}

function moveUp(id) {
    const index = puzzleItems.findIndex(item => item.id === id);
    if (index > 0) {
        [puzzleItems[index], puzzleItems[index - 1]] = [puzzleItems[index - 1], puzzleItems[index]];
        puzzleItems.forEach((item, i) => item.order = i + 1);
        updateItemsList();
        updatePreview();
    }
}

function moveDown(id) {
    const index = puzzleItems.findIndex(item => item.id === id);
    if (index < puzzleItems.length - 1) {
        [puzzleItems[index], puzzleItems[index + 1]] = [puzzleItems[index + 1], puzzleItems[index]];
        puzzleItems.forEach((item, i) => item.order = i + 1);
        updateItemsList();
        updatePreview();
    }
}

function updatePreview() {
    const title = document.getElementById('puzzleTitle').value.trim() || 'Your puzzle will appear here';
    document.getElementById('previewTitle').textContent = title;

    if (puzzleMode === 'match') {
        updateMatchPreview();
    } else {
        updateSequencePreview();
    }
}

function updateMatchPreview() {
    const leftColumn = document.getElementById('leftColumn');
    const rightColumn = document.getElementById('rightColumn');

    if (puzzleItems.length === 0) {
        leftColumn.innerHTML = '';
        rightColumn.innerHTML = '';
        return;
    }

    // Shuffle right items for preview
    const rightItems = [...puzzleItems].sort(() => Math.random() - 0.5);

    leftColumn.innerHTML = puzzleItems.map(item => `
        <div style="padding: 16px; background: rgba(0, 217, 255, 0.1); border: 2px solid rgba(0, 217, 255, 0.3); border-radius: 12px; margin-bottom: 12px; cursor: grab;">
            ${item.left}
        </div>
    `).join('');

    rightColumn.innerHTML = rightItems.map(item => `
        <div style="padding: 16px; background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 12px; margin-bottom: 12px; cursor: grab;">
            ${item.right}
        </div>
    `).join('');
}

function updateSequencePreview() {
    const sequenceColumn = document.getElementById('sequenceColumn');

    if (puzzleItems.length === 0) {
        sequenceColumn.innerHTML = '';
        return;
    }

    // Shuffle items for preview
    const shuffled = [...puzzleItems].sort(() => Math.random() - 0.5);

    sequenceColumn.innerHTML = shuffled.map(item => `
        <div style="padding: 16px; background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; margin-bottom: 12px; cursor: grab; display: flex; align-items: center; gap: 12px;">
            <span style="color: #8B5CF6; font-size: 20px;">☰</span>
            <span>${item.text}</span>
        </div>
    `).join('');
}

async function publishPuzzle() {
    const title = document.getElementById('puzzleTitle').value.trim();

    if (!title) {
        alert('Please enter a puzzle title');
        return;
    }

    if (puzzleItems.length === 0) {
        alert('Please add at least one item');
        return;
    }

    if (puzzleMode === 'match' && puzzleItems.length < 2) {
        alert('Please add at least 2 pairs for matching');
        return;
    }

    const puzzleData = {
        title,
        mode: puzzleMode,
        items: puzzleItems,
        shuffle: document.getElementById('shuffleItems').checked,
        type: 'puzzle',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(puzzleData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Puzzle published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish puzzle');
        }
    } catch (error) {
        console.error('Error publishing puzzle:', error);
        alert('❌ Error publishing puzzle. Please try again.');
    }
}
