// seed-problems.js
// Run once: node seed-problems.js
// Seeds the CodeProblem collection with starter problems

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindwave';

// ── Schema (must match server.js exactly) ────────────────────────────────────
const codeProblemSchema = new mongoose.Schema({
  slug:         { type: String, required: true, unique: true },
  title:        { type: String, required: true },
  difficulty:   { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  category:     { type: String, default: 'Arrays' },
  tags:         [{ type: String }],
  description:  { type: String, required: true },
  constraints:  [{ type: String }],
  starterCode: {
    python:     { type: String },
    javascript: { type: String },
  },
  examples: [{
    input:       { type: String },
    output:      { type: String },
    explanation: { type: String },
  }],
  hints: [{ type: String }],
  // Hidden test cases — never sent to frontend
  hiddenTestCases: [{
    input:          { type: mongoose.Schema.Types.Mixed },
    expectedOutput: { type: mongoose.Schema.Types.Mixed },
  }],
  // Harness template per language.
  // %%STUDENT_CODE%% → replaced with student code
  // %%INPUT_JSON%%   → replaced with JSON-serialised test input
  // %%EXPECTED_JSON%%→ replaced with JSON-serialised expected output
  testHarness: {
    python:     { type: String },
    javascript: { type: String },
  },
  timeLimitMs:    { type: Number, default: 2000 },
  memoryLimitMb:  { type: Number, default: 256 },
  xpReward:       { type: Number, default: 10 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

const CodeProblem = mongoose.model('CodeProblem', codeProblemSchema);

// ── Problems ─────────────────────────────────────────────────────────────────

const problems = [

  // ── 1. Hello World (warm-up) ────────────────────────────────────────────
  {
    slug: 'hello-world',
    title: 'Hello World',
    difficulty: 'Easy',
    category: 'Basics',
    tags: ['print', 'output'],
    description: 'Print "Hello, World!" to the output.',
    constraints: ['Use a print/console.log statement'],
    hints: [
      'Python uses print() to output text.',
      'The exact string must be: Hello, World!',
      'Make sure to include the comma and exclamation mark.',
    ],
    examples: [
      { input: '(none)', output: 'Hello, World!', explanation: 'Print the exact string.' },
    ],
    starterCode: {
      python: '# Write your solution here\n# Hint: use print() to output text\n',
      javascript: '// Write your solution here\n// Hint: use console.log() to output text\n',
    },
    hiddenTestCases: [
      { input: null, expectedOutput: 'Hello, World!' },
    ],
    testHarness: {
      python: `%%STUDENT_CODE%%

import io, contextlib, sys

buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    pass  # student code above already ran at import time

# For Hello World, capture what was already printed to stdout
# We re-run in a fresh exec to capture print output
import sys

_src = """%%STUDENT_CODE%%"""
_out = io.StringIO()
exec(compile(_src, "<student>", "exec"), {"__builtins__": __builtins__}, {})
`,
      javascript: `%%STUDENT_CODE%%`,
    },
    xpReward: 5,
  },

  // ── 2. Two Sum ────────────────────────────────────────────────────────────
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays',
    tags: ['array', 'hash-table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    constraints: [
      '2 ≤ nums.length ≤ 10^4',
      '-10^9 ≤ nums[i] ≤ 10^9',
      '-10^9 ≤ target ≤ 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      'A brute-force O(n²) solution checks every pair — try it first.',
      'Can you use a dictionary/hash map to reduce it to O(n)?',
      'As you iterate, store each number\'s index. Check if (target - current) is already stored.',
    ],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9.' },
      { input: 'nums = [3,2,4], target = 6',     output: '[1,2]', explanation: 'nums[1] + nums[2] = 2 + 4 = 6.' },
      { input: 'nums = [3,3], target = 6',        output: '[0,1]', explanation: 'nums[0] + nums[1] = 3 + 3 = 6.' },
    ],
    starterCode: {
      python: `def twoSum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {

}
`,
    },
    hiddenTestCases: [
      { input: { nums: [2, 7, 11, 15], target: 9 },  expectedOutput: [0, 1] },
      { input: { nums: [3, 2, 4],      target: 6 },  expectedOutput: [1, 2] },
      { input: { nums: [3, 3],         target: 6 },  expectedOutput: [0, 1] },
      { input: { nums: [1, 2, 3, 4],   target: 7 },  expectedOutput: [2, 3] },
      { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expectedOutput: [2, 4] },
      { input: { nums: [0, 4, 3, 0],   target: 0 },  expectedOutput: [0, 3] },
    ],
    testHarness: {
      python: `import json, sys

%%STUDENT_CODE%%

_data     = json.loads('%%INPUT_JSON%%')
_expected = json.loads('%%EXPECTED_JSON%%')
_nums     = _data["nums"]
_target   = _data["target"]

try:
    _result = twoSum(_nums, _target)
    # Sort both to allow any order
    if sorted(_result) == sorted(_expected):
        print("PASS")
    else:
        print("FAIL:" + json.dumps(_result))
except Exception as e:
    print("FAIL:EXCEPTION:" + str(e), file=sys.stderr)
    sys.exit(1)
`,
      javascript: `%%STUDENT_CODE%%

const _data     = JSON.parse('%%INPUT_JSON%%');
const _expected = JSON.parse('%%EXPECTED_JSON%%');
const _result   = twoSum(_data.nums, _data.target);

if (JSON.stringify([..._result].sort((a,b)=>a-b)) === JSON.stringify([..._expected].sort((a,b)=>a-b))) {
    console.log("PASS");
} else {
    console.log("FAIL:" + JSON.stringify(_result));
}
`,
    },
    xpReward: 10,
  },

  // ── 3. Reverse String ─────────────────────────────────────────────────────
  {
    slug: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    category: 'Strings',
    tags: ['string', 'two-pointers'],
    description: `Write a function that reverses a string. The input is given as an array of characters \`s\`.

You must do this by modifying the input array **in-place** with O(1) extra memory.`,
    constraints: [
      '1 ≤ s.length ≤ 10^5',
      's[i] is a printable ASCII character.',
    ],
    hints: [
      'Use two pointers — one at the start, one at the end.',
      'Swap the characters at the two pointers, then move them toward the center.',
      'Stop when the pointers cross.',
    ],
    examples: [
      { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]', explanation: 'Reverse in-place.' },
      { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]', explanation: '' },
    ],
    starterCode: {
      python: `def reverseString(s):
    """
    :type s: List[str]
    :rtype: None — modifies s in-place
    """
    pass
`,
      javascript: `/**
 * @param {character[]} s
 * @return {void} — modify s in-place
 */
function reverseString(s) {

}
`,
    },
    hiddenTestCases: [
      { input: { s: ['h','e','l','l','o'] },         expectedOutput: ['o','l','l','e','h'] },
      { input: { s: ['H','a','n','n','a','h'] },      expectedOutput: ['h','a','n','n','a','H'] },
      { input: { s: ['A'] },                          expectedOutput: ['A'] },
      { input: { s: ['a','b'] },                      expectedOutput: ['b','a'] },
      { input: { s: ['1','2','3','4','5'] },           expectedOutput: ['5','4','3','2','1'] },
    ],
    testHarness: {
      python: `import json, sys

%%STUDENT_CODE%%

_data     = json.loads('%%INPUT_JSON%%')
_expected = json.loads('%%EXPECTED_JSON%%')
_s        = _data["s"]

try:
    reverseString(_s)
    if _s == _expected:
        print("PASS")
    else:
        print("FAIL:" + json.dumps(_s))
except Exception as e:
    print("FAIL:EXCEPTION:" + str(e), file=sys.stderr)
    sys.exit(1)
`,
      javascript: `%%STUDENT_CODE%%

const _data     = JSON.parse('%%INPUT_JSON%%');
const _expected = JSON.parse('%%EXPECTED_JSON%%');
const _s        = _data.s;
reverseString(_s);

if (JSON.stringify(_s) === JSON.stringify(_expected)) {
    console.log("PASS");
} else {
    console.log("FAIL:" + JSON.stringify(_s));
}
`,
    },
    xpReward: 10,
  },

  // ── 4. FizzBuzz ────────────────────────────────────────────────────────────
  {
    slug: 'fizz-buzz',
    title: 'Fizz Buzz',
    difficulty: 'Easy',
    category: 'Math',
    tags: ['math', 'string', 'simulation'],
    description: `Given an integer \`n\`, return a string array \`answer\` (1-indexed) where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) otherwise.`,
    constraints: ['1 ≤ n ≤ 10^4'],
    hints: [
      'Use the modulo operator % to check divisibility.',
      'Check the FizzBuzz condition first (divisible by both 3 and 5).',
      'Convert the integer to a string when adding it to the answer.',
    ],
    examples: [
      { input: 'n = 3', output: '["1","2","Fizz"]', explanation: '' },
      { input: 'n = 5', output: '["1","2","Fizz","4","Buzz"]', explanation: '' },
      { input: 'n = 15', output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', explanation: '' },
    ],
    starterCode: {
      python: `def fizzBuzz(n):
    """
    :type n: int
    :rtype: List[str]
    """
    pass
`,
      javascript: `/**
 * @param {number} n
 * @return {string[]}
 */
function fizzBuzz(n) {

}
`,
    },
    hiddenTestCases: [
      { input: { n: 3 },  expectedOutput: ['1','2','Fizz'] },
      { input: { n: 5 },  expectedOutput: ['1','2','Fizz','4','Buzz'] },
      { input: { n: 15 }, expectedOutput: ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz'] },
      { input: { n: 1 },  expectedOutput: ['1'] },
      { input: { n: 20 }, expectedOutput: ['1','2','Fizz','4','Buzz','Fizz','7','8','Fizz','Buzz','11','Fizz','13','14','FizzBuzz','16','17','Fizz','19','Buzz'] },
    ],
    testHarness: {
      python: `import json, sys

%%STUDENT_CODE%%

_data     = json.loads('%%INPUT_JSON%%')
_expected = json.loads('%%EXPECTED_JSON%%')
_n        = _data["n"]

try:
    _result = fizzBuzz(_n)
    if _result == _expected:
        print("PASS")
    else:
        print("FAIL:" + json.dumps(_result))
except Exception as e:
    print("FAIL:EXCEPTION:" + str(e), file=sys.stderr)
    sys.exit(1)
`,
      javascript: `%%STUDENT_CODE%%

const _data     = JSON.parse('%%INPUT_JSON%%');
const _expected = JSON.parse('%%EXPECTED_JSON%%');
const _result   = fizzBuzz(_data.n);

if (JSON.stringify(_result) === JSON.stringify(_expected)) {
    console.log("PASS");
} else {
    console.log("FAIL:" + JSON.stringify(_result));
}
`,
    },
    xpReward: 10,
  },

  // ── 5. Maximum Subarray (Medium) ──────────────────────────────────────────
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    constraints: [
      '1 ≤ nums.length ≤ 10^5',
      '-10^4 ≤ nums[i] ≤ 10^4',
    ],
    hints: [
      'Think about Kadane\'s Algorithm.',
      'At each index, decide: extend the current subarray or start fresh?',
      'Track two variables: current_sum and max_sum.',
    ],
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1', explanation: '' },
      { input: 'nums = [5,4,-1,7,8]', output: '23', explanation: 'The whole array is the subarray.' },
    ],
    starterCode: {
      python: `def maxSubArray(nums):
    """
    :type nums: List[int]
    :rtype: int
    """
    pass
`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {

}
`,
    },
    hiddenTestCases: [
      { input: { nums: [-2,1,-3,4,-1,2,1,-5,4] }, expectedOutput: 6 },
      { input: { nums: [1] },                      expectedOutput: 1 },
      { input: { nums: [5,4,-1,7,8] },             expectedOutput: 23 },
      { input: { nums: [-1,-2,-3] },               expectedOutput: -1 },
      { input: { nums: [0,0,0] },                  expectedOutput: 0 },
      { input: { nums: [-2,1] },                   expectedOutput: 1 },
    ],
    testHarness: {
      python: `import json, sys

%%STUDENT_CODE%%

_data     = json.loads('%%INPUT_JSON%%')
_expected = json.loads('%%EXPECTED_JSON%%')
_nums     = _data["nums"]

try:
    _result = maxSubArray(_nums)
    if _result == _expected:
        print("PASS")
    else:
        print("FAIL:" + json.dumps(_result))
except Exception as e:
    print("FAIL:EXCEPTION:" + str(e), file=sys.stderr)
    sys.exit(1)
`,
      javascript: `%%STUDENT_CODE%%

const _data     = JSON.parse('%%INPUT_JSON%%');
const _expected = JSON.parse('%%EXPECTED_JSON%%');
const _result   = maxSubArray(_data.nums);

if (_result === _expected) {
    console.log("PASS");
} else {
    console.log("FAIL:" + JSON.stringify(_result));
}
`,
    },
    xpReward: 30,
  },

];

// ── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const p of problems) {
    await CodeProblem.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
    console.log(`✓  Seeded: ${p.title}`);
  }

  console.log(`\n✅  Done — ${problems.length} problems seeded.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
