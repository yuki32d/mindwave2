// Faculty Create Ranking - Drag to Reorder Tool
let rankingItems = [];
let draggedElement = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addItem);

    // Enter key to add item
    document.getElementById('itemInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem();
        }
    });

    // Update preview on changes
    document.getElementById('rankingTitle').addEventListener('input', updatePreview);
    document.getElementById('questionText').addEventListener('input', updatePreview);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishRanking);
}

function addItem() {
    const input = document.getElementById('itemInput');
    const itemText = input.value.trim();

    if (!itemText) {
        alert('Please enter an item');
        return;
    }

    if (rankingItems.length >= 10) {
        alert('Maximum 10 items allowed');
        return;
    }

    rankingItems.push({
        id: Date.now(),
        text: itemText,
        order: rankingItems.length + 1
    });

    input.value = '';
    updateItemsList();
    updatePreview();
}

function updateItemsList() {
    const container = document.getElementById('itemsList');

    if (rankingItems.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; margin-top: 80px;">No items added yet</p>';
        return;
    }

    container.innerHTML = rankingItems.map((item, index) => `
        <div class="ranking-item" draggable="true" data-id="${item.id}"
            style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; margin-bottom: 8px; cursor: grab;">
            <div style="width: 32px; height: 32px; background: #8B5CF6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700;">${item.order}</div>
            <span style="color: #8B5CF6; font-size: 20px;">☰</span>
            <span style="flex: 1; color: #f5f7ff;">${item.text}</span>
            <button data-item-id="${item.id}" class="remove-item-btn" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
        </div>
    `).join('');

    // Add drag and drop event listeners
    const items = container.querySelectorAll('.ranking-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = e.currentTarget;
    e.currentTarget.style.opacity = '0.4';
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    if (draggedElement !== e.currentTarget) {
        const draggedId = parseInt(draggedElement.dataset.id);
        const targetId = parseInt(e.currentTarget.dataset.id);

        const draggedIndex = rankingItems.findIndex(item => item.id === draggedId);
        const targetIndex = rankingItems.findIndex(item => item.id === targetId);

        // Swap items
        [rankingItems[draggedIndex], rankingItems[targetIndex]] = [rankingItems[targetIndex], rankingItems[draggedIndex]];

        // Update order numbers
        rankingItems.forEach((item, index) => {
            item.order = index + 1;
        });

        updateItemsList();
        updatePreview();
    }

    return false;
}

function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
}

function removeItem(id) {
    rankingItems = rankingItems.filter(item => item.id !== id);
    // Reorder
    rankingItems.forEach((item, index) => {
        item.order = index + 1;
    });
    updateItemsList();
    updatePreview();
}

function updatePreview() {
    const title = document.getElementById('rankingTitle').value.trim() || 'Your ranking will appear here';
    const question = document.getElementById('questionText').value.trim();

    document.getElementById('previewTitle').textContent = title;
    document.getElementById('previewQuestion').textContent = question;

    const previewList = document.getElementById('previewRankingList');

    if (rankingItems.length === 0) {
        previewList.innerHTML = '';
        return;
    }

    // Shuffle items for preview
    const shuffled = [...rankingItems].sort(() => Math.random() - 0.5);

    previewList.innerHTML = shuffled.map((item, index) => `
        <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(139, 92, 246, 0.1); border: 2px solid rgba(139, 92, 246, 0.3); border-radius: 12px; margin-bottom: 12px; cursor: grab;">
            <span style="color: #8B5CF6; font-size: 24px;">☰</span>
            <span style="flex: 1; color: #f5f7ff;">${item.text}</span>
            <div style="width: 32px; height: 32px; background: rgba(139, 92, 246, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #8B5CF6; font-weight: 700;">${index + 1}</div>
        </div>
    `).join('');
}

async function publishRanking() {
    const title = document.getElementById('rankingTitle').value.trim();
    const questionText = document.getElementById('questionText').value.trim();

    if (!title) {
        alert('Please enter a ranking title');
        return;
    }

    if (!questionText) {
        alert('Please enter a question/prompt');
        return;
    }

    if (rankingItems.length < 3) {
        alert('Please add at least 3 items to rank');
        return;
    }

    const rankingData = {
        title,
        questionText,
        items: rankingItems,
        hasCorrectOrder: document.getElementById('hasCorrectOrder').checked,
        showAggregate: document.getElementById('showAggregate').checked,
        type: 'ranking',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(rankingData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Ranking published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish ranking');
        }
    } catch (error) {
        console.error('Error publishing ranking:', error);
        alert('❌ Error publishing ranking. Please try again.');
    }
}

// Event delegation for remove buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item-btn')) {
        const itemId = parseInt(e.target.dataset.itemId);
        if (itemId) {
            removeItem(itemId);
        }
    }
});

// Back button handler
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
}
