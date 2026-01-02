// Replace Robot Section with Stunning Sidebar
// This script replaces the laggy robot animation with a performance-optimized sidebar

document.addEventListener('DOMContentLoaded', function () {
    // Find the robot section
    const robotSection = document.querySelector('.robot-section');

    if (robotSection) {
        // Create the new stunning sidebar HTML
        const stunningSidebar = `
            <div class="stunning-sidebar">
                <!-- Floating Particles Background -->
                <div class="particles-bg">
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                </div>

                <!-- Progress Card -->
                <div class="progress-card">
                    <div class="card-header">
                        <span class="card-icon">📊</span>
                        <span class="card-title">Your Progress</span>
                    </div>
                    <div class="progress-stats">
                        <div class="stat-item">
                            <div class="stat-number" id="linesWritten">0<span class="stat-trend">↑</span></div>
                            <div class="stat-desc">Lines</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" id="accuracyPercent">0%<span class="stat-trend">✓</span></div>
                            <div class="stat-desc">Accuracy</div>
                        </div>
                    </div>
                </div>

                <!-- Tips Card -->
                <div class="tips-card">
                    <div class="card-header">
                        <span class="card-icon">💡</span>
                        <span class="card-title">Quick Tip</span>
                    </div>
                    <div class="tip-content">
                        <div class="tip-icon">💡</div>
                        <div class="tip-text" id="codingTip">Select a language to get started!</div>
                    </div>
                </div>

                <!-- Leaderboard Card -->
                <div class="leaderboard-card">
                    <div class="card-header">
                        <span class="card-icon">🏆</span>
                        <span class="card-title">Top Coders</span>
                    </div>
                    <div class="leaderboard-list" id="topCoders">
                        <div class="leader-item">
                            <span class="leader-rank">🥇</span>
                            <div class="leader-avatar">A</div>
                            <div class="leader-info">
                                <div class="leader-name">Loading...</div>
                                <div class="leader-score">--- pts</div>
                            </div>
                        </div>
                        <div class="leader-item">
                            <span class="leader-rank">🥈</span>
                            <div class="leader-avatar">B</div>
                            <div class="leader-info">
                                <div class="leader-name">Loading...</div>
                                <div class="leader-score">--- pts</div>
                            </div>
                        </div>
                        <div class="leader-item">
                            <span class="leader-rank">🥉</span>
                            <div class="leader-avatar">C</div>
                            <div class="leader-info">
                                <div class="leader-name">Loading...</div>
                                <div class="leader-score">--- pts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Replace the robot section content
        robotSection.innerHTML = stunningSidebar;

        // Initialize dynamic content
        initializeSidebarData();
    }
});

// Initialize sidebar with dynamic data
function initializeSidebarData() {
    // Update coding tips based on selected language
    updateCodingTip();

    // Fetch and display top coders
    fetchTopCoders();

    // Update progress stats
    updateProgressStats();
}

// Coding tips for different languages
const codingTips = {
    'python': 'Use meaningful variable names and follow PEP 8 style guide! 🐍',
    'javascript': 'Remember: let and const are block-scoped, var is function-scoped! ⚡',
    'java': 'Always close your resources and handle exceptions properly! ☕',
    'cpp': 'Use smart pointers to avoid memory leaks! 🚀',
    'csharp': 'Leverage LINQ for cleaner, more readable code! 💎',
    'default': 'Write clean, readable code. Your future self will thank you! ✨'
};

function updateCodingTip() {
    const languageSelector = document.getElementById('languageSelector');
    const tipElement = document.getElementById('codingTip');

    if (languageSelector && tipElement) {
        const selectedLanguage = languageSelector.value.toLowerCase();
        const tip = codingTips[selectedLanguage] || codingTips['default'];
        tipElement.textContent = tip;

        // Update tip when language changes
        languageSelector.addEventListener('change', function () {
            const newTip = codingTips[this.value.toLowerCase()] || codingTips['default'];
            tipElement.textContent = newTip;
        });
    }
}

// Fetch top coders from leaderboard
async function fetchTopCoders() {
    try {
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://mindwave2.onrender.com';
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/api/leaderboard?timeFilter=all&gameType=all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok && data.leaderboard && data.leaderboard.length > 0) {
            displayTopCoders(data.leaderboard.slice(0, 3));
        }
    } catch (error) {
        console.error('Error fetching top coders:', error);
    }
}

function displayTopCoders(topCoders) {
    const container = document.getElementById('topCoders');
    if (!container) return;

    const medals = ['🥇', '🥈', '🥉'];

    container.innerHTML = topCoders.map((coder, index) => `
        <div class="leader-item">
            <span class="leader-rank">${medals[index]}</span>
            <div class="leader-avatar">${coder.name.charAt(0).toUpperCase()}</div>
            <div class="leader-info">
                <div class="leader-name">${coder.name}</div>
                <div class="leader-score">${coder.totalPoints} pts</div>
            </div>
        </div>
    `).join('');
}

function updateProgressStats() {
    // Update stats when code is checked
    const correctCountElement = document.getElementById('correctCount');
    const linesWrittenElement = document.getElementById('linesWritten');
    const accuracyElement = document.getElementById('accuracyPercent');

    if (correctCountElement) {
        // Connect to existing stats
        const observer = new MutationObserver(function () {
            const correctLines = parseInt(correctCountElement.textContent) || 0;
            const totalLines = document.querySelectorAll('.code-input').length || 1;
            const accuracy = Math.round((correctLines / totalLines) * 100);

            if (linesWrittenElement) {
                linesWrittenElement.innerHTML = `${correctLines}<span class="stat-trend">↑</span>`;
            }

            if (accuracyElement) {
                accuracyElement.innerHTML = `${accuracy}%<span class="stat-trend">✓</span>`;
            }
        });

        observer.observe(correctCountElement, { childList: true, characterData: true, subtree: true });
    }
}
