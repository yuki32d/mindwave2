// Antigravity Code Editor - Main JavaScript
// Handles Monaco Editor, File Management, AI Chat, and Terminal

let editor;
let currentFile = 'hello.py';
let currentLanguage = 'python';

// File templates
const fileTemplates = {
    'hello.py': '# Python Hello World\nprint("Hello, World!")\n\n# Try writing your own code below:\n',
    'hello.js': '// JavaScript Hello World\nconsole.log("Hello, World!");\n\n// Try writing your own code below:\n',
    'hello.java': '// Java Hello World\npublic class Hello {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    'hello.cpp': '// C++ Hello World\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    'hello.cs': '// C# Hello World\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n',
    'hello.go': '// Go Hello World\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
    'hello.rs': '// Rust Hello World\nfn main() {\n    println!("Hello, World!");\n}\n',
    'hello.php': '<?php\n// PHP Hello World\necho "Hello, World!";\n?>\n',
    'hello.rb': '# Ruby Hello World\nputs "Hello, World!"\n\n# Try writing your own code below:\n',
    'hello.swift': '// Swift Hello World\nprint("Hello, World!")\n\n// Try writing your own code below:\n'
};

const languageMap = {
    'python': 'python',
    'javascript': 'javascript',
    'java': 'java',
    'cpp': 'cpp',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
    'swift': 'swift'
};

const languageNames = {
    'python': 'Python',
    'javascript': 'JavaScript',
    'java': 'Java',
    'cpp': 'C++',
    'csharp': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'php': 'PHP',
    'ruby': 'Ruby',
    'swift': 'Swift'
};

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: fileTemplates['hello.py'],
        language: 'python',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        minimap: { enabled: true },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        wordBasedSuggestions: true,
        tabSize: 4,
        insertSpaces: true,
        formatOnPaste: true,
        formatOnType: true,
        autoIndent: 'full',
        bracketPairColorization: { enabled: true },
        guides: {
            bracketPairs: true,
            indentation: true
        }
    });

    // Update cursor position in status bar
    editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        document.querySelector('.status-right .status-item').innerHTML =
            `<span>Ln ${position.lineNumber}, Col ${position.column}</span>`;
    });

    console.log('Monaco Editor initialized successfully!');
});

// File Tree Click Handler
document.getElementById('fileTree').addEventListener('click', function (e) {
    const fileItem = e.target.closest('.file-item');
    if (fileItem) {
        const fileName = fileItem.dataset.file;
        const lang = fileItem.dataset.lang;
        openFile(fileName, lang);

        // Update active state
        document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
        fileItem.classList.add('active');
    }
});

// Open File Function
function openFile(fileName, lang) {
    currentFile = fileName;
    currentLanguage = lang;

    // Update editor content and language
    if (editor) {
        editor.setValue(fileTemplates[fileName] || '// Start coding...\n');
        monaco.editor.setModelLanguage(editor.getModel(), languageMap[lang]);
    }

    // Update breadcrumb
    document.getElementById('currentFileName').textContent = fileName;

    // Update status bar language
    document.getElementById('statusLanguage').innerHTML = `<span>${languageNames[lang]}</span>`;

    // Update tab
    updateTab(fileName);

    // Clear terminal
    addTerminalLine('📁 File opened: ' + fileName, 'success');
}

// Update Tab
function updateTab(fileName) {
    const tabBar = document.getElementById('tabBar');
    const existingTab = Array.from(tabBar.children).find(tab => tab.dataset.file === fileName);

    if (!existingTab) {
        const icon = document.querySelector(`.file-item[data-file="${fileName}"] .file-icon`).textContent;
        const tab = document.createElement('div');
        tab.className = 'tab active fade-in';
        tab.dataset.file = fileName;
        tab.innerHTML = `
            <span class="tab-icon">${icon}</span>
            <span>${fileName}</span>
            <span class="tab-close">×</span>
        `;

        // Remove active from other tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tabBar.appendChild(tab);
    } else {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        existingTab.classList.add('active');
    }
}

// Run Code Button
document.getElementById('runButton').addEventListener('click', function () {
    const code = editor.getValue();
    addTerminalLine('', '');
    addTerminalLine('▶ Running ' + currentFile + '...', 'prompt');

    setTimeout(() => {
        if (code.includes('Hello, World!') || code.includes('Hello World')) {
            addTerminalLine('Hello, World!', 'output');
            addTerminalLine('✓ Program executed successfully!', 'success');
        } else {
            addTerminalLine('Output: (Your code output would appear here)', 'output');
            addTerminalLine('✓ Code executed!', 'success');
        }
    }, 500);
});

// Add Terminal Line
function addTerminalLine(text, type = '') {
    const terminal = document.getElementById('terminal');
    const line = document.createElement('div');
    line.className = 'terminal-line fade-in';

    if (type) {
        line.classList.add('terminal-' + type);
    }

    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Folder toggle
document.querySelector('.folder-item').addEventListener('click', function () {
    this.classList.toggle('expanded');
});

// AI Chat Toggle
document.getElementById('aiToggle').addEventListener('click', function () {
    const chatPanel = document.getElementById('aiChatPanel');
    const isVisible = chatPanel.style.display !== 'none';
    chatPanel.style.display = isVisible ? 'none' : 'flex';
    this.classList.toggle('active');
});

// Close Chat Button
document.getElementById('closeChatBtn').addEventListener('click', function () {
    document.getElementById('aiChatPanel').style.display = 'none';
    document.getElementById('aiToggle').classList.remove('active');
});

// Chat Input Handler
document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const message = this.value.trim();
        if (message) {
            sendChatMessage(message);
            this.value = '';
        }
    }
});

// Send Chat Message
function sendChatMessage(message) {
    const chatMessages = document.getElementById('chatMessages');

    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-message';
    userMessage.innerHTML = `
        <div class="message-header">
            <div class="message-avatar user">👤</div>
            <span>You</span>
        </div>
        <div class="message-content user-message">${message}</div>
    `;
    chatMessages.appendChild(userMessage);

    // Simulate AI response
    setTimeout(() => {
        const aiMessage = document.createElement('div');
        aiMessage.className = 'chat-message';
        aiMessage.innerHTML = `
            <div class="message-header">
                <div class="message-avatar ai">🤖</div>
                <span>MindWave AI</span>
            </div>
            <div class="message-content">
                ${generateAIResponse(message)}
            </div>
        `;
        chatMessages.appendChild(aiMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Generate AI Response (Simple simulation)
function generateAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return 'Hello! How can I help you with your coding today? 👋';
    } else if (lowerMessage.includes('error') || lowerMessage.includes('bug')) {
        return 'I can help you debug! Can you share the error message or describe what\'s not working? 🔍';
    } else if (lowerMessage.includes('how') || lowerMessage.includes('what')) {
        return 'Great question! For ' + languageNames[currentLanguage] + ', I recommend checking the syntax and making sure all variables are properly defined. Need more specific help? 💡';
    } else {
        return 'I\'m here to help! For ' + languageNames[currentLanguage] + ' coding assistance, feel free to ask about syntax, best practices, or debugging. What would you like to know? 🚀';
    }
}
