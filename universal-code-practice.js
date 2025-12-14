// Universal Code Practice - Works with ALL programming languages
document.addEventListener('DOMContentLoaded', function () {
    // Dynamic Angel Speech Messages
    const angelMessages = [
        "Hi! I'm your AI coding assistant! 🤖",
        "Let's learn to code together! 💻",
        "AI makes coding fun and easy! ✨",
        "I'm here to help you succeed! 🌟",
        "Keep coding, you're doing great! 🚀",
        "Mistakes are how we learn! 💡",
        "Let's debug this together! 🔧",
        "You're becoming a great coder! 🎯",
        "Practice makes perfect! 💪",
        "Every expert was once a beginner! 🌱"
    ];

    let messageIndex = 0;
    const angelSpeech = document.getElementById('angelSpeech');

    function changeAngelMessage() {
        messageIndex = (messageIndex + 1) % angelMessages.length;
        if (angelSpeech) {
            angelSpeech.textContent = angelMessages[messageIndex];
        }
    }

    // Change angel message every 5 seconds
    setInterval(changeAngelMessage, 5000);

    let currentLanguage = 'python';
    let correctCount = 0;
    let hintCount = 0;
    let hintLevel = 0;

    const languageConfig = {
        python: { icon: '🐍', name: 'Python', challenge: 'Print "Hello World"', description: 'Write a Python program that prints "Hello World" to the console.', placeholder: '# Start typing your code here...', correctAnswer: ['print("Hello World")', "print('Hello World')"] },
        javascript: { icon: '💛', name: 'JavaScript', challenge: 'Console Log "Hello World"', description: 'Write JavaScript code that logs "Hello World" to the console.', placeholder: '// Start typing your code here...', correctAnswer: ['console.log("Hello World")', "console.log('Hello World')"] },
        java: { icon: '☕', name: 'Java', challenge: 'Print "Hello World"', description: 'Write a Java program that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['System.out.println("Hello World")'] },
        cpp: { icon: '⚡', name: 'C++', challenge: 'Output "Hello World"', description: 'Write C++ code that outputs "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['cout << "Hello World"', 'std::cout << "Hello World"'] },
        csharp: { icon: '🎮', name: 'C#', challenge: 'Print "Hello World"', description: 'Write C# code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['Console.WriteLine("Hello World")'] },
        sql: { icon: '🗄️', name: 'SQL', challenge: 'Select "Hello World"', description: 'Write SQL that selects "Hello World".', placeholder: '-- Start typing your code here...', correctAnswer: ['SELECT "Hello World"', "SELECT 'Hello World'"] },
        typescript: { icon: '📘', name: 'TypeScript', challenge: 'Console Log "Hello World"', description: 'Write TypeScript code that logs "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['console.log("Hello World")', "console.log('Hello World')"] },
        go: { icon: '🔵', name: 'Go', challenge: 'Print "Hello World"', description: 'Write Go code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['fmt.Println("Hello World")'] },
        rust: { icon: '🦀', name: 'Rust', challenge: 'Print "Hello World"', description: 'Write Rust code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['println!("Hello World")'] },
        php: { icon: '🐘', name: 'PHP', challenge: 'Echo "Hello World"', description: 'Write PHP code that echoes "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['echo "Hello World"', "echo 'Hello World'"] },
        swift: { icon: '🍎', name: 'Swift', challenge: 'Print "Hello World"', description: 'Write Swift code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['print("Hello World")'] },
        kotlin: { icon: '🤖', name: 'Kotlin', challenge: 'Print "Hello World"', description: 'Write Kotlin code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['println("Hello World")'] },
        ruby: { icon: '💎', name: 'Ruby', challenge: 'Puts "Hello World"', description: 'Write Ruby code that outputs "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['puts "Hello World"', "puts 'Hello World'"] },
        dart: { icon: '🎯', name: 'Dart', challenge: 'Print "Hello World"', description: 'Write Dart code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['print("Hello World")'] },
        r: { icon: '📊', name: 'R', challenge: 'Print "Hello World"', description: 'Write R code that prints "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['print("Hello World")'] },
        scala: { icon: '🔴', name: 'Scala', challenge: 'Print "Hello World"', description: 'Write Scala code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['println("Hello World")'] },
        perl: { icon: '🐪', name: 'Perl', challenge: 'Print "Hello World"', description: 'Write Perl code that prints "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['print "Hello World"'] },
        lua: { icon: '🌙', name: 'Lua', challenge: 'Print "Hello World"', description: 'Write Lua code that prints "Hello World".', placeholder: '-- Start typing your code here...', correctAnswer: ['print("Hello World")'] },
        haskell: { icon: '🎩', name: 'Haskell', challenge: 'Print "Hello World"', description: 'Write Haskell code that prints "Hello World".', placeholder: '-- Start typing your code here...', correctAnswer: ['putStrLn "Hello World"'] },
        elixir: { icon: '💧', name: 'Elixir', challenge: 'Print "Hello World"', description: 'Write Elixir code that prints "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['IO.puts "Hello World"'] },
        clojure: { icon: '🔷', name: 'Clojure', challenge: 'Print "Hello World"', description: 'Write Clojure code that prints "Hello World".', placeholder: '; Start typing your code here...', correctAnswer: ['(println "Hello World")'] },
        fsharp: { icon: '🔶', name: 'F#', challenge: 'Print "Hello World"', description: 'Write F# code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['printfn "Hello World"'] },
        objectivec: { icon: '📱', name: 'Objective-C', challenge: 'NSLog "Hello World"', description: 'Write Objective-C code that logs "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['NSLog(@"Hello World")'] },
        assembly: { icon: '⚙️', name: 'Assembly', challenge: 'Print "Hello World"', description: 'Write Assembly code that prints "Hello World".', placeholder: '; Start typing your code here...', correctAnswer: [] },
        bash: { icon: '🐚', name: 'Bash', challenge: 'Echo "Hello World"', description: 'Write Bash script that echoes "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['echo "Hello World"', "echo 'Hello World'"] },
        powershell: { icon: '💙', name: 'PowerShell', challenge: 'Write "Hello World"', description: 'Write PowerShell that outputs "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['Write-Host "Hello World"'] },
        groovy: { icon: '🎸', name: 'Groovy', challenge: 'Print "Hello World"', description: 'Write Groovy code that prints "Hello World".', placeholder: '// Start typing your code here...', correctAnswer: ['println "Hello World"'] },
        julia: { icon: '🔢', name: 'Julia', challenge: 'Print "Hello World"', description: 'Write Julia code that prints "Hello World".', placeholder: '# Start typing your code here...', correctAnswer: ['println("Hello World")'] },
        matlab: { icon: '📐', name: 'MATLAB', challenge: 'Display "Hello World"', description: 'Write MATLAB code that displays "Hello World".', placeholder: '% Start typing your code here...', correctAnswer: ['disp("Hello World")'] },
        vb: { icon: '🔵', name: 'Visual Basic', challenge: 'Print "Hello World"', description: 'Write VB code that prints "Hello World".', placeholder: "' Start typing your code here...", correctAnswer: ['Console.WriteLine("Hello World")'] }
    };

    // Language selector change
    document.getElementById('languageSelector').addEventListener('change', function (e) {
        currentLanguage = e.target.value;
        updateLanguage();
        clearCode();
        hintLevel = 0;
    });

    function updateLanguage() {
        const config = languageConfig[currentLanguage] || languageConfig.python;
        document.getElementById('languageBadge').textContent = `${config.icon} ${config.name}`;
        document.getElementById('challengeTitle').textContent = `📝 Challenge 1: ${config.challenge}`;
        document.getElementById('challengeDescription').textContent = config.description;
        document.getElementById('line1').placeholder = config.placeholder;
        showMessage(`Great! Let's learn ${config.name}! Start typing and I'll help you! 🚀`);
    }

    // Real-time code analysis
    document.getElementById('line1').addEventListener('input', function (e) {
        const code = e.target.value.trim();
        if (code) {
            analyzeCode(code, e.target);
        } else {
            e.target.classList.remove('error', 'correct');
        }
    });

    async function analyzeCode(code, input) {
        try {
            const response = await fetch('/api/analyze-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language: currentLanguage, hintLevel })
            });

            const data = await response.json();

            if (data.ok) {
                if (data.isCorrect) {
                    input.classList.remove('error');
                    input.classList.add('correct');
                    correctCount++;
                    document.getElementById('correctCount').textContent = correctCount;
                    celebrate();
                    showMessage(data.feedback);
                } else if (data.hasErrors) {
                    input.classList.add('error');
                    input.classList.remove('correct');
                    showMessage(data.feedback);
                } else {
                    input.classList.remove('error', 'correct');
                    showMessage(data.feedback);
                }
            }
        } catch (error) {
            console.error('Code analysis error:', error);
            analyzeCodeSimple(code, input);
        }
    }

    function analyzeCodeSimple(code, input) {
        const config = languageConfig[currentLanguage];
        if (!config) return;

        if (config.correctAnswer.includes(code)) {
            input.classList.remove('error');
            input.classList.add('correct');
            correctCount++;
            document.getElementById('correctCount').textContent = correctCount;
            celebrate();
            showMessage("Perfect! You're a natural! 🌟✨");
        } else {
            input.classList.add('error');
            input.classList.remove('correct');
            showMessage(`Keep trying! Check the syntax for ${config.name}. 💡`);
        }
    }

    function showMessage(message) {
        const messageEl = document.getElementById('assistantMessage');
        messageEl.textContent = message;
        messageEl.style.animation = 'none';
        setTimeout(() => {
            messageEl.style.animation = 'slideIn 0.5s ease-out';
        }, 10);
    }

    function celebrate() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        celebration.textContent = '🎉';
        document.body.appendChild(celebration);
        setTimeout(() => celebration.remove(), 1000);
    }

    // Hint button
    document.getElementById('hintBtn').addEventListener('click', function () {
        const config = languageConfig[currentLanguage];
        const hints = [
            `Think about the syntax for ${config.name}... 🤔`,
            `How do you output text in ${config.name}? 💡`,
            `The answer is: ${config.correctAnswer[0]} ✨`
        ];

        if (hintLevel < hints.length) {
            showMessage(hints[hintLevel]);
            hintLevel++;
            hintCount++;
            document.getElementById('hintCount').textContent = hintCount;
        } else {
            showMessage("You've got all the hints! Give it a try! 💪");
        }
    });

    // Run code button
    document.getElementById('runBtn').addEventListener('click', function () {
        const code = document.getElementById('line1').value.trim();
        const config = languageConfig[currentLanguage];

        if (config.correctAnswer.includes(code)) {
            showMessage(`✅ Output: Hello World\n\nPerfect execution! 🎯`);
        } else if (code) {
            showMessage("Let's fix the code first! Check the hints if you need help. 🔧");
        } else {
            showMessage("Write some code first! 📝");
        }
    });

    // Submit button
    document.getElementById('submitBtn').addEventListener('click', function () {
        const code = document.getElementById('line1').value.trim();
        const config = languageConfig[currentLanguage];

        if (config.correctAnswer.includes(code)) {
            celebrate();
            showMessage("🏆 Challenge Complete! Ready for the next one! 🚀");
        } else {
            showMessage("Not quite right yet. Keep trying or use a hint! 💪");
        }
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', clearCode);

    function clearCode() {
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`line${i}`);
            if (input) {
                input.value = '';
                input.classList.remove('error', 'correct');
            }
        }
        showMessage("Code cleared! Start fresh! 🆕");
    }

    // Question input
    document.getElementById('questionInput').addEventListener('keypress', async function (e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            const question = e.target.value;
            showMessage(`Great question! Let me think... 🤔`);

            try {
                const response = await fetch('/api/analyze-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question,
                        code: document.getElementById('line1').value,
                        language: currentLanguage
                    })
                });

                const data = await response.json();
                if (data.ok) {
                    setTimeout(() => showMessage(data.feedback), 1000);
                }
            } catch (error) {
                const config = languageConfig[currentLanguage];
                setTimeout(() => {
                    showMessage(`For ${config.name}, try: ${config.correctAnswer[0]} 💡`);
                }, 1000);
            }

            e.target.value = '';
        }
    });

    // Initialize
    updateLanguage();
});
