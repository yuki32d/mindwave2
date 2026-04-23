// routes/codeExecution.js
// Execution engine: stitches student code + harness, calls Judge0, returns verdict

import fetch from 'node-fetch';

// Judge0 CE public endpoint (no auth needed for low-volume dev testing)
// Replace JUDGE0_URL in .env with your self-hosted URL when ready
const JUDGE0_URL = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY || null;

// Language IDs in Judge0
export const LANGUAGE_IDS = {
  python: 71,       // Python 3.8.1
  javascript: 63,   // Node.js 12.14.0
  java: 62,         // Java (OpenJDK 13.0.1)
  cpp: 54,          // C++ (GCC 9.2.0)
};

/**
 * Build the full submission source:
 *   [student code] + [test harness with injected test case]
 *
 * The harness calls the student's function with real inputs and prints
 * a structured result so we can parse pass/fail deterministically.
 *
 * @param {string} studentCode  - Raw code from Monaco editor
 * @param {string} harness      - Problem's harness template (has %%INPUT%% placeholder)
 * @param {*}      inputData    - The test case input to inject
 * @param {*}      expectedOutput - Used to build the assertion in harness
 * @param {string} language     - 'python' | 'javascript'
 */
export function buildFullSource(studentCode, harness, inputData, expectedOutput, language) {
  // Serialise the test data for embedding into source code
  const inputStr = JSON.stringify(inputData);
  const expectedStr = JSON.stringify(expectedOutput);

  // Replace placeholders in the harness template
  let fullSource = harness
    .replace(/%%STUDENT_CODE%%/g, studentCode)
    .replace(/%%INPUT_JSON%%/g, inputStr)
    .replace(/%%EXPECTED_JSON%%/g, expectedStr);

  return fullSource;
}

/**
 * Submit a single source to Judge0 and poll until complete.
 * Returns { status, stdout, stderr, time, memory }
 */
export async function runOnJudge0(sourceCode, languageId, timeLimitSec = 2, memoryLimitKb = 262144) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add RapidAPI auth header if using the hosted version
  if (JUDGE0_RAPIDAPI_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_RAPIDAPI_KEY;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }

  // Step 1: Create submission (wait=true means Judge0 polls internally — simpler for now)
  const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      cpu_time_limit: timeLimitSec,
      memory_limit: memoryLimitKb,
      enable_network: false,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Judge0 submission failed: HTTP ${createRes.status}`);
  }

  const result = await createRes.json();

  return {
    statusId: result.status?.id,
    statusDesc: result.status?.description,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    compileOutput: result.compile_output || '',
    time: parseFloat(result.time) || 0,     // seconds
    memory: result.memory || 0,              // KB
  };
}

/**
 * Run ALL test cases for a problem against the student's code.
 * Returns { verdict, runtimeMs, memoryKb, passedCount, totalCount, failedTestCase, errorMessage }
 *
 * Judge0 status IDs:
 *  3 = Accepted, 4 = Wrong Answer, 5 = TLE, 6 = Compile Error, 7-12 = Runtime Error
 */
export async function judgeSubmission({ studentCode, language, problem }) {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const harness = problem.testHarness?.[language];
  if (!harness) throw new Error(`No test harness defined for language: ${language}`);

  const timeLimitSec = (problem.timeLimitMs || 2000) / 1000;
  const memoryLimitKb = (problem.memoryLimitMb || 256) * 1024;

  let maxRuntimeMs = 0;
  let maxMemoryKb = 0;
  let passedCount = 0;
  const allCases = problem.hiddenTestCases || [];

  for (let i = 0; i < allCases.length; i++) {
    const tc = allCases[i];
    const fullSource = buildFullSource(
      studentCode,
      harness,
      tc.input,
      tc.expectedOutput,
      language
    );

    let result;
    try {
      result = await runOnJudge0(fullSource, languageId, timeLimitSec, memoryLimitKb);
    } catch (err) {
      return {
        verdict: 'Runtime Error',
        runtimeMs: 0,
        memoryKb: 0,
        passedCount,
        totalCount: allCases.length,
        errorMessage: err.message,
      };
    }

    maxRuntimeMs = Math.max(maxRuntimeMs, result.time * 1000);
    maxMemoryKb = Math.max(maxMemoryKb, result.memory);

    // Compile Error (status 6)
    if (result.statusId === 6) {
      return {
        verdict: 'Compile Error',
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
        passedCount,
        totalCount: allCases.length,
        errorMessage: result.compileOutput || result.stderr,
      };
    }

    // Runtime Error (status 7-12)
    if (result.statusId >= 7 && result.statusId <= 12) {
      return {
        verdict: 'Runtime Error',
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
        passedCount,
        totalCount: allCases.length,
        errorMessage: result.stderr || 'Runtime error occurred',
        failedTestCase: { index: i + 1, input: i < 2 ? tc.input : 'hidden' },
      };
    }

    // Time Limit Exceeded (status 5)
    if (result.statusId === 5) {
      return {
        verdict: 'Time Limit Exceeded',
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
        passedCount,
        totalCount: allCases.length,
        failedTestCase: { index: i + 1, input: i < 2 ? tc.input : 'hidden' },
      };
    }

    // Check output: our harness prints "PASS" or "FAIL:<got>"
    const output = (result.stdout || '').trim();
    if (output.startsWith('PASS')) {
      passedCount++;
    } else {
      // Wrong Answer
      const got = output.startsWith('FAIL:') ? output.slice(5) : output;
      return {
        verdict: 'Wrong Answer',
        runtimeMs: maxRuntimeMs,
        memoryKb: maxMemoryKb,
        passedCount,
        totalCount: allCases.length,
        failedTestCase: {
          index: i + 1,
          input: i < 2 ? tc.input : 'hidden',           // Only reveal first 2 inputs
          expected: i < 2 ? tc.expectedOutput : 'hidden',
          got: i < 2 ? got : 'hidden',
        },
      };
    }
  }

  // All test cases passed!
  return {
    verdict: 'Accepted',
    runtimeMs: maxRuntimeMs,
    memoryKb: maxMemoryKb,
    passedCount,
    totalCount: allCases.length,
  };
}
