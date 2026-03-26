document.addEventListener('DOMContentLoaded', () => {
    // ── State ──
    let currentMode = 'builder'; // 'builder' | 'scenario'
    let distractors = [];
    let analyzedQueries = []; // holds the AI-analyzed possible queries for scenario mode

    // ── DOM refs ──
    const queryInput = document.getElementById('correctQuery');
    const blocksPreview = document.getElementById('blocksPreview');
    const builderSection = document.getElementById('builderSection');
    const scenarioSection = document.getElementById('scenarioSection');
    const modeBuilderBtn = document.getElementById('modeBuilderBtn');
    const modeScenarioBtn = document.getElementById('modeScenarioBtn');
    const footerMeta = document.getElementById('footerMeta');

    // ── Mode Toggle ──
    modeBuilderBtn.addEventListener('click', () => switchMode('builder'));
    modeScenarioBtn.addEventListener('click', () => switchMode('scenario'));

    function switchMode(mode) {
        currentMode = mode;
        if (mode === 'builder') {
            modeBuilderBtn.classList.add('active');
            modeScenarioBtn.classList.remove('active');
            builderSection.style.display = '';
            scenarioSection.style.display = 'none';
            footerMeta.textContent = 'SQL Challenge Builder';
            // Make correctQuery required for builder mode
            queryInput.required = true;
        } else {
            modeScenarioBtn.classList.add('active');
            modeBuilderBtn.classList.remove('active');
            builderSection.style.display = 'none';
            scenarioSection.style.display = '';
            footerMeta.textContent = 'SQL Scenario Builder (AI Powered)';
            queryInput.required = false;
        }
        // Re-render icons after toggle
        if (window.lucide) lucide.createIcons();
    }

    // ── Classic Builder: block preview ──
    function updateBlocks() {
        const query = queryInput.value;
        const blocks = query.split(/\s+/).filter(b => b.length > 0);
        blocksPreview.innerHTML = blocks.map(b => `<div class="sql-block">${b}</div>`).join('');
    }
    queryInput.addEventListener('input', updateBlocks);

    // ── Classic Builder: distractors ──
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

    const addDistractorBtn = document.getElementById('addDistractorBtn');
    if (addDistractorBtn) addDistractorBtn.addEventListener('click', addDistractor);

    // ── Scenario: Analyze button ──
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analysisResult = document.getElementById('analysisResult');
    const analysisQueryList = document.getElementById('analysisQueryList');

    analyzeBtn.addEventListener('click', async () => {
        const question = document.getElementById('scenarioQuestion').value.trim();
        if (!question) {
            alert('Please enter a scenario question first.');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i data-lucide="loader-2"></i> Analyzing...';
        if (window.lucide) lucide.createIcons({ el: analyzeBtn });

        try {
            const response = await fetch('/api/sql-scenario/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ question })
            });

            const data = await response.json();

            if (!data.ok || !Array.isArray(data.possibleQueries) || data.possibleQueries.length === 0) {
                throw new Error(data.message || 'AI returned no possible queries.');
            }

            analyzedQueries = data.possibleQueries;

            // Render chips
            analysisQueryList.innerHTML = analyzedQueries.map(q => `
                <div class="analysis-query-chip">${escapeHtml(q)}</div>
            `).join('');
            analysisResult.style.display = '';

        } catch (err) {
            alert('Analysis failed: ' + err.message);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i data-lucide="sparkles"></i> Re-Analyze';
            if (window.lucide) lucide.createIcons({ el: analyzeBtn });
        }
    });

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ── Form Submit ──
    document.getElementById('sqlForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (currentMode === 'builder') {
            const query = queryInput.value.trim();
            if (!query) {
                alert('Please enter a valid SQL query.');
                return;
            }
            const blocks = query.split(/\s+/).filter(b => b.length > 0);
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
        } else {
            // Scenario mode
            const question = document.getElementById('scenarioQuestion').value.trim();
            if (!question) {
                alert('Please enter a scenario question.');
                return;
            }
            if (analyzedQueries.length === 0) {
                alert('Please click "Analyze with AI" before publishing to generate the possible correct answers.');
                return;
            }
            window.gameDataToPublish = {
                type: 'sql-scenario',
                title: formData.get('title'),
                brief: formData.get('description'),
                description: formData.get('description'),
                duration: parseInt(formData.get('duration')),
                scenarioQuestion: question,
                possibleQueries: analyzedQueries,
                totalPoints: 50,
                published: true
            };
        }

        showPublishModal();
    });

    // ── Cancel ──
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { window.location.href = 'admin.html'; });
});

// Called by publish-modal.js when confirmed (MUST be global)
async function publishGameWithClasses(targetClasses, isPublic) {
    if (!window.gameDataToPublish) {
        alert('Error: No game data to publish');
        return;
    }
    const gameData = { ...window.gameDataToPublish, targetClasses, isPublic };
    console.log('Publishing SQL game with classes:', gameData);

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
            const typeName = gameData.type === 'sql-scenario' ? '✅ SQL Scenario' : '✅ SQL Challenge';
            alert(`${typeName} published successfully!`);
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
