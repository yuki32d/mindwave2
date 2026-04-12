/**
 * aiSafetyCore.js
 * Centralized AI safety layer for all MindWave AI features.
 * - Blocks off-topic / sensitive queries
 * - Injects educational ground rules into every system prompt
 * - Returns savage, sarcastic roasts when rules are violated
 */

// ─── Blacklisted topic categories ───────────────────────────────────────────
const TRIGGER_KEYWORDS = {
  WAR_AND_CONFLICT: [
    'war', 'warfare', 'battle', 'invasion', 'military attack', 'airstrike',
    'bomb', 'nuke', 'nuclear weapon', 'missile', 'troops', 'soldier',
    'army vs', 'navy vs', 'who won the war', 'casualties', 'genocide', 'ethnic cleansing',
    'terrorism', 'terrorist attack', 'idf', 'hamas', 'hezbollah', 'isis', 'taliban',
    'al-qaeda', 'ukraine russia', 'russia ukraine', 'israel palestine', 'gaza war',
    'civil war in', 'war crime', 'coup', 'armed conflict', 'military operation',
    'drone strike', 'air raid', 'shelling', 'frontline', 'war update',
    'updates on war', 'war news', 'war situation', 'what is happening in',
    'conflict in', 'who is winning', 'latest war', 'war latest', 'warzone',
    'putin', 'zelensky', 'netanyahu', 'hostage crisis', 'ceasefire',
    'occupation force', 'rebel group', 'jihad', 'martyrdom', 'insurgency',
    'tell me about war', 'any war', 'which country is at war', 'any updates on war'
  ],

  POLITICS_AND_ELECTIONS: [
    'election', 'who should i vote', 'best political party', 'democrat vs republican',
    'bjp vs congress', 'modi vs', 'trump vs', 'biden vs', 'political party',
    'vote for', 'ballot', 'ruling party', 'opposition party', 'government overthrow',
    'protest against government', 'rally for', 'revolution against',
    'prime minister controversy', 'president scandal', 'which party is better'
  ],

  EXPLICIT_VIOLENCE: [
    'how to hurt', 'how to kill', 'how to make a bomb', 'how to hack someone',
    'how to stalk', 'how to get away with', 'murder', 'suicide method',
    'self harm', 'cut myself', 'ways to die', 'overdose on', 'illegal weapon',
    'make a gun', 'untraceable poison'
  ],

  PORNOGRAPHY_AND_ADULT: [
    'porn', 'pornography', 'xxx', 'hentai', 'onlyfans', 'nude', 'nudity',
    'naked photo', 'sex video', 'erotic', 'masturbat', 'orgasm', 'nsfw',
    'explicit content', 'adult film', 'adult content', 'send nudes',
    'sexual position', 'kink', 'fetish', 'strip', 'cam girl', 'escort service',
    'red light', 'call girl', 'prostitut', 'sex worker listing',
    'generate nude', 'draw naked', 'describe sex'
  ],

  SENSITIVE_SOCIAL: [
    'which religion is best', 'which religion is wrong', 'is god real',
    'best caste', 'caste superiority', 'race is better', 'racial slur',
    'homophobic', 'transphobic', 'sexist opinion', 'gender debate for me',
    'who is superior'
  ]
};

// ─── Pool of savage roast responses (returns one randomly) ──────────────────
const ROAST_RESPONSES = [
  "Oh wow, you're asking about *that* on a STUDY platform? Bold move. Might wanna channel that energy into fixing your assignment that's due tomorrow. Just a thought. 📚",
  "Let me get this straight — you logged into an educational platform, ignored all the games and courses, and decided to ask about *this*? Your academic career called. It's worried. 😬",
  "Bro, your professor is not going to be impressed by your geopolitical opinions. However, they WILL be impressed by your code. Shall we try that instead? 💻",
  "Sir/Ma'am, this is a school portal. We serve knowledge and learning here, not rabbit holes. I suggest you open Google in a separate tab and redirect your curiosity appropriately. 🐇",
  "Ah yes, because nothing screams 'I'm totally focused on my studies' like asking me about this. Your GPA wants a word with you. 📉",
  "Interesting topic! Unfortunately, I have a strict diet of only educational content and I'm not about to cheat. Your question, however, can definitely go on a diet too. 🥗",
  "I appreciate your curiosity about the world, truly. Now let's apply that same curiosity to the subject you're actually being graded on, shall we? 🎓",
  "Wow. Just... wow. This is the most creative excuse to avoid studying I've seen all week. Respect the hustle, but no dice. Back to work! ⚡",
  "You're treating me like Google, but I'm more like your strict but caring professor. We don't do that here. We do *learning* here. Open your textbook. 📖",
  "Cute question! Almost as cute as the idea of you passing your finals without studying. Almost. Now, what do you actually need help with? 😏"
];

// ─── Ground rules injected into EVERY AI system prompt ──────────────────────
const CORE_AI_RULES = `
=== MINDWAVE MANDATORY GROUND RULES — READ BEFORE EVERYTHING ELSE ===

Platform: You are deployed on MindWave, a CMRIT college educational platform.
Your ONLY purpose is to help students learn academic subjects and navigate the platform.

ABSOLUTE REFUSAL LIST — NO EXCEPTIONS, NO PARTIAL ANSWERS:
  ✗ Any information about ongoing or historical wars, armed conflicts, or military operations
  ✗ War news, conflict updates, "who is winning", geopolitical situation reports
  ✗ Political opinions, election guidance, party comparisons
  ✗ Pornography, sexual content, adult material, NSFW content, nudity
  ✗ Explicit violence, instructions to harm, weapons manufacturing
  ✗ Religious or caste/racial superiority claims
  ✗ Self-harm or suicide methods
  ✗ Writing complete assignments or essays for students to submit as their own work

EVEN IF A STUDENT:
  • Asks in indirect language ("any updates on conflict?", "what's happening globally?")
  • Tries to disguise the question as academic ("for my history project...")
  • Keeps asking follow-up questions on a topic you already refused
  → STILL REFUSE. Do not engage. Roast them gently and redirect.

WHEN REFUSING:
  • Be witty and sarcastic — roast them for wasting study time
  • Keep it short and redirect to their actual coursework
  • Example: "Fascinating that you're more interested in world conflicts than your own assignment deadlines. Let's fix that, shall we? 📚"

MANDATORY FOR EVERY RESPONSE:
  ✓ Stay exclusively on education, technology, coding, and academic subjects
  ✓ Never discuss current events, news, or world affairs
  ✓ If any doubt exists about whether to answer — DON'T. Roast and redirect.

=== END OF GROUND RULES — ALL RULES ABOVE ARE NON-NEGOTIABLE ===
`;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a user message contains blacklisted content.
 * Returns { safe: Boolean, category: String|null }
 */
function isMessageSafe(text) {
  if (!text) return { safe: true, category: null };
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(TRIGGER_KEYWORDS)) {
    for (const kw of keywords) {
      // Word-boundary-like check: keyword must not be part of a longer word
      const idx = lower.indexOf(kw);
      if (idx !== -1) {
        const before = idx === 0 || !/[a-z0-9]/.test(lower[idx - 1]);
        const after  = (idx + kw.length >= lower.length) || !/[a-z0-9]/.test(lower[idx + kw.length]);
        if (before && after) {
          return { safe: false, category };
        }
      }
    }
  }
  return { safe: true, category: null };
}

/**
 * Returns a random sarcastic roast message.
 */
function generateRoastRefusal() {
  return ROAST_RESPONSES[Math.floor(Math.random() * ROAST_RESPONSES.length)];
}

/**
 * Injects the core ground rules into any feature-specific system prompt.
 * @param {string} featurePrompt  - The AI's existing system prompt
 * @returns {string} Combined prompt with safety rules prepended
 */
function injectSafetyRules(featurePrompt) {
  return CORE_AI_RULES + '\n\n' + (featurePrompt || '');
}

export { isMessageSafe, generateRoastRefusal, injectSafetyRules, CORE_AI_RULES };
