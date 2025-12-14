// Universal Language Learning Page Generator
// This script generates learning pages for all 50 programming languages

const fs = require('fs');
const path = require('path');

// Language configurations with resources
const languages = {
    python: {
        name: 'Python',
        icon: '🐍',
        video: 'rfscVS0vtbw',
        resources: [
            { title: 'Python Cheat Sheet (PDF)', url: 'https://perso.limsi.fr/pointal/_media/python:cours:mementopython3-english.pdf', icon: '📄', desc: 'Quick reference for Python syntax', download: true },
            { title: 'Official Python Documentation', url: 'https://docs.python.org/3/tutorial/index.html', icon: '📖', desc: 'Complete Python 3 tutorial' },
            { title: 'Practice Exercises', url: 'https://www.w3resource.com/python-exercises/', icon: '💻', desc: '100+ Python coding exercises' },
            { title: 'Quiz - Test Your Knowledge', url: 'https://www.programiz.com/python-programming/quiz', icon: '🎯', desc: 'Interactive Python quiz' },
            { title: 'Python Basics Guide', url: 'https://www.pythoncheatsheet.org/cheatsheet/basics', icon: '📚', desc: 'Comprehensive basics reference' }
        ]
    },
    javascript: {
        name: 'JavaScript',
        icon: '💛',
        video: 'PkZNo7MFNFg',
        resources: [
            { title: 'JavaScript Cheat Sheet (PDF)', url: 'https://websitesetup.org/javascript-cheat-sheet/', icon: '📄', desc: 'Quick reference for JS syntax' },
            { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', icon: '📖', desc: 'Complete JavaScript guide' },
            { title: 'JavaScript30', url: 'https://javascript30.com/', icon: '💻', desc: '30 Day Vanilla JS Challenge' },
            { title: 'JS Quiz', url: 'https://www.w3schools.com/js/js_quiz.asp', icon: '🎯', desc: 'Test your JavaScript knowledge' }
        ]
    },
    java: {
        name: 'Java',
        icon: '☕',
        video: 'eIrMbAQSU34',
        resources: [
            { title: 'Java Cheat Sheet', url: 'https://introcs.cs.princeton.edu/java/11cheatsheet/', icon: '📄', desc: 'Java syntax reference' },
            { title: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/', icon: '📖', desc: 'Official Java tutorials' },
            { title: 'Java Exercises', url: 'https://www.w3resource.com/java-exercises/', icon: '💻', desc: 'Practice Java programming' },
            { title: 'Java Quiz', url: 'https://www.javatpoint.com/java-quiz', icon: '🎯', desc: 'Test your Java skills' }
        ]
    },
    // Add more languages as needed...
};

function generateLearningPage(langKey, config) {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learn ${config.name} - MindWave</title>
    <link rel="stylesheet" href="3d-depth-design.css">
    <style>
        /* Same styles as student-learn-python.html */
        .learning-container { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; height: calc(100vh - 200px); }
        .video-section { background: var(--card-dark); border-radius: 20px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; }
        .code-section { background: var(--card-dark); border-radius: 20px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; }
        .video-player { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; margin-bottom: 16px; }
        /* ... rest of styles ... */
    </style>
</head>
<body>
    <div class="app-shell">
        <header class="topbar">
            <div class="topbar-brand"><span>🌊</span><span>MindwaveIo</span></div>
            <div class="topbar-search"><span>🔍</span><input type="text" placeholder="Search lessons..."></div>
            <div class="topbar-actions">
                <span id="notificationBtn" style="cursor: pointer;" title="Notifications">🔔</span>
                <div class="profile-toggle" id="profileToggle"><span>👤</span><small>Account</small></div>
            </div>
        </header>

        <div class="layout" style="display: block;">
            <main style="padding: 24px 48px; max-width: 1800px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div>
                        <a href="student-languages.html" style="color: var(--text-gray); text-decoration: none; font-size: 14px;">← Back to Languages</a>
                        <h1 style="margin: 8px 0;">${config.icon} Learn ${config.name}</h1>
                        <p style="color: var(--text-gray); margin-top: 4px;">Master ${config.name} from basics to advanced</p>
                    </div>
                </div>

                <div class="progress-tracker">
                    <span style="font-weight: 700;">Course Progress:</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: 35%"></div>
                    </div>
                    <span style="font-weight: 700; color: var(--cyan-bright);">35%</span>
                </div>

                <div class="learning-container">
                    <div class="video-section">
                        <div class="lesson-info">
                            <div class="lesson-title">Module 1: ${config.name} Basics</div>
                            <div class="lesson-meta">
                                <span>⏱️ 12:30</span>
                                <span>📚 Lesson 3 of 45</span>
                                <span>⭐ Beginner</span>
                            </div>
                        </div>

                        <iframe class="video-player" 
                                src="https://www.youtube.com/embed/${config.video}" 
                                title="${config.name} Tutorial" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                        </iframe>

                        <div class="tabs">
                            <button class="tab active" data-tab="playlist">📋 Playlist</button>
                            <button class="tab" data-tab="notes">📝 Notes</button>
                            <button class="tab" data-tab="resources">📚 Resources</button>
                        </div>

                        <div class="tab-content active" data-content="playlist">
                            <div class="playlist">
                                <!-- Playlist items -->
                            </div>
                        </div>

                        <div class="tab-content" data-content="notes">
                            <div style="color: var(--text-gray); line-height: 1.6;">
                                <h3 style="color: var(--text-white); margin-bottom: 12px;">Key Takeaways:</h3>
                                <ul style="padding-left: 20px;">
                                    <li>Learn ${config.name} fundamentals</li>
                                    <li>Understand core concepts</li>
                                    <li>Practice with examples</li>
                                </ul>
                            </div>
                        </div>

                        <div class="tab-content" data-content="resources">
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${config.resources.map(r => `
                                <a href="${r.url}" target="_blank" ${r.download ? 'download' : ''} style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none; color: var(--cyan-bright); display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
                                    <span style="font-size: 20px;">${r.icon}</span>
                                    <div>
                                        <div style="font-weight: 600;">${r.title}</div>
                                        <div style="font-size: 12px; color: var(--text-gray);">${r.desc}</div>
                                    </div>
                                </a>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="code-section">
                        <!-- Code editor section -->
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script>
        // Real-time progress tracking
        const COURSE_KEY = '${langKey}_progress';
        
        function updateProgress() {
            const progress = JSON.parse(localStorage.getItem(COURSE_KEY) || '{"completed": 2, "total": 6, "percentage": 35}');
            document.querySelector('.progress-bar-fill').style.width = progress.percentage + '%';
            document.querySelector('.progress-tracker span:last-child').textContent = progress.percentage + '%';
        }

        function markLessonComplete() {
            const progress = JSON.parse(localStorage.getItem(COURSE_KEY) || '{"completed": 2, "total": 6, "percentage": 35}');
            if (progress.completed < progress.total) {
                progress.completed++;
                progress.percentage = Math.round((progress.completed / progress.total) * 100);
                localStorage.setItem(COURSE_KEY, JSON.stringify(progress));
                updateProgress();
                alert(\`🎉 Lesson completed! Progress: \${progress.percentage}%\`);
            }
        }

        updateProgress();

        // Add hover effect to resource links
        document.querySelectorAll('[data-content="resources"] a').forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(0, 217, 255, 0.1)';
                this.style.transform = 'translateX(4px)';
            });
            link.addEventListener('mouseleave', function() {
                this.style.background = 'rgba(255,255,255,0.05)';
                this.style.transform = 'translateX(0)';
            });
        });
    </script>
</body>
</html>`;

    return template;
}

// Generate pages for all languages
Object.keys(languages).forEach(langKey => {
    const config = languages[langKey];
    const html = generateLearningPage(langKey, config);
    const filename = `student-learn-${langKey}.html`;

    fs.writeFileSync(path.join(__dirname, filename), html);
    console.log(`✅ Generated: ${filename}`);
});

console.log('🎉 All language learning pages generated!');
