document.addEventListener('DOMContentLoaded', () => {
    // ── State ──
    let currentMode = 'builder'; // 'builder' | 'scenario'
    let distractors = [];
    // Array of { question: string, possibleQueries: string[], analyzed: bool }
    let scenarioQuestions = [{ question: '', possibleQueries: [], analyzed: false }];

    // ── DOM refs ──
    const queryInput = document.getElementById('correctQuery');
    const blocksPreview = document.getElementById('blocksPreview');
    const builderSection = document.getElementById('builderSection');
    const scenarioSection = document.getElementById('scenarioSection');
    const modeBuilderBtn = document.getElementById('modeBuilderBtn');
    const modeScenarioBtn = document.getElementById('modeScenarioBtn');
    const footerMeta = document.getElementById('footerMeta');
    const questionListEl = document.getElementById('scenarioQuestionList');
    const addQuestionBtn = document.getElementById('addQuestionBtn');

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
            queryInput.required = true;
        } else {
            modeScenarioBtn.classList.add('active');
            modeBuilderBtn.classList.remove('active');
            builderSection.style.display = 'none';
            scenarioSection.style.display = '';
            footerMeta.textContent = 'SQL Scenario Builder (AI Powered)';
            queryInput.required = false;
            renderQuestionList();
        }
        if (window.lucide) lucide.createIcons();
    }

    // ── Classic Builder ──
    function updateBlocks() {
        const blocks = queryInput.value.split(/\s+/).filter(b => b.length > 0);
        blocksPreview.innerHTML = blocks.map(b => `<div class="sql-block">${b}</div>`).join('');
    }
    queryInput.addEventListener('input', updateBlocks);

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
        document.getElementById('distractorPreview').innerHTML =
            distractors.map(d => `<div class="sql-block distractor-block">${d}</div>`).join('');
    }
    const addDistractorBtn = document.getElementById('addDistractorBtn');
    if (addDistractorBtn) addDistractorBtn.addEventListener('click', addDistractor);

    // ── Scenario: Render question list ──
    function renderQuestionList() {
        questionListEl.innerHTML = '';
        scenarioQuestions.forEach((q, idx) => {
            const card = document.createElement('div');
            card.className = 'scenario-q-card';
            card.innerHTML = `
                <div class="scenario-q-header">
                    <span class="scenario-q-num">Question ${idx + 1}</span>
                    ${scenarioQuestions.length > 1
                        ? `<button type="button" class="remove-q-btn" data-idx="${idx}" title="Remove question">✕</button>`
                        : ''}
                </div>
                <textarea class="gb-code-editor scenario-q-input" data-idx="${idx}" rows="2"
                    placeholder="e.g. How do you select all rows from the student table?"
                >${escapeHtml(q.question)}</textarea>
                <button type="button" class="btn-analyze" data-idx="${idx}" ${q.question.trim() === '' ? 'disabled' : ''}>
                    ${q.analyzed ? '<span>✅ Re-Analyze with AI</span>' : '<span>✨ Analyze with AI</span>'}
                </button>
                ${q.analyzed && q.possibleQueries.length > 0 ? `
                <div class="analysis-result">
                    <div class="analysis-result-title">✓ ${q.possibleQueries.length} correct solution(s) found</div>
                    <div>${q.possibleQueries.map(pq => `<div class="analysis-query-chip">${escapeHtml(pq)}</div>`).join('')}</div>
                </div>` : ''}
            `;
            questionListEl.appendChild(card);
        });

        // Bindings
        questionListEl.querySelectorAll('.scenario-q-input').forEach(ta => {
            ta.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                scenarioQuestions[idx].question = e.target.value;
                scenarioQuestions[idx].analyzed = false;
                // enable/disable its analyze button
                const analyzeBtn = e.target.parentElement.querySelector('.btn-analyze');
                if (analyzeBtn) analyzeBtn.disabled = e.target.value.trim() === '';
            });
        });

        questionListEl.querySelectorAll('.btn-analyze').forEach(btn => {
            btn.addEventListener('click', () => analyzeQuestion(parseInt(btn.dataset.idx), btn));
        });

        questionListEl.querySelectorAll('.remove-q-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                scenarioQuestions.splice(parseInt(btn.dataset.idx), 1);
                renderQuestionList();
            });
        });

        if (window.lucide) lucide.createIcons({ el: questionListEl });
    }

    addQuestionBtn.addEventListener('click', () => {
        scenarioQuestions.push({ question: '', possibleQueries: [], analyzed: false });
        renderQuestionList();
        // Scroll to new card
        const cards = questionListEl.querySelectorAll('.scenario-q-card');
        if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // ── Scenario: Analyze single question ──
    async function analyzeQuestion(idx, btn) {
        const question = scenarioQuestions[idx].question.trim();
        if (!question) return;

        btn.disabled = true;
        btn.innerHTML = '<span>⏳ Analyzing...</span>';

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
            scenarioQuestions[idx].possibleQueries = data.possibleQueries;
            scenarioQuestions[idx].analyzed = true;
            renderQuestionList();
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<span>✨ Analyze with AI</span>';
            alert('Analysis failed: ' + err.message);
        }
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ── Form Submit ──
    document.getElementById('sqlForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        if (currentMode === 'builder') {
            const query = queryInput.value.trim();
            if (!query) { alert('Please enter a valid SQL query.'); return; }
            const blocks = query.split(/\s+/).filter(b => b.length > 0);
            window.gameDataToPublish = {
                type: 'sql-builder',
                title: formData.get('title'),
                brief: formData.get('description'),
                description: formData.get('description'),
                duration: parseInt(formData.get('duration')),
                correctQuery: query, blocks, distractors,
                totalPoints: 20, published: true
            };
        } else {
            // Validate all questions have text
            const emptyQ = scenarioQuestions.findIndex(q => !q.question.trim());
            if (emptyQ !== -1) {
                alert(`Question ${emptyQ + 1} is empty. Please fill it in.`);
                return;
            }
            // Validate all questions have been analyzed
            const unanalyzed = scenarioQuestions.findIndex(q => !q.analyzed);
            if (unanalyzed !== -1) {
                alert(`Question ${unanalyzed + 1} hasn't been analyzed yet. Click "Analyze with AI" on it first.`);
                return;
            }
            if (scenarioQuestions.length === 0) {
                alert('Please add at least one scenario question.');
                return;
            }
            window.gameDataToPublish = {
                type: 'sql-scenario',
                title: formData.get('title'),
                brief: formData.get('description'),
                description: formData.get('description'),
                duration: parseInt(formData.get('duration')),
                // Store multiple questions
                scenarioQuestions: scenarioQuestions.map(q => ({
                    question: q.question,
                    possibleQueries: q.possibleQueries
                })),
                totalPoints: scenarioQuestions.length * 20,
                published: true
            };
        }

        showPublishModal();
    });

    // ── Cancel ──
    document.getElementById('cancelBtn')?.addEventListener('click', () => { window.location.href = 'admin.html'; });
});

// Called by publish-modal.js (MUST be global)
async function publishGameWithClasses(targetClasses, isPublic) {
    if (!window.gameDataToPublish) { alert('Error: No game data to publish'); return; }
    const gameData = { ...window.gameDataToPublish, targetClasses, isPublic };
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
            const label = gameData.type === 'sql-scenario' ? '✅ SQL Scenario' : '✅ SQL Challenge';
            alert(`${label} published successfully!`);
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
