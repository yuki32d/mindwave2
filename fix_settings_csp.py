import re

# Read the file
with open('student-settings.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline onclick handlers
content = re.sub(r' onclick="[^"]*"', '', content)

# Remove the inline script block (lines 456-593)
# Find the script block and replace it with external script reference
script_pattern = r'<script>\s*const currentUserEmail.*?</script>\s*<script src="chatbot\.js"></script>'
replacement = '<script src="student-settings.js"></script>\n    <script src="chatbot.js"></script>'
content = re.sub(script_pattern, replacement, content, flags=re.DOTALL)

# Write the modified content
with open('student-settings.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully removed inline scripts and event handlers from student-settings.html")
