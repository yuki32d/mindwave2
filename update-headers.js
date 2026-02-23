const fs = require('fs');
const path = require('path');

const directory = 'c:\\Users\\rajku\\OneDrive\\Desktop\\mindwave';
const files = fs.readdirSync(directory).filter(f => f.startsWith('faculty-create-') && f.endsWith('.html'));

const excludeFiles = ['faculty-create-type-answer.html', 'faculty-create-pin-answer.html'];

files.forEach(filename => {
    if (excludeFiles.includes(filename)) {
        console.log(`Skipping: ${filename} (already updated)`);
        return;
    }

    const filepath = path.join(directory, filename);
    let content = fs.readFileSync(filepath, 'utf8');

    // Check if already updated
    if (!content.includes('<header class="topbar">')) {
        console.log(`Skipping: ${filename} (already updated)`);
        return;
    }

    console.log(`Processing: ${filename}`);

    // Extract title and description
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/);
    const descMatch = content.match(/<div class="main-header">[\s\S]*?<p>(.*?)<\/p>/);
    const publishMatch = content.match(/<button class="primary-btn" id="publishBtn">([^<]+)<\/button>/);

    const title = titleMatch ? titleMatch[1] : 'Create Tool';
    const description = descMatch ? descMatch[1] : 'Create your interactive tool';
    const publishText = publishMatch ? publishMatch[1] : '🚀 Publish';

    // Remove header
    content = content.replace(/        <!-- Header -->[\s\S]*?<\/header>\r?\n\r?\n/, '');

    // Replace main-header div
    const newHeader = `                <!-- Back Button -->
                <div style="margin-bottom: 24px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px; font-weight: 500;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: #f5f7ff;">${title}</h1>
                        <p style="color: #9ea4b6; font-size: 16px;">${description}</p>
                    </div>
                    <div>
                        <button class="primary-btn" id="publishBtn">${publishText}</button>
                    </div>
                </div>
`;

    content = content.replace(/                <div class="main-header">[\s\S]*?                <\/div>\r?\n/, newHeader);

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`  ✓ Updated`);
});

console.log('\nAll files updated!');
