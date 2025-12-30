// Faculty Create Classic Slide
const bgColors = {
    dark: '#1E2433',
    light: '#F5F7FF',
    blue: '#0F62FE',
    green: '#10B981',
    purple: '#8B5CF6'
};

const textColors = {
    dark: { title: '#f5f7ff', content: '#9ea4b6' },
    light: { title: '#1E2433', content: '#6e6e73' },
    blue: { title: '#FFFFFF', content: '#E0E7FF' },
    green: { title: '#FFFFFF', content: '#D1FAE5' },
    purple: { title: '#FFFFFF', content: '#EDE9FE' }
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    document.getElementById('slideTitle').addEventListener('input', updatePreview);
    document.getElementById('slideContent').addEventListener('input', updatePreview);
    document.getElementById('backgroundColor').addEventListener('change', updatePreview);
    document.getElementById('publishBtn').addEventListener('click', publishSlide);
}

function updatePreview() {
    const title = document.getElementById('slideTitle').value.trim() || 'Your slide title';
    const content = document.getElementById('slideContent').value.trim() || 'Your content will appear here';
    const bgColor = document.getElementById('backgroundColor').value;

    const preview = document.getElementById('slidePreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');

    preview.style.background = bgColors[bgColor];
    previewTitle.textContent = title;
    previewTitle.style.color = textColors[bgColor].title;
    previewContent.textContent = content;
    previewContent.style.color = textColors[bgColor].content;
}

async function publishSlide() {
    const title = document.getElementById('slideTitle').value.trim();
    const content = document.getElementById('slideContent').value.trim();

    if (!title) {
        alert('Please enter a slide title');
        return;
    }

    if (!content) {
        alert('Please enter slide content');
        return;
    }

    const slideData = {
        title,
        content,
        backgroundColor: document.getElementById('backgroundColor').value,
        displayDuration: parseInt(document.getElementById('displayDuration').value),
        slideType: 'classic',
        type: 'slide',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(slideData)
        });

        if (response.ok) {
            alert('✅ Slide published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish slide');
        }
    } catch (error) {
        console.error('Error publishing slide:', error);
        alert('❌ Error publishing slide. Please try again.');
    }
}
