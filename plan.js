const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    LevelFormat, PageBreak, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');

const BRAND = "1A1A2E";
const ACCENT = "4361EE";
const GREEN = "2D9A5F";
const AMBER = "D97706";
const RED = "DC2626";
const LIGHT_BLUE = "EEF2FF";
const LIGHT_GREEN = "ECFDF5";
const LIGHT_AMBER = "FFFBEB";
const LIGHT_RED = "FEF2F2";
const MID_GRAY = "6B7280";
const BORDER_GRAY = "E5E7EB";

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 160 },
        children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: BRAND })]
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 280, after: 120 },
        children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: ACCENT })]
    });
}

function h3(text) {
    return new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: BRAND })]
    });
}

function body(text, opts = {}) {
    return new Paragraph({
        spacing: { before: 60, after: 80 },
        children: [new TextRun({ text, size: 22, font: "Arial", color: "374151", ...opts })]
    });
}

function bullet(text, bold_prefix = null) {
    const children = [];
    if (bold_prefix) {
        children.push(new TextRun({ text: bold_prefix + " ", bold: true, size: 22, font: "Arial", color: BRAND }));
        children.push(new TextRun({ text, size: 22, font: "Arial", color: "374151" }));
    } else {
        children.push(new TextRun({ text, size: 22, font: "Arial", color: "374151" }));
    }
    return new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { before: 40, after: 40 },
        children
    });
}

function code(text) {
    return new Paragraph({
        spacing: { before: 80, after: 80 },
        indent: { left: 720 },
        children: [new TextRun({ text, size: 18, font: "Courier New", color: "1F2937" })]
    });
}

function spacer(before = 120) {
    return new Paragraph({ spacing: { before, after: 0 }, children: [new TextRun("")] });
}

function divider() {
    return new Paragraph({
        spacing: { before: 160, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY } },
        children: [new TextRun("")]
    });
}

function phaseTable(phases) {
    const rows = phases.map(([badge, badgeColor, bgColor, title, desc]) =>
        new TableRow({
            children: [
                new TableCell({
                    width: { size: 1400, type: WidthType.DXA },
                    borders,
                    shading: { fill: bgColor, type: ShadingType.CLEAR },
                    margins: { top: 100, bottom: 100, left: 140, right: 140 },
                    verticalAlign: "center",
                    children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: badge, bold: true, size: 18, font: "Arial", color: badgeColor })]
                    })]
                }),
                new TableCell({
                    width: { size: 7960, type: WidthType.DXA },
                    borders,
                    shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
                    margins: { top: 100, bottom: 100, left: 160, right: 160 },
                    children: [
                        new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: title, bold: true, size: 22, font: "Arial", color: BRAND })] }),
                        new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: desc, size: 20, font: "Arial", color: MID_GRAY })] })
                    ]
                })
            ]
        })
    );

    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 7960],
        rows
    });
}

function infoBox(title, lines, bgColor, titleColor) {
    const children = [
        new Paragraph({ spacing: { before: 0, after: 80 }, children: [new TextRun({ text: title, bold: true, size: 22, font: "Arial", color: titleColor })] }),
        ...lines.map(l => new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: l, size: 20, font: "Arial", color: "374151" })] }))
    ];
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({ borders, shading: { fill: bgColor, type: ShadingType.CLEAR }, margins: { top: 160, bottom: 160, left: 200, right: 200 }, children })] })]
    });
}

function twoColTable(headers, rows, colWidths) {
    const headerRow = new TableRow({
        children: headers.map((h, i) => new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            borders,
            shading: { fill: BRAND, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial", color: "FFFFFF" })] })]
        }))
    });
    const dataRows = rows.map((row, ri) => new TableRow({
        children: row.map((cell, i) => new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            borders,
            shading: { fill: ri % 2 === 0 ? "FFFFFF" : "F9FAFB", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: "Arial", color: "374151" })] })]
        }))
    }));
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [headerRow, ...dataRows]
    });
}

const doc = new Document({
    numbering: {
        config: [
            { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
            { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
        ]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 36, bold: true, font: "Arial", color: BRAND },
                paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 28, bold: true, font: "Arial", color: ACCENT },
                paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 }
            },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        headers: {
            default: new Header({
                children: [new Paragraph({
                    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ACCENT } },
                    spacing: { before: 0, after: 160 },
                    children: [
                        new TextRun({ text: "MindWave", bold: true, size: 20, font: "Arial", color: ACCENT }),
                        new TextRun({ text: "   |   LeetCode-Style Platform — Implementation Plan", size: 20, font: "Arial", color: MID_GRAY })
                    ]
                })]
            })
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    border: { top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY } },
                    spacing: { before: 120, after: 0 },
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({ text: "Page ", size: 18, font: "Arial", color: MID_GRAY }),
                        new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: MID_GRAY }),
                        new TextRun({ text: " of ", size: 18, font: "Arial", color: MID_GRAY }),
                        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: MID_GRAY }),
                    ]
                })]
            })
        },
        children: [

            // ── COVER ──
            spacer(600),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 },
                children: [new TextRun({ text: "MINDWAVE", bold: true, size: 52, font: "Arial", color: ACCENT })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [new TextRun({ text: "LeetCode-Style Platform", size: 36, font: "Arial", color: BRAND })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 400 },
                children: [new TextRun({ text: "Full Implementation Plan", size: 28, font: "Arial", color: MID_GRAY })]
            }),
            new Table({
                width: { size: 5040, type: WidthType.DXA },
                columnWidths: [1680, 1680, 1680],
                rows: [new TableRow({
                    children: [
                        new TableCell({
                            borders, shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5 Phases", bold: true, size: 22, font: "Arial", color: ACCENT })] })]
                        }),
                        new TableCell({
                            borders, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PM2 Cluster", bold: true, size: 22, font: "Arial", color: GREEN })] })]
                        }),
                        new TableCell({
                            borders, shading: { fill: LIGHT_AMBER, type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "10 CPU Cores", bold: true, size: 22, font: "Arial", color: AMBER })] })]
                        }),
                    ]
                })]
            }),
            spacer(800),

            // ── PAGE BREAK ──
            new Paragraph({ children: [new PageBreak()] }),

            // ── SECTION 1: CURRENT STATUS ──
            h1("1. Where You Are Right Now"),
            body("Before building, it's important to understand exactly what MindWave already has and what needs to change."),
            spacer(),

            infoBox("Current strengths", [
                "✓  Online code editor (Python 3 supported)",
                "✓  Problem viewer with description, examples, constraints",
                "✓  Hint system (3 progressive hints per problem)",
                "✓  XP system and difficulty badges (Easy / Medium / Hard)",
                "✓  AI tab integrated into the IDE panel",
                "✓  Visualize button for code tracing",
                "✓  Test case runner (currently print-output based)",
                "✓  PM2 cluster mode across 10 CPU cores — 0% error rate at load",
                "✓  Cloudflare WAF protecting the frontend",
            ], LIGHT_GREEN, GREEN),

            spacer(),

            infoBox("The single biggest gap to fix", [
                "✗  Problems check print() output, not function return values.",
                "     LeetCode calls your function with inputs and checks what it returns.",
                "     Fixing this is Phase 1 and unlocks everything else.",
                "",
                "✗  No Docker/sandbox isolation — user code runs directly on your server.",
                "✗  No hidden test cases — users can see all test inputs.",
                "✗  No async submission queue — execution blocks your request thread.",
            ], LIGHT_RED, RED),

            divider(),

            // ── SECTION 2: HOW LEETCODE WORKS ──
            h1("2. How LeetCode Actually Works — The Full Architecture"),
            body("Understanding every layer before building prevents costly rewrites. Here is the complete flow from user keypress to verdict."),
            spacer(),

            h2("2.1  The Submission Lifecycle"),
            phaseTable([
                ["STEP 1", ACCENT, LIGHT_BLUE, "User writes code in the editor", "Monaco editor in the browser. User picks language. Code is just a string. Nothing executes client-side."],
                ["STEP 2", ACCENT, LIGHT_BLUE, "POST /submit hits your API", "Payload: { problem_id, language, code, user_id }. Backend receives it and immediately creates a queued job. Returns job_id instantly — does not wait."],
                ["STEP 3", RED, LIGHT_RED, "Job picked up by execution worker", "A dedicated worker process pulls the job from the queue. Injects user code + test harness into an isolated Docker container."],
                ["STEP 4", RED, LIGHT_RED, "Container runs with strict limits", "CPU quota, memory cap, time limit, no network, read-only filesystem. Code executes. stdout/stderr captured. Container destroyed."],
                ["STEP 5", GREEN, LIGHT_GREEN, "Judge compares return values", "Test harness calls the user's function with each test input. Return value compared to expected. Pass/fail recorded per test case."],
                ["STEP 6", AMBER, LIGHT_AMBER, "Frontend polls for result", "Client calls GET /result/:job_id every 500ms. When status changes from 'pending' to 'done', result is shown: verdict, runtime, memory, percentile."],
                ["STEP 7", GREEN, LIGHT_GREEN, "XP awarded on acceptance", "If all test cases pass: XP calculated (difficulty × speed bonus). Stored to user profile. Streak updated. Stats recalculated."],
            ]),

            spacer(),
            h2("2.2  The Key Difference — Return Values vs Print"),
            body("This is the most important concept. Your current platform:"),
            spacer(60),
            infoBox("Current (print-based) — WRONG approach", [
                "User writes:  print('Hello, World!')",
                "Your server captures stdout and compares it to expected string.",
                "Problem: cannot test logic, cannot pass inputs, cannot handle edge cases.",
            ], LIGHT_AMBER, AMBER),
            spacer(),
            infoBox("LeetCode-style (return-based) — CORRECT approach", [
                "User writes:  def twoSum(nums, target): return [0, 1]",
                "Your harness calls:  result = twoSum([2,7,11,15], 9)",
                "Judge checks:  result == [0, 1]   →   PASS",
                "Hidden cases:  twoSum([3,3], 6) == [0,1]   →   PASS",
                "Benefit: test any inputs, hide expected answers, real algorithmic judging.",
            ], LIGHT_GREEN, GREEN),

            spacer(),
            h2("2.3  Verdict Types"),
            twoColTable(
                ["Verdict", "Trigger", "What to show user"],
                [
                    ["Accepted", "All test cases pass, within time + memory limits", "Runtime ms, memory MB, percentile rank"],
                    ["Wrong Answer", "Return value doesn't match expected output", "Which test case failed, got vs expected"],
                    ["Time Limit Exceeded", "Container killed after N seconds (usually 1–2s)", "'Your solution is too slow — O(n²) detected?'"],
                    ["Memory Limit Exceeded", "Container OOM killed (usually 256 MB)", "Memory used before kill"],
                    ["Runtime Error", "Code threw an exception during execution", "Error message + line number from stderr"],
                    ["Compile Error", "Syntax error (Java, C++, Go)", "Full compile output"],
                ],
                [2200, 4200, 2960]
            ),

            divider(),

            // ── SECTION 3: SYSTEM COMPONENTS ──
            h1("3. Every System Component You Need to Build"),

            h2("3.1  Code Execution Engine"),
            body("This is the hardest part. Two options:"),
            spacer(),
            infoBox("Option A — Judge0 (Recommended)", [
                "Open-source, self-hostable execution engine. Used by Codeforces, HackerEarth, and others.",
                "Supports 60+ languages. Has a REST API. Handles Docker sandboxing internally.",
                "GitHub: github.com/judge0/judge0",
                "Deploy: docker-compose up judge0   →   POST to http://localhost:2358/submissions",
            ], LIGHT_BLUE, ACCENT),
            spacer(),
            infoBox("Option B — Custom Docker Sandbox (More control)", [
                "You call Docker directly from Node.js. More work but fully customisable.",
                "docker run --rm --memory=128m --cpus=0.5 --network none --read-only python:3.11-slim python /tmp/sol.py",
                "Write user code to a temp file → mount into container → capture stdout/stderr → destroy container.",
            ], "F8F8F8", MID_GRAY),

            spacer(),
            h2("3.2  Problem Schema"),
            body("Every problem in your database needs this structure:"),
            spacer(60),
            twoColTable(
                ["Field", "Description", "Example"],
                [
                    ["id", "URL-safe slug", "two-sum"],
                    ["title", "Display name", "Two Sum"],
                    ["difficulty", "easy / medium / hard", "easy"],
                    ["description", "Full problem markdown", "Given an array of integers..."],
                    ["starter_code", "JSON map of language → template", "{ python: 'def twoSum(self, nums, target):\\n    pass' }"],
                    ["test_cases (visible)", "Shown to user in Examples panel", "[{ input: [[2,7,11,15], 9], expected: [0,1] }]"],
                    ["test_cases (hidden)", "Never shown — used for judging", "10–100 edge cases including empty, duplicates, negatives"],
                    ["test_harness", "Wrapper code that calls user function", "result = twoSum(nums, target)\\nassert result == expected"],
                    ["time_limit_ms", "Per-test-case execution budget", "2000"],
                    ["memory_limit_mb", "Container memory cap", "256"],
                    ["xp_reward", "XP on acceptance", "10 / 30 / 100 for easy / medium / hard"],
                ],
                [1200, 3600, 4560]
            ),

            spacer(),
            h2("3.3  Async Submission Queue"),
            body("Never block your API thread waiting for code to execute. Use a job queue."),
            spacer(60),
            infoBox("Stack: Bull (or BullMQ) + Redis", [
                "npm install bullmq ioredis",
                "",
                "1. POST /submit  →  create job in Bull queue  →  return { job_id } immediately",
                "2. Worker process picks up job  →  calls Judge0 or Docker sandbox",
                "3. Worker writes result to Redis/DB keyed by job_id",
                "4. GET /result/:job_id  →  read from Redis  →  return { status, verdict, runtime, ... }",
                "5. Frontend polls every 500ms until status !== 'pending'",
            ], LIGHT_BLUE, ACCENT),

            spacer(),
            h2("3.4  Runtime Percentile System"),
            body("'Faster than 87% of Python submissions' — this is what makes LeetCode feel rewarding."),
            spacer(60),
            twoColTable(
                ["Step", "What happens"],
                [
                    ["1. Store all accepted runtimes", "On every accepted submission: INSERT INTO runtimes (problem_id, language, runtime_ms, user_id)"],
                    ["2. Calculate percentile on new submission", "SELECT COUNT(*) FROM runtimes WHERE problem_id = ? AND language = ? AND runtime_ms > {user_runtime}"],
                    ["3. Return as percentage", "percentile = (count_slower / total_submissions) * 100"],
                    ["4. Show in results panel", "'Your solution beats 87% of Python submissions'"],
                ],
                [2400, 6960]
            ),

            spacer(),
            h2("3.5  XP and Progression System"),
            twoColTable(
                ["Trigger", "XP reward", "Notes"],
                [
                    ["First acceptance — Easy", "10 XP", "Subsequent re-solves: 0 XP"],
                    ["First acceptance — Medium", "30 XP", ""],
                    ["First acceptance — Hard", "100 XP", ""],
                    ["Speed bonus (top 10% runtime)", "+20% XP", "Applied to first acceptance only"],
                    ["Daily streak (solve 1 per day)", "+5 XP/day", "Resets at midnight UTC"],
                    ["Complete a topic (e.g. all Arrays)", "+50 XP", "One-time badge reward"],
                ],
                [3000, 2400, 3960]
            ),

            divider(),

            // ── SECTION 4: INFRASTRUCTURE ──
            h1("4. Your Infrastructure Setup (PM2 + 10 Cores)"),
            body("You already have a solid infrastructure foundation. Here is how to configure it properly for a judging platform."),
            spacer(),

            h2("4.1  PM2 Ecosystem Config"),
            body("Replace ad-hoc pm2 start commands with a single ecosystem file:"),
            spacer(60),
            new Paragraph({ spacing: { before: 80, after: 4 }, children: [new TextRun({ text: "ecosystem.config.js", bold: true, size: 20, font: "Arial", color: BRAND })] }),
            code("module.exports = {"),
            code("  apps: ["),
            code("    {"),
            code("      name: 'mindwave-api',"),
            code("      script: './src/server.js',"),
            code("      instances: 'max',        // uses all 10 cores automatically"),
            code("      exec_mode: 'cluster',"),
            code("      watch: false,"),
            code("      max_memory_restart: '500M',"),
            code("      env_production: {"),
            code("        NODE_ENV: 'production',"),
            code("        PORT: 3000"),
            code("      }"),
            code("    },"),
            code("    {"),
            code("      name: 'mindwave-worker',  // submission queue worker"),
            code("      script: './src/worker.js',"),
            code("      instances: 4,             // 4 workers = 4 concurrent executions"),
            code("      exec_mode: 'cluster',"),
            code("      max_memory_restart: '300M'"),
            code("    }"),
            code("  ]"),
            code("}"),
            spacer(),
            infoBox("IMPORTANT: Switch from restart to reload", [
                "pm2 restart app   →   kills all workers, brief downtime on every deploy",
                "pm2 reload ecosystem.config.js   →   cycles workers one by one, zero downtime",
                "",
                "This one change means your 500 users never experience a deploy gap.",
            ], LIGHT_AMBER, AMBER),

            spacer(),
            h2("4.2  Cloudflare + Loader.io Fix"),
            body("To run Loader.io tests against your real frontend (bypassing Cloudflare bot protection):"),
            spacer(60),
            twoColTable(
                ["Method", "How", "When to use"],
                [
                    ["Pause Cloudflare", "Dashboard → Overview → Pause Cloudflare on Site (bottom right)", "Quick one-off tests. Re-enable after."],
                    ["Whitelist Loader.io UA", "Security → WAF → Rule: if User-Agent contains 'loaderio' → Allow", "Ongoing testing. Persistent."],
                    ["Hit origin directly", "Use your server's raw IP in Loader.io, bypassing CF entirely", "Load testing backend only (ignores CDN layer)"],
                ],
                [1800, 4200, 3360]
            ),

            spacer(),
            h2("4.3  Target Load Test Configuration"),
            body("Your real production target is 500 concurrent users, not 4000. Configure Loader.io accordingly:"),
            spacer(60),
            twoColTable(
                ["Setting", "Value", "Why"],
                [
                    ["Max clients", "500", "Your actual expected peak concurrency"],
                    ["Ramp duration", "2 minutes", "Gradual ramp reveals bottlenecks before peak"],
                    ["Test duration", "5 minutes at peak", "Sustain load to surface memory leaks or connection exhaustion"],
                    ["Target endpoint", "/api/submit (POST)", "This will be your heaviest endpoint — judge it at load"],
                    ["Expected avg response", "< 300ms", "With 10 cores at 500 users you should hit this comfortably"],
                ],
                [2400, 2400, 4560]
            ),

            divider(),

            // ── SECTION 5: PHASED ROADMAP ──
            h1("5. Phased Build Roadmap"),
            body("Build in this exact order. Each phase delivers value and unblocks the next."),
            spacer(),

            h2("Phase 1 — Judge0 Integration + Function-Based Problems"),
            infoBox("Goal: make the core judging work correctly", [
                "Estimated time: 1–2 weeks",
                "",
                "1. Deploy Judge0 via docker-compose on your server",
                "2. Redefine all problems to use function signatures (not print)",
                "3. Write test harnesses per language that call the user's function with known inputs",
                "4. Update your submission endpoint to send code + harness to Judge0",
                "5. Return pass/fail per test case to the frontend",
                "6. Replace the current 'run and check stdout' logic entirely",
            ], LIGHT_RED, RED),
            spacer(),

            h2("Phase 2 — Async Submission Queue"),
            infoBox("Goal: never block the API thread on code execution", [
                "Estimated time: 3–5 days",
                "",
                "1. Install BullMQ + Redis (or use Redis you may already have for sessions)",
                "2. POST /submit creates a job → returns job_id immediately (< 50ms response)",
                "3. Worker process picks up job → calls Judge0 → writes result to Redis",
                "4. GET /result/:job_id reads from Redis → returns current status",
                "5. Frontend polls every 500ms, shows spinner, then result on completion",
                "6. Add job timeout (kill stale jobs after 30s)",
            ], LIGHT_AMBER, AMBER),
            spacer(),

            h2("Phase 3 — Hidden Test Cases + Verdict System"),
            infoBox("Goal: real LeetCode-style judging with proper verdicts", [
                "Estimated time: 1 week",
                "",
                "1. Add hidden test cases to every problem (aim for 20+ per problem)",
                "2. Implement all verdict types: AC, WA, TLE, MLE, RE, CE",
                "3. For WA: show which test case failed (input if visible, 'hidden test case' if not)",
                "4. For TLE: show runtime at kill point",
                "5. For RE: show error message + line number",
                "6. Never expose hidden test inputs to the user",
            ], LIGHT_BLUE, ACCENT),
            spacer(),

            h2("Phase 4 — Runtime Percentile Tracking"),
            infoBox("Goal: 'you beat X% of submissions' — the dopamine hit", [
                "Estimated time: 3–4 days",
                "",
                "1. Create runtimes table: (problem_id, language, runtime_ms, memory_mb, user_id, created_at)",
                "2. On every accepted submission: insert row",
                "3. Calculate percentile: (count where runtime > user_runtime) / total * 100",
                "4. Show in result panel alongside verdict",
                "5. Build per-problem stats page showing runtime distribution histogram",
            ], LIGHT_GREEN, GREEN),
            spacer(),

            h2("Phase 5 — Leaderboard + Streaks + XP Tiers"),
            infoBox("Goal: engagement, retention, competition", [
                "Estimated time: 1–2 weeks",
                "",
                "1. Global leaderboard: rank users by total XP, problems solved, streak",
                "2. Per-problem leaderboard: fastest accepted solutions per language",
                "3. Daily streak: track last_solved_date per user, reset if gap > 1 day",
                "4. XP tiers: Bronze (0–500), Silver (500–2000), Gold (2000–5000), Platinum (5000+)",
                "5. Topic badges: complete all problems in a topic tag → earn badge",
                "6. Daily challenge: one highlighted problem per day, bonus XP if solved that day",
            ], LIGHT_BLUE, ACCENT),

            divider(),

            // ── SECTION 6: QUICK WINS ──
            h1("6. Quick Wins — Do These Immediately"),
            spacer(),
            twoColTable(
                ["Change", "Time needed", "Impact"],
                [
                    ["Switch pm2 restart → pm2 reload in all deploy scripts", "5 minutes", "Zero downtime deploys for 500 users"],
                    ["Add instances: 'max' to ecosystem.config.js", "10 minutes", "Automatically use all 10 cores on any server size"],
                    ["Set up Cloudflare WAF rule for Loader.io UA", "15 minutes", "Unlocks frontend load testing"],
                    ["Rerun Loader.io test at 500 clients (not 4000)", "30 minutes", "Get your real baseline numbers"],
                    ["Add max_memory_restart: '500M' to PM2 config", "5 minutes", "Auto-recovery from memory leaks under load"],
                ],
                [3600, 1800, 3960]
            ),

            divider(),

            // ── SECTION 7: TECH STACK SUMMARY ──
            h1("7. Full Recommended Tech Stack"),
            twoColTable(
                ["Layer", "Technology", "Notes"],
                [
                    ["Frontend editor", "Monaco Editor (@monaco-editor/react)", "Same editor as VS Code. Syntax highlighting, multi-language."],
                    ["Code execution", "Judge0 (self-hosted)", "docker-compose on your server. REST API."],
                    ["Submission queue", "BullMQ + Redis", "Async job processing. 4 worker instances."],
                    ["Process manager", "PM2 cluster (already in use)", "10 instances: max. Switch to reload."],
                    ["Database", "Your existing DB + runtimes table", "Add runtimes and jobs tables."],
                    ["Cache / queue store", "Redis", "Job state + session store + rate limiting."],
                    ["WAF / CDN", "Cloudflare (already in use)", "Whitelist Loader.io for testing."],
                    ["Load testing", "Loader.io (already in use)", "Retest at 500 clients. Target /api/submit."],
                ],
                [1800, 2800, 4760]
            ),

            spacer(400),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 80 },
                children: [new TextRun({ text: "Start with Phase 1. Everything else follows.", bold: true, size: 26, font: "Arial", color: ACCENT })]
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: "Your backend is already solid. The judging engine is all that stands between MindWave and a real LeetCode alternative.", size: 22, font: "Arial", color: MID_GRAY })]
            }),

        ]
    }]
});

Packer.toBuffer(doc).then(buf => {
    fs.writeFileSync("/home/claude/mindwave_implementation_plan.docx", buf);
    console.log("Done");
});