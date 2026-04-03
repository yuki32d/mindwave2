// Coding Challenge Builder – faculty-create-scenario.js
const API_BASE = window.location.origin;
let testCases = [];
let tcCounter = 0;
let analyzedSolutions = null;

// ── Test Case Management ──────────────────────────────────────────
function addTestCase(input = '', expected = '') {
    const id = ++tcCounter;
    testCases.push({ id, input, expected });
    renderTestCases();
    updateAnalyzeButton();
}

function updateTC(id, field, value) {
    const tc = testCases.find(t => t.id === id);
    if (tc) tc[field] = value;
    updateAnalyzeButton();
}

function deleteTC(id) {
    testCases = testCases.filter(t => t.id !== id);
    renderTestCases();
    updateAnalyzeButton();
    resetAnalysis();
}

function renderTestCases() {
    const list = document.getElementById('tcList');
    if (testCases.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted,#9ea4b6);font-size:13px;">No test cases yet. Add at least one.</div>`;
        return;
    }
    list.innerHTML = testCases.map((tc, i) => `
        <div class="tc-item">
            <div class="cs-form-group">
                <div class="tc-num">TEST ${i + 1} — INPUT</div>
                <input class="cs-input" style="font-family:'JetBrains Mono',monospace;font-size:12px;"
                    placeholder="e.g. hello" value="${escapeHtml(tc.input)}"
                    oninput="updateTC(${tc.id},'input',this.value)">
            </div>
            <div class="cs-form-group">
                <div class="tc-num">EXPECTED OUTPUT</div>
                <input class="cs-input" style="font-family:'JetBrains Mono',monospace;font-size:12px;"
                    placeholder="e.g. olleh" value="${escapeHtml(tc.expected)}"
                    oninput="updateTC(${tc.id},'expected',this.value)">
            </div>
            <button class="tc-del-btn" onclick="deleteTC(${tc.id})" title="Remove test case">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

function updateAnalyzeButton() {
    const title = document.getElementById('gameTitle').value.trim();
    const desc = document.getElementById('gameDescription').value.trim();
    const hasTC = testCases.length > 0 && testCases.some(t => t.expected.trim());
    const canAnalyze = title && desc && hasTC;
    document.getElementById('analyzeBtn').disabled = !canAnalyze;
    if (!canAnalyze) {
        document.getElementById('aiStatus').textContent = 'Fill in the problem title, description, and at least one test case first.';
        document.getElementById('aiStatus').className = 'cs-ai-status';
    }
}

function resetAnalysis() {
    analyzedSolutions = null;
    document.getElementById('solutionsPreview').style.display = 'none';
    document.getElementById('publishBtn').disabled = true;
    document.getElementById('footerStatus').textContent = 'Analyze with AI before publishing.';
}

// ── AI Analysis ───────────────────────────────────────────────────
async function analyzeWithAI() {
    const question = document.getElementById('gameDescription').value.trim();
    const language = document.getElementById('gameLanguage').value;
    const statusEl = document.getElementById('aiStatus');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const langLabels = { python: 'Python 3', cpp: 'C++', java: 'Java', c: 'C', javascript: 'JavaScript' };
    const langName = langLabels[language] || language;

    analyzeBtn.disabled = true;
    statusEl.textContent = `Analyzing with AI (${langName})… Please wait.`;
    statusEl.className = 'cs-ai-status';
    resetAnalysis();

    try {
        const res = await fetch(`${API_BASE}/api/coding-scenario/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ question, testCases, language })
        });
        const data = await res.json();

        if (!data.ok || !data.solutions || data.solutions.length === 0) {
            throw new Error(data.message || 'No solutions returned');
        }

        analyzedSolutions = data.solutions;

        // Show preview
        const preview = document.getElementById('solutionsPreview');
        preview.style.display = 'block';
        document.getElementById('solutionsCount').textContent = `AI generated ${data.solutions.length} reference solution(s) in ${langName} — click to expand`;
        document.getElementById('solutionsCode').textContent = data.solutions.join('\n\n// ── Solution 2 ──\n\n');

        statusEl.textContent = `✅ Analysis complete — ${data.solutions.length} solution(s) stored. Ready to publish!`;
        statusEl.className = 'cs-ai-status analyzed';

        document.getElementById('publishBtn').disabled = false;
        document.getElementById('footerStatus').textContent = 'Challenge is ready to publish!';
    } catch (err) {
        console.error('AI analyze error:', err);

        statusEl.textContent = `❌ Analysis failed: ${err.message}`;
        statusEl.className = 'cs-ai-status error';
    }

    analyzeBtn.disabled = false;
    updateAnalyzeButton();
}

// ── Publish ───────────────────────────────────────────────────────
async function publishChallenge() {
    const title = document.getElementById('gameTitle').value.trim();
    const description = document.getElementById('gameDescription').value.trim();
    const difficulty = document.getElementById('gameDifficulty').value;
    const category = document.getElementById('gameCategory').value.trim();
    const language = document.getElementById('gameLanguage').value;

    if (!title || !description) { alert('Please fill in the challenge title and description.'); return; }
    if (testCases.length === 0) { alert('Please add at least one test case.'); return; }
    if (!analyzedSolutions) { alert('Please click "Analyze with AI" before publishing.'); return; }

    window.gameDataToPublish = {
        title,
        type: 'coding-scenario',
        difficulty,
        brief: category ? `${category} · ${difficulty}` : difficulty,
        description,
        testCases: testCases.map(({ input, expected }) => ({ input, expected })),
        codingSolutions: analyzedSolutions,
        language,
        totalPoints: testCases.length * 20,
        published: true
    };

    showPublishModal();
}

// Called by publish modal
async function publishGameWithClasses(targetClasses, isPublic) {
    if (!window.gameDataToPublish) { alert('Error: No game data to publish'); return; }

    const gameData = { ...window.gameDataToPublish, targetClasses, isPublic };

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
            showProfessionalPopup('Published!', 'Coding challenge published successfully. Students will find it in Code Practice.');

        } else {
            alert('Failed to publish: ' + data.message);
        }
    } catch (err) {
        console.error('Publish error:', err);
        alert('Failed to publish challenge');
    }
}

// ── Helpers ───────────────────────────────────────────────────────
function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Watch for form changes ────────────────────────────────────────
document.getElementById('gameTitle').addEventListener('input', () => { updateAnalyzeButton(); resetAnalysis(); });
document.getElementById('gameDescription').addEventListener('input', () => { updateAnalyzeButton(); resetAnalysis(); });

// ── Init ──────────────────────────────────────────────────────────
addTestCase(); // Start with one empty test case
renderTestCases();
updateAnalyzeButton();
