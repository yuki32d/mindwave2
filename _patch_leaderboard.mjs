// _patch_leaderboard.mjs — injects you-badge CSS into student-leaderboard.html
import { readFileSync, writeFileSync } from 'fs';

const path = 'student-leaderboard.html';
const content = readFileSync(path, 'utf8');

if (content.includes('you-badge')) {
    console.log('ALREADY PATCHED'); process.exit(0);
}

// We insert just before </head>
if (!content.includes('</head>')) {
    console.error('MARKER </head> not found'); process.exit(1);
}

const css = `    <style>
        /* You badge on podium card */
        .podium-card { position: relative; }
        .you-badge {
            display: inline-block;
            background: #f59e0b;
            color: #1a1a2e;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .06em;
            padding: 2px 8px;
            border-radius: 20px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        /* You tag inside table/list row */
        .you-tag {
            display: inline-block;
            background: rgba(99,102,241,0.22);
            color: #818cf8;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 7px;
            border-radius: 20px;
            margin-left: 6px;
            vertical-align: middle;
            letter-spacing: .04em;
            text-transform: uppercase;
        }
    </style>
`;

// Replace FIRST occurrence of </head>
const patched = content.replace('</head>', css + '</head>');
writeFileSync(path, patched, 'utf8');
console.log('PATCHED OK');
