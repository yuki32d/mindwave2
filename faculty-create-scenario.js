// Scenario Builder JavaScript
const API_BASE = window.location.origin;

// State
let scenes = [];
let currentSceneId = null;
let sceneIdCounter = 1;

// Elements
const gameTitle = document.getElementById('gameTitle');
const gameDescription = document.getElementById('gameDescription');
const gameDifficulty = document.getElementById('gameDifficulty');
const sceneList = document.getElementById('sceneList');
const sceneEditor = document.getElementById('sceneEditor');
const addSceneBtn = document.getElementById('addSceneBtn');
const previewBtn = document.getElementById('previewBtn');
const publishBtn = document.getElementById('publishBtn');

// Initialize
function init() {
    addSceneBtn.addEventListener('click', addScene);
    previewBtn.addEventListener('click', previewScenario);
    publishBtn.addEventListener('click', publishScenario);

    // Create first scene automatically
    addScene();
}

// Add new scene
function addScene() {
    const newScene = {
        id: sceneIdCounter++,
        text: '',
        choices: []
    };
    scenes.push(newScene);
    renderSceneList();
    selectScene(newScene.id);
}

// Render scene list
function renderSceneList() {
    if (scenes.length === 0) {
        sceneList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <p>No scenes yet. Click "Add Scene" to start!</p>
            </div>
        `;
        return;
    }

    sceneList.innerHTML = scenes.map(scene => `
        <div class="scene-card ${scene.id === currentSceneId ? 'active' : ''}" onclick="selectScene(${scene.id})">
            <h4>Scene ${scene.id}</h4>
            <p>${scene.text || 'No text yet...'}</p>
        </div>
    `).join('');
}

// Select scene
window.selectScene = function (sceneId) {
    currentSceneId = sceneId;
    renderSceneList();
    renderSceneEditor();
};

// Render scene editor
function renderSceneEditor() {
    const scene = scenes.find(s => s.id === currentSceneId);
    if (!scene) {
        sceneEditor.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                <p>Select a scene to edit</p>
            </div>
        `;
        return;
    }

    sceneEditor.innerHTML = `
        <div class="scene-editor">
            <div>
                <label for="sceneText">Scene Text / Question</label>
                <textarea id="sceneText" rows="4" placeholder="Describe the situation or ask a question...">${scene.text}</textarea>
            </div>
            
            <div>
                <label>Choices (students will pick one)</label>
                <div id="choicesList"></div>
                <button class="add-choice-btn" onclick="addChoice()">+ Add Choice</button>
            </div>
            
            <div style="display: flex; gap: 12px;">
                <button class="secondary-btn" onclick="deleteScene()" style="flex: 1; background: rgba(220, 38, 38, 0.2); color: #ef4444; border: 1px solid rgba(220, 38, 38, 0.3);">🗑️ Delete Scene</button>
            </div>
        </div>
    `;

    // Add event listener for scene text
    document.getElementById('sceneText').addEventListener('input', (e) => {
        scene.text = e.target.value;
        renderSceneList();
    });

    renderChoices();
}

// Render choices
function renderChoices() {
    const scene = scenes.find(s => s.id === currentSceneId);
    if (!scene) return;

    const choicesList = document.getElementById('choicesList');
    if (!choicesList) return;

    if (scene.choices.length === 0) {
        choicesList.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 20px;">No choices yet. Add at least 2 choices!</p>';
        return;
    }

    choicesList.innerHTML = scene.choices.map((choice, index) => `
        <div class="choice-item">
            <input type="text" placeholder="Choice text (e.g., Explain hooks)" value="${choice.text}" onchange="updateChoice(${index}, 'text', this.value)">
            <input type="number" class="choice-points" placeholder="Points" value="${choice.points}" onchange="updateChoice(${index}, 'points', this.value)">
            <select onchange="updateChoice(${index}, 'nextSceneId', this.value)">
                <option value="">-- Next Scene --</option>
                <option value="END" ${choice.nextSceneId === 'END' ? 'selected' : ''}>🏁 End Game</option>
                ${scenes.filter(s => s.id !== currentSceneId).map(s => `
                    <option value="${s.id}" ${choice.nextSceneId == s.id ? 'selected' : ''}>Scene ${s.id}</option>
                `).join('')}
            </select>
            <button class="delete-choice-btn" onclick="deleteChoice(${index})">×</button>
        </div>
    `).join('');
}

// Add choice
window.addChoice = function () {
    const scene = scenes.find(s => s.id === currentSceneId);
    if (!scene) return;

    if (scene.choices.length >= 4) {
        alert('Maximum 4 choices per scene!');
        return;
    }

    scene.choices.push({
        text: '',
        points: 0,
        nextSceneId: ''
    });

    renderChoices();
};

// Update choice
window.updateChoice = function (index, field, value) {
    const scene = scenes.find(s => s.id === currentSceneId);
    if (!scene) return;

    if (field === 'points') {
        scene.choices[index][field] = parseInt(value) || 0;
    } else {
        scene.choices[index][field] = value;
    }
};

// Delete choice
window.deleteChoice = function (index) {
    const scene = scenes.find(s => s.id === currentSceneId);
    if (!scene) return;

    scene.choices.splice(index, 1);
    renderChoices();
};

// Delete scene
window.deleteScene = function () {
    if (!confirm('Delete this scene?')) return;

    scenes = scenes.filter(s => s.id !== currentSceneId);
    currentSceneId = scenes.length > 0 ? scenes[0].id : null;

    renderSceneList();
    renderSceneEditor();
};

// Validate scenario
function validateScenario() {
    if (!gameTitle.value.trim()) {
        alert('Please enter a game title');
        return false;
    }

    if (!gameDescription.value.trim()) {
        alert('Please enter a game description');
        return false;
    }

    if (scenes.length === 0) {
        alert('Please add at least one scene');
        return false;
    }

    for (const scene of scenes) {
        if (!scene.text.trim()) {
            alert(`Scene ${scene.id} has no text`);
            return false;
        }

        if (scene.choices.length < 2) {
            alert(`Scene ${scene.id} needs at least 2 choices`);
            return false;
        }

        for (const choice of scene.choices) {
            if (!choice.text.trim()) {
                alert(`Scene ${scene.id} has a choice with no text`);
                return false;
            }

            if (!choice.nextSceneId) {
                alert(`Scene ${scene.id}: Choice "${choice.text}" has no next scene selected`);
                return false;
            }
        }
    }

    return true;
}

// Preview scenario
function previewScenario() {
    if (!validateScenario()) return;

    // Store in localStorage for preview
    localStorage.setItem('scenario_preview', JSON.stringify({
        title: gameTitle.value,
        description: gameDescription.value,
        difficulty: gameDifficulty.value,
        scenes: scenes
    }));

    window.open('student-scenario-preview.html', '_blank');
}

// Publish scenario
async function publishScenario() {
    if (!validateScenario()) return;

    // Store game data for modal (use global variable)
    window.gameDataToPublish = {
        title: gameTitle.value.trim(),
        type: 'scenario',
        difficulty: gameDifficulty.value,
        brief: gameDescription.value.trim(),
        description: gameDescription.value.trim(),
        scenes: scenes,
        published: true,
        totalPoints: scenes.reduce((sum, scene) => {
            return sum + scene.choices.reduce((max, choice) => Math.max(max, choice.points), 0);
        }, 0)
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

    console.log('Publishing Scenario with classes:', gameData);

    try {
        const res = await fetch(`${API_BASE}/api/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify(gameData)
        });

        const data = await res.json();

        if (data.ok) {
            alert('✅ Scenario published successfully!');
            window.location.href = 'admin.html';
        } else {
            alert('Failed to publish: ' + data.message);
        }
    } catch (error) {
        console.error('Publish error:', error);
        alert('Failed to publish scenario');
    }
}

// Initialize on load
init();
