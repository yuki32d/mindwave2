import os
import re
from pathlib import Path

# Directory containing the HTML files
directory = r"c:\Users\rajku\OneDrive\Desktop\mindwave"

# Get all faculty-create HTML files
files = list(Path(directory).glob("faculty-create-*.html"))

for file_path in files:
    print(f"Processing: {file_path.name}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if file has the old header structure
    if '<header class="topbar">' not in content:
        print(f"  - Already updated")
        continue
    
    # Remove the entire header section
    content = re.sub(
        r'        <!-- Header -->.*?</header>\r?\n\r?\n',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Extract the title and description from main-header
    title_match = re.search(r'<h1[^>]*>(.*?)</h1>', content)
    desc_match = re.search(r'<div class="main-header">.*?<p>(.*?)</p>', content, re.DOTALL)
    
    title = title_match.group(1) if title_match else "Create Tool"
    description = desc_match.group(1) if desc_match else "Create your interactive tool"
    
    # Replace the main-header structure
    new_header = f'''                <!-- Back Button -->
                <div style="margin-bottom: 24px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px; font-weight: 500;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: #f5f7ff;">{title}</h1>
                        <p style="color: #9ea4b6; font-size: 16px;">{description}</p>
                    </div>
                    <div>
                        <button class="primary-btn" id="publishBtn">🚀 Publish'''
    
    # Find the publish button text
    publish_match = re.search(r'<button class="primary-btn" id="publishBtn">([^<]+)</button>', content)
    publish_text = publish_match.group(1) if publish_match else "🚀 Publish"
    
    new_header = f'''                <!-- Back Button -->
                <div style="margin-bottom: 24px;">
                    <button class="secondary-btn" onclick="window.history.back()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 8px; color: #f5f7ff; cursor: pointer; font-size: 14px; font-weight: 500;">← Back</button>
                </div>

                <!-- Page Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                    <div>
                        <h1 style="font-size: 36px; font-weight: 700; margin-bottom: 8px; color: #f5f7ff;">{title}</h1>
                        <p style="color: #9ea4b6; font-size: 16px;">{description}</p>
                    </div>
                    <div>
                        <button class="primary-btn" id="publishBtn">{publish_text}</button>
                    </div>
                </div>
'''
    
    content = re.sub(
        r'                <div class="main-header">.*?                </div>\r?\n',
        new_header,
        content,
        flags=re.DOTALL
    )
    
    # Write back
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    
    print(f"  ✓ Updated")

print("\nAll files updated!")
