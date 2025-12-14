// Generate all 50 language learning pages
import fs from 'fs';

const languages = {
    // Tier 1: Essential (10)
    python: { icon: '🐍', video: 'rfscVS0vtbw', name: 'Python' },
    javascript: { icon: '💛', video: 'PkZNo7MFNFg', name: 'JavaScript' },
    java: { icon: '☕', video: 'eIrMbAQSU34', name: 'Java' },
    'c++': { icon: '⚡', video: 'vLnPwxZdW4Y', name: 'C++' },
    'c#': { icon: '🎮', video: 'GhQdlIFylQ8', name: 'C#' },
    sql: { icon: '🗄️', video: 'HXV3zeQKqGY', name: 'SQL' },
    typescript: { icon: '📘', video: 'BwuLxPH8IDs', name: 'TypeScript' },
    go: { icon: '🔵', video: 'YS4e4q9oBaU', name: 'Go' },
    rust: { icon: '🦀', video: 'zF34dRivLOw', name: 'Rust' },
    php: { icon: '🐘', video: 'OK_JCtrrv-c', name: 'PHP' },

    // Tier 2: Popular (15)
    swift: { icon: '🍎', video: 'comQ1-x2a1Q', name: 'Swift' },
    kotlin: { icon: '🤖', video: 'F9UC9DY-vIU', name: 'Kotlin' },
    ruby: { icon: '💎', video: 't_ispmWmdjY', name: 'Ruby' },
    dart: { icon: '🎯', video: 'Ej_Pcr4uC2Q', name: 'Dart' },
    r: { icon: '📊', video: '_V8eKsto3Ug', name: 'R' },
    scala: { icon: '🔴', video: 'DzFt0YkZo8M', name: 'Scala' },
    perl: { icon: '🐪', video: 'WEghIXs8F6c', name: 'Perl' },
    'objective-c': { icon: '📱', video: 'Ja7_LkjJDM8', name: 'Objective-C' },
    lua: { icon: '🌙', video: 'iMacxZQMPXs', name: 'Lua' },
    haskell: { icon: 'λ', video: '02_H3LjqMr8', name: 'Haskell' },
    elixir: { icon: '💧', video: 'pBNOavRoNL0', name: 'Elixir' },
    clojure: { icon: '⚛️', video: 'ciGyHkDuPAE', name: 'Clojure' },
    'f#': { icon: '🔷', video: 'c7eNDJN758U', name: 'F#' },
    julia: { icon: '🔬', video: 'sE67bP2PnOo', name: 'Julia' },
    matlab: { icon: '📈', video: 'T_ekAD7U-wU', name: 'MATLAB' },

    // Tier 3: Specialized (15)
    assembly: { icon: '⚙️', video: 'wA2oMRmbrfo', name: 'Assembly' },
    bash: { icon: '🐚', video: 'oxuRxtrO2Ag', name: 'Bash' },
    powershell: { icon: '💻', video: 'IHrGresKu2w', name: 'PowerShell' },
    groovy: { icon: '🎸', video: 'B98jc8hdu9g', name: 'Groovy' },
    erlang: { icon: '📞', video: 'SOqQVoVai6s', name: 'Erlang' },
    ocaml: { icon: '🐫', video: 'MUcka_SvhLw', name: 'OCaml' },
    scheme: { icon: '🎨', video: 'AvgwKjTPMmM', name: 'Scheme' },
    racket: { icon: '🎾', video: '3T00X-u0p8E', name: 'Racket' },
    prolog: { icon: '🧠', video: 'SykxWpFwMGs', name: 'Prolog' },
    fortran: { icon: '🔢', video: '__2UgFNYgf8', name: 'Fortran' },
    cobol: { icon: '🏦', video: 'TBs7HXI76yU', name: 'COBOL' },
    ada: { icon: '🛡️', video: '3pEwxRKvN3M', name: 'Ada' },
    verilog: { icon: '🔌', video: 'PJGvZSlsLKs', name: 'Verilog' },
    vhdl: { icon: '💾', video: 'PJGvZSlsLKs', name: 'VHDL' },
    solidity: { icon: '⛓️', video: 'ipwxYa-F1uY', name: 'Solidity' },

    // Tier 4: Emerging (10)
    zig: { icon: '⚡', video: 'YXrb-DqsBNU', name: 'Zig' },
    nim: { icon: '👑', video: 'ndzlVRWqT2E', name: 'Nim' },
    crystal: { icon: '💎', video: 'DxFP-Wjqtsc', name: 'Crystal' },
    v: { icon: '🚀', video: 'BVCuZ7z7GMY', name: 'V' },
    mojo: { icon: '🔥', video: 'SEj5Mw8zLo8', name: 'Mojo' },
    carbon: { icon: '🌿', video: 'omrY53kbVoA', name: 'Carbon' },
    gleam: { icon: '✨', video: 'ceynSTa1dV4', name: 'Gleam' },
    roc: { icon: '🪨', video: 'ZnYa99QoznE', name: 'Roc' },
    ballerina: { icon: '🩰', video: 'My_uqtHvXV8', name: 'Ballerina' },
    pony: { icon: '🐴', video: 'zNMFJ7Jq9Oo', name: 'Pony' }
};

const template = (key, lang) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learn ${lang.name} - MindWave</title>
    <link rel="stylesheet" href="3d-depth-design.css">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        .learning-page{display:flex;height:calc(100vh - 60px);background:var(--bg-darker)}
        .video-container{flex:1;display:flex;flex-direction:column;padding:16px 24px;overflow-y:auto}
        .course-title{font-size:22px;font-weight:700;color:var(--text-white);margin:8px 0}
        .progress-section{display:flex;align-items:center;gap:12px;margin:16px 0}
        .progress-bar-small{width:200px;height:6px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden}
        .progress-fill-small{height:100%;background:linear-gradient(90deg,#00ff88,#00cc66);border-radius:999px;transition:width 0.3s ease}
        .progress-percentage{font-size:14px;font-weight:700;color:#00ff88}
        .video-wrapper{width:100%;margin-bottom:20px}
        .video-player{width:100%;height:600px;border:none;border-radius:12px}
        .video-source-tabs{display:flex;gap:8px;margin-bottom:12px}
        .video-tab{padding:8px 16px;height:40px;background:var(--card-dark);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:var(--text-gray);font-size:13px;cursor:pointer;transition:all 0.2s ease}
        .video-tab:hover{background:rgba(255,255,255,0.05);color:var(--text-white)}
        .video-tab.active{background:linear-gradient(135deg,var(--cyan-bright),var(--purple-bright));color:white;border-color:transparent}
        .module-info{background:var(--card-dark);border-radius:12px;padding:20px;margin-bottom:20px}
        .module-title{font-size:18px;font-weight:700;color:var(--text-white);margin-bottom:12px}
        .toggle-editor-btn{padding:12px 24px;background:linear-gradient(135deg,var(--cyan-bright),var(--purple-bright));color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s ease;margin-top:16px}
        .toggle-editor-btn:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,217,255,0.3)}
        .code-editor-section{background:var(--card-dark);border-radius:12px;padding:20px;margin-top:20px;display:none}
        .code-editor-section.active{display:block}
        .course-sidebar{width:200px;background:var(--card-darker);border-left:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;overflow-y:auto;font-size:12px}
        .sidebar-header{padding:20px;border-bottom:1px solid rgba(255,255,255,0.1)}
        .sidebar-title{font-size:16px;font-weight:700;color:var(--text-white)}
        .modules-list{flex:1;overflow-y:auto}
        .module-item{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:all 0.2s ease}
        .module-item:hover{background:rgba(255,255,255,0.05)}
        .module-item.active{background:rgba(0,217,255,0.1);border-left:3px solid var(--cyan-bright)}
        .module-number{font-size:11px;color:var(--text-gray);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .module-name{font-size:14px;font-weight:600;color:var(--text-white);margin-bottom:6px}
        .status-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px}
        .status-icon.completed{background:#00ff88;color:#000}
        .status-icon.active{background:var(--cyan-bright);color:#000}
        @media (max-width:1200px){.learning-page{flex-direction:column}.course-sidebar{width:100%;max-height:300px}}
    </style>
</head>
<body>
    <div class="app-shell">
        <header class="topbar">
            <div class="topbar-brand"><span>🌊</span><span>MindwaveIo</span></div>
            <div class="topbar-search"><span>🔍</span><input type="text" placeholder="Search lessons..."></div>
            <div class="topbar-actions">
                <span style="cursor:pointer" title="Notifications">🔔</span>
                <div class="profile-toggle"><span>👤</span><small>Account</small></div>
            </div>
        </header>
        <div class="learning-page">
            <div class="video-container">
                <div style="margin-bottom:16px">
                    <a href="student-languages.html" style="color:var(--text-gray);text-decoration:none;font-size:14px">← Back to Languages</a>
                    <h1 class="course-title">${lang.icon} Learn ${lang.name}</h1>
                    <p style="color:var(--text-gray);font-size:14px">Master ${lang.name} from basics to advanced</p>
                </div>
                <div class="progress-section">
                    <span style="font-size:13px;color:var(--text-gray)">Course Progress:</span>
                    <div class="progress-bar-small"><div class="progress-fill-small" style="width:0%"></div></div>
                    <span class="progress-percentage">0%</span>
                </div>
                <div class="video-source-tabs">
                    <button class="video-tab active" data-source="vimeo">📹 Vimeo</button>
                    <button class="video-tab" data-source="scrimba">💻 Scrimba Interactive</button>
                    <button class="video-tab" data-source="youtube">🎥 YouTube</button>
                </div>
                <div class="video-wrapper">
                    <iframe class="video-player" id="videoPlayer" src="https://player.vimeo.com/video/76979871?title=0&byline=0&portrait=0" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
                </div>
                <div class="module-info">
                    <div class="module-title">Module 1: ${lang.name} Basics</div>
                    <div style="display:flex;gap:20px;font-size:13px;color:var(--text-gray)">
                        <span>⏱️ 12:30</span>
                        <span>📚 Lesson 1 of 45</span>
                        <span>⭐ Beginner</span>
                    </div>
                </div>
                <button class="toggle-editor-btn">💻 Practice with Code Editor</button>
                <div class="code-editor-section" id="editor">
                    <div style="font-size:16px;font-weight:700;color:var(--text-white);margin-bottom:16px">💻 Interactive Code Editor</div>
                    <p style="color:var(--text-gray);margin-bottom:12px">Practice ${lang.name} coding here! Watch the video and try the examples.</p>
                    <div style="background:#1e1e1e;border-radius:8px;padding:16px;font-family:monospace;color:#d4d4d4;border:1px solid rgba(255,255,255,0.1);min-height:150px">
                        <p>// ${lang.name} code editor</p>
                        <p>// Practice along with the video!</p>
                    </div>
                </div>
            </div>
            <div class="course-sidebar">
                <div class="sidebar-header"><div class="sidebar-title">Course Content</div></div>
                <div class="modules-list">
                    <div class="module-item active">
                        <div class="module-number">MODULE 1</div>
                        <div class="module-name">${lang.name} Basics</div>
                        <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-gray)">
                            <div class="status-icon active">▶</div>
                            <span>⏱️ 12m</span>
                        </div>
                    </div>
                    <div class="module-item">
                        <div class="module-number">MODULE 2</div>
                        <div class="module-name">Variables and Data Types</div>
                        <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-gray)">
                            <span>⏱️ 15m</span>
                        </div>
                    </div>
                    <div class="module-item">
                        <div class="module-number">MODULE 3</div>
                        <div class="module-name">Functions and Methods</div>
                        <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-gray)">
                            <span>⏱️ 18m</span>
                        </div>
                    </div>
                    <div class="module-item">
                        <div class="module-number">MODULE 4</div>
                        <div class="module-name">Control Flow</div>
                        <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text-gray)">
                            <span>⏱️ 20m</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        // Video sources
        const videoSources = {
            vimeo: 'https://player.vimeo.com/video/76979871?title=0&byline=0&portrait=0',
            scrimba: 'https://player.vimeo.com/video/253989945?title=0&byline=0&portrait=0',
            youtube: 'https://player.vimeo.com/video/178485416?title=0&byline=0&portrait=0'
        };
        
        // Video source switching
        document.querySelectorAll('.video-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.video-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const source = this.getAttribute('data-source');
                if (videoSources[source]) {
                    document.getElementById('videoPlayer').src = videoSources[source];
                }
            });
        });
        
        // Progress tracking
        const COURSE_KEY='${key}_progress';
        function updateProgress(){const p=JSON.parse(localStorage.getItem(COURSE_KEY)||'{"percentage":0}');document.querySelector('.progress-fill-small').style.width=p.percentage+'%';document.querySelector('.progress-percentage').textContent=p.percentage+'%'}
        updateProgress();
        
        // Toggle editor
        document.querySelector('.toggle-editor-btn').addEventListener('click', function() {
            document.getElementById('editor').classList.toggle('active');
        });
    </script>
</body>
</html>`;

// Generate all pages
let count = 0;
Object.keys(languages).forEach(key => {
    const lang = languages[key];
    const filename = `student-learn-${key}.html`;
    fs.writeFileSync(filename, template(key, lang));
    count++;
    console.log(`✅ ${count}/50 Generated: ${filename}`);
});

console.log(`\n🎉 Successfully generated all ${count} language learning pages!`);
