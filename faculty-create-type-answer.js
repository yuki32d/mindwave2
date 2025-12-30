// Faculty Create Type Answer - Smart Text Input with Auto-Grading
let correctAnswers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updatePreview();
});

function setupEventListeners() {
    // Add answer button
    document.getElementById('addAnswerBtn').addEventListener('click', addAnswer);

    // Enter key to add answer
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAnswer();
        }
    });

    // Update preview on input changes
    document.getElementById('questionText').addEventListener('input', updatePreview);
    document.getElementById('hintText').addEventListener('input', updatePreview);
    document.getElementById('charLimit').addEventListener('input', updatePreview);
    document.getElementById('showHint').addEventListener('change', updatePreview);

    // Character count for preview input
    document.getElementById('previewInput').addEventListener('input', updateCharCount);

    // Test answer button
    document.getElementById('testAnswerBtn').addEventListener('click', testAnswer);

    // Publish button
    document.getElementById('publishBtn').addEventListener('click', publishQuestion);
}

function addAnswer() {
    const input = document.getElementById('answerInput');
    const answerText = input.value.trim();

    if (!answerText) {
        alert('Please enter an answer');
        return;
    }

    if (correctAnswers.includes(answerText)) {
        alert('This answer is already added');
        return;
    }

    correctAnswers.push(answerText);
    input.value = '';
    updateAnswersList();
}

function updateAnswersList() {
    const container = document.getElementById('answersList');

    if (correctAnswers.length === 0) {
        container.innerHTML = '<p style="color: #9ea4b6; text-align: center; margin-top: 20px;">No answers added yet</p>';
        return;
    }

    container.innerHTML = correctAnswers.map((answer, index) => `
        <div class="list-item" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span style="flex: 1; font-family: monospace; color: #00D9FF;">"${answer}"</span>
            <button onclick="removeAnswer(${index})" style="background: rgba(255,59,48,0.2); color: #ff3b30; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">Remove</button>
        </div>
    `).join('');
}

function removeAnswer(index) {
    correctAnswers.splice(index, 1);
    updateAnswersList();
}

function updatePreview() {
    const questionText = document.getElementById('questionText').value.trim();
    const hintText = document.getElementById('hintText').value.trim();
    const showHint = document.getElementById('showHint').checked;

    document.getElementById('previewQuestion').textContent = questionText || 'Your question will appear here';
    document.getElementById('previewHint').textContent = (showHint && hintText) ? `💡 Hint: ${hintText}` : '';

    updateCharCount();
}

function updateCharCount() {
    const input = document.getElementById('previewInput');
    const charLimit = parseInt(document.getElementById('charLimit').value) || 0;
    const currentLength = input.value.length;
    const countDisplay = document.getElementById('previewCharCount');

    if (charLimit > 0) {
        countDisplay.textContent = `${currentLength} / ${charLimit} characters`;
        countDisplay.style.color = currentLength > charLimit ? '#ff3b30' : '#9ea4b6';

        // Enforce limit
        if (currentLength > charLimit) {
            input.value = input.value.substring(0, charLimit);
        }
    } else {
        countDisplay.textContent = '';
    }
}

function testAnswer() {
    const studentAnswer = document.getElementById('previewInput').value;
    const resultDiv = document.getElementById('testResult');

    if (!studentAnswer.trim()) {
        alert('Please type an answer to test');
        return;
    }

    if (correctAnswers.length === 0) {
        alert('Please add at least one correct answer first');
        return;
    }

    const isCorrect = checkAnswer(studentAnswer);

    resultDiv.style.display = 'block';
    if (isCorrect) {
        resultDiv.style.background = 'rgba(16, 185, 129, 0.2)';
        resultDiv.style.border = '2px solid rgba(16, 185, 129, 0.4)';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">✅</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 4px;">Correct!</div>
                    <div style="color: #9ea4b6; font-size: 14px;">Your answer matches: "${isCorrect}"</div>
                </div>
            </div>
        `;
    } else {
        resultDiv.style.background = 'rgba(255, 59, 48, 0.2)';
        resultDiv.style.border = '2px solid rgba(255, 59, 48, 0.4)';
        resultDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 32px;">❌</span>
                <div>
                    <div style="font-size: 18px; font-weight: 700; color: #ff3b30; margin-bottom: 4px;">Incorrect</div>
                    <div style="color: #9ea4b6; font-size: 14px;">Expected: ${correctAnswers.join(' or ')}</div>
                </div>
            </div>
        `;
    }
}

function checkAnswer(studentAnswer) {
    const caseSensitive = document.getElementById('caseSensitive').checked;
    const trimWhitespace = document.getElementById('trimWhitespace').checked;

    let processedAnswer = studentAnswer;
    if (trimWhitespace) {
        processedAnswer = processedAnswer.trim().replace(/\s+/g, ' ');
    }

    for (const correctAnswer of correctAnswers) {
        let processedCorrect = correctAnswer;
        if (trimWhitespace) {
            processedCorrect = processedCorrect.trim().replace(/\s+/g, ' ');
        }

        const match = caseSensitive
            ? processedAnswer === processedCorrect
            : processedAnswer.toLowerCase() === processedCorrect.toLowerCase();

        if (match) {
            return correctAnswer;
        }
    }

    return false;
}

async function publishQuestion() {
    const title = document.getElementById('questionTitle').value.trim();
    const questionText = document.getElementById('questionText').value.trim();

    if (!title) {
        alert('Please enter a question title');
        return;
    }

    if (!questionText) {
        alert('Please enter the question text');
        return;
    }

    if (correctAnswers.length === 0) {
        alert('Please add at least one correct answer');
        return;
    }

    const questionData = {
        title,
        questionText,
        correctAnswers,
        charLimit: parseInt(document.getElementById('charLimit').value) || null,
        caseSensitive: document.getElementById('caseSensitive').checked,
        trimWhitespace: document.getElementById('trimWhitespace').checked,
        showHint: document.getElementById('showHint').checked,
        hintText: document.getElementById('hintText').value.trim(),
        type: 'type-answer',
        createdAt: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(questionData)
        });

        if (response.ok) {
            const result = await response.json();
            alert('✅ Question published successfully!');
            window.location.href = 'admin.html';
        } else {
            throw new Error('Failed to publish question');
        }
    } catch (error) {
        console.error('Error publishing question:', error);
        alert('❌ Error publishing question. Please try again.');
    }
}
