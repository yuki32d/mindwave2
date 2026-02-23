const fs = require('fs');
const path = require('path');

const files = [
    'faculty-create-type-answer.html',
    'faculty-create-pin-answer.html',
    'faculty-create-puzzle.html',
    'faculty-create-drop-pin.html',
    'faculty-create-brainstorm.html',
    'faculty-create-slide-classic.html',
    'faculty-create-slide-title-text.html',
    'faculty-create-slide-bullets.html',
    'faculty-create-slide-quote.html',
    'faculty-create-slide-big-media.html'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace inline onclick with id="backBtn"
    content = content.replace(
        /<button class="secondary-btn" onclick="window\.history\.back\(\)"/g,
        '<button class="secondary-btn" id="backBtn"'
    );

    // Add back button event listener after DOMContentLoaded
    content = content.replace(
        /document\.addEventListener\('DOMContentLoaded', \(\) => \{/g,
        `document.addEventListener('DOMContentLoaded', () => {
            // Back button event listener
            document.getElementById('backBtn').addEventListener('click', () => window.history.back());
            `
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${file}`);
});

console.log('\n✅ All files updated successfully!');
