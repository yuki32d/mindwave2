// Free-Form Code Editor with Auto Line Numbering
// Replaces the line-by-line input system with a real code editor

document.addEventListener('DOMContentLoaded', function () {
    const codeEditorContainer = document.getElementById('codeEditor');

    if (codeEditorContainer) {
        // Replace the existing code editor with a free-form editor
        codeEditorContainer.innerHTML = `
            <div class="free-code-editor">
                <div class="line-numbers" id="lineNumbers">
                    <div class="line-num">1</div>
                </div>
                <textarea 
                    class="code-textarea" 
                    id="codeTextarea" 
                    placeholder="Start typing your code here..."
                    spellcheck="false"
                ></textarea>
            </div>
        `;

        const textarea = document.getElementById('codeTextarea');
        const lineNumbers = document.getElementById('lineNumbers');

        // Update line numbers when content changes
        function updateLineNumbers() {
            const lines = textarea.value.split('\n');
            const lineCount = lines.length;

            // Generate line numbers
            let lineNumbersHTML = '';
            for (let i = 1; i <= lineCount; i++) {
                lineNumbersHTML += `<div class="line-num">${i}</div>`;
            }
            lineNumbers.innerHTML = lineNumbersHTML;

            // Sync scroll
            lineNumbers.scrollTop = textarea.scrollTop;
        }

        // Handle Enter key to maintain indentation
        textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                // Get current line
                const cursorPosition = this.selectionStart;
                const textBeforeCursor = this.value.substring(0, cursorPosition);
                const currentLine = textBeforeCursor.split('\n').pop();

                // Count leading spaces/tabs for indentation
                const indentMatch = currentLine.match(/^[\s\t]*/);
                const indent = indentMatch ? indentMatch[0] : '';

                // Insert newline with same indentation
                setTimeout(() => {
                    const start = this.selectionStart;
                    const before = this.value.substring(0, start);
                    const after = this.value.substring(start);
                    this.value = before + indent + after;
                    this.selectionStart = this.selectionEnd = start + indent.length;
                    updateLineNumbers();
                }, 0);
            }

            // Handle Tab key for indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                const spaces = '    '; // 4 spaces

                // Insert tab (4 spaces)
                this.value = this.value.substring(0, start) + spaces + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + spaces.length;
                updateLineNumbers();
            }
        });

        // Update line numbers on input
        textarea.addEventListener('input', updateLineNumbers);

        // Sync scroll between textarea and line numbers
        textarea.addEventListener('scroll', function () {
            lineNumbers.scrollTop = this.scrollTop;
        });

        // Initialize
        updateLineNumbers();

        // Update stats when code changes
        textarea.addEventListener('input', function () {
            const lines = this.value.split('\n').filter(line => line.trim() !== '');
            const linesWritten = lines.length;

            // Update sidebar stats if they exist
            const linesElement = document.getElementById('linesWritten');
            if (linesElement) {
                linesElement.innerHTML = `${linesWritten}<span class="stat-trend">↑</span>`;
            }

            // Update correct count display
            const correctCountElement = document.getElementById('correctCount');
            if (correctCountElement) {
                correctCountElement.textContent = linesWritten;
            }
        });

        // Make the editor globally accessible for checking code
        window.getStudentCode = function () {
            return textarea.value;
        };

        window.setStudentCode = function (code) {
            textarea.value = code;
            updateLineNumbers();
        };

        // COMPATIBILITY LAYER: Make textarea work with existing button handlers
        // Create a proxy element that acts like the old 'line1' input
        const proxyElement = document.createElement('input');
        proxyElement.id = 'line1';
        proxyElement.style.display = 'none';

        // Sync proxy with textarea
        Object.defineProperty(proxyElement, 'value', {
            get: () => textarea.value,
            set: (val) => {
                textarea.value = val;
                updateLineNumbers();
            }
        });

        Object.defineProperty(proxyElement, 'placeholder', {
            get: () => textarea.placeholder,
            set: (val) => { textarea.placeholder = val; }
        });

        // Forward events from proxy to textarea
        const originalAddEventListener = proxyElement.addEventListener.bind(proxyElement);
        proxyElement.addEventListener = function (event, handler, options) {
            textarea.addEventListener(event, handler, options);
            originalAddEventListener(event, handler, options);
        };

        // Share classList
        proxyElement.classList = textarea.classList;

        // Add proxy to DOM
        document.body.appendChild(proxyElement);

        console.log('Free-form code editor initialized with compatibility layer');
    }
});
