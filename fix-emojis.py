#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix emoji encoding in faculty-settings.html"""

import re

# Read the file
with open('faculty-settings.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace corrupted emojis with proper ones
replacements = {
    '🎮': '🎮',  # Gamification Control
    '🎨': '🎨',  # Visual Command
    '🔒': '🔒',  # Security & Access
    '🔐': '🔐',  # Faculty Management
    '👥': '👥',  # Student Management
    '🎮': '🎮',  # Game Management
}

# Also fix any mojibake patterns
mojibake_fixes = {
    '=�ī': '🎮',
    '=�t': '🎨',
    '=���': '🔒',
    '=���': '🔐',
    '=���': '👥',
    '�ī': '🎮',
    '�t': '🎨',
    '���': '🔒',
}

for old, new in mojibake_fixes.items():
    content = content.replace(old, new)

# Write back with proper UTF-8 encoding
with open('faculty-settings.html', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print("✅ Fixed emoji encoding in faculty-settings.html")
