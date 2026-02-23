const fs = require('fs');
const path = require('path');

const directory = 'c:\\Users\\rajku\\OneDrive\\Desktop\\mindwave';
const files = fs.readdirSync(directory).filter(f => f.startsWith('faculty-create-') && f.endsWith('.html'));

// Files already updated
const skipFiles = ['faculty-create-type-answer.html', 'faculty-create-pin-answer.html', 'faculty-create-slider.html'];

files.forEach(filename => {
    if (skipFiles.includes(filename)) {
        console.log(`Skipping: ${filename} (already updated)`);
        return;
    }

    const filepath = path.join(directory, filename);
    let content = fs.readFileSync(filepath, 'utf8');

    // Check if already updated (no header)
    if (!content.includes('<header class="topbar">') && !content.includes('<!-- Header -->')) {
        console.log(`Skipping: ${filename} (already updated)`);
        return;
    }

    console.log(`Processing: ${filename}`);

    // Extract title, description, and publish button text
    const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/s);
    const descMatch = content.match(/<p>(.*?)<\/p>/s);
    const publishMatch = content.match(/<button[^>]*class="primary-btn"[^>]*id="publishBtn"[^>]*>([^<]+)<\/button>/);

    const title = titleMatch ? titleMatch[1].trim() : 'Create Tool';
    const description = descMatch ? descMatch[1].trim() : 'Create your interactive tool';
    const publishText = publishMatch ? publishMatch[1].trim() : '🚀 Publish';

    // Remove everything from <body> to the start of actual content
    // Find where the first panel or grid starts
    const contentStartMatch = content.match(/(<div class="grid|<section class="panel|<!-- Question Configuration|<!-- Poll Configuration|<!-- Slide Content|<!-- Activity Settings|<!-- Board Settings|<!-- Brainstorm Configuration)/);

    if (!contentStartMatch) {
        console.log(`  ⚠️  Could not find content start marker`);
        return;
    }

    const contentStart = contentStartMatch.index;
    const beforeContent = content.substring(0, content.indexOf('<body'));
    const afterContent = content.substring(contentStart);

    // Build new structure
    const newContent = `${beforeContent}<body data-theme="dark">
    <div class="app-shell">
        <div style="max-width: 1400px; margin: 0 auto; padding: 24px;">
            <!-- Main Content -->
            <main>
                <!-- Back Button -->
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

                ${afterContent}`;

    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`  ✓ Updated`);
});

console.log('\nAll files updated!');
