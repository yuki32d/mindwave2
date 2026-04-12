/**
 * loginSecurity.js
 * Shared client-side security utilities for MindWave login pages.
 * Loaded by student-login.html and admin-login.html.
 *
 * Protections:
 *  1. Input sanitization  — strips HTML tags & control characters
 *  2. Injection detection — blocks NoSQL/script injection patterns in inputs
 *  3. Brute-force lockout — sessionStorage-based failed-attempt tracker
 */

(function (global) {

  // ── 1. Input sanitization ────────────────────────────────────────────────
  /**
   * Strip HTML tags, script content, and MongoDB operator characters
   * from a string before it is sent in a network request.
   */
  function sanitizeInput(val) {
    if (typeof val !== 'string') return '';
    return val
      .replace(/<[^>]*>/g, '')          // strip HTML tags
      .replace(/[\x00-\x1F\x7F]/g, '')  // remove control characters
      .trim();
  }

  // ── 2. Injection / attack pattern detection ──────────────────────────────
  /**
   * Returns true if the value looks like a NoSQL injection or XSS attempt.
   * Used to block the form BEFORE sending to the server.
   */
  const INJECTION_PATTERNS = [
    /\$[a-zA-Z]+/,           // MongoDB operators: $gt, $where, $ne …
    /\{.*\}/,                 // JSON object literals
    /<script/i,               // XSS: <script …
    /javascript\s*:/i,        // XSS: javascript: protocol
    /on\w+\s*=/i,             // XSS: onerror=, onclick= …
    /\bexec\s*\(/i,           // code execution
    /\beval\s*\(/i,           // eval() call
    /--.*$/,                  // SQL comment (for defence-in-depth)
    /'.*OR.*'/i,              // SQL OR injection
    /\bDROP\b/i,              // SQL DROP
    /\bSELECT\b.*\bFROM\b/i  // SQL SELECT … FROM
  ];

  function isInjectionAttempt(val) {
    if (typeof val !== 'string') return true; // reject non-strings
    return INJECTION_PATTERNS.some(function (rx) { return rx.test(val); });
  }

  // ── 3. Brute-force / client-side lockout ────────────────────────────────
  var STORAGE_KEY = 'mw_login_lockout';
  var MAX_FAILURES = 5;
  var LOCKOUT_MS   = 30 * 1000; // 30 seconds after 5 failures
  var HARD_LOCK_MS = 5 * 60 * 1000; // 5 minutes after 10 failures
  var HARD_LIMIT   = 10;

  function _getState() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || { count: 0, until: 0 };
    } catch (e) {
      return { count: 0, until: 0 };
    }
  }

  function _saveState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* sessionStorage unavailable */ }
  }

  /**
   * Call on every failed login attempt.
   * Returns { locked: Boolean, remainingMs: Number, count: Number }
   */
  function recordFailedAttempt() {
    var state = _getState();
    state.count += 1;

    var lockMs = state.count >= HARD_LIMIT ? HARD_LOCK_MS : LOCKOUT_MS;
    state.until = Date.now() + lockMs;
    _saveState(state);

    return getLockoutState();
  }

  /**
   * Returns the current lockout state without modifying it.
   * { locked: Boolean, remainingMs: Number, count: Number }
   */
  function getLockoutState() {
    var state = _getState();
    var remaining = Math.max(0, state.until - Date.now());
    return {
      locked: state.count >= MAX_FAILURES && remaining > 0,
      remainingMs: remaining,
      count: state.count
    };
  }

  /**
   * Reset the lockout counter (call after successful login or reset).
   */
  function clearLockout() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) { }
  }

  /**
   * Convenience: start a visible countdown in a given DOM element,
   * re-enabling the button when the lockout expires.
   *
   * @param {HTMLElement} btnEl    — The submit button to disable
   * @param {string}      origText — Original button label text
   * @param {HTMLElement} [msgEl]  — Optional element to show countdown text in
   */
  function startCountdown(btnEl, origText, msgEl) {
    if (!btnEl) return;
    btnEl.disabled = true;

    var interval = setInterval(function () {
      var ls = getLockoutState();
      if (!ls.locked) {
        clearInterval(interval);
        btnEl.disabled = false;
        if (btnEl.querySelector('.btn-lbl')) {
          btnEl.querySelector('.btn-lbl').textContent = origText;
        } else {
          btnEl.textContent = origText;
        }
        if (msgEl) msgEl.textContent = '';
        return;
      }
      var secs = Math.ceil(ls.remainingMs / 1000);
      var txt = ls.count >= HARD_LIMIT
        ? 'Too many attempts. Wait ' + secs + 's\u2026'
        : 'Too many attempts. Wait ' + secs + 's\u2026';
      if (btnEl.querySelector('.btn-lbl')) {
        btnEl.querySelector('.btn-lbl').textContent = txt;
      } else {
        btnEl.textContent = txt;
      }
      if (msgEl) msgEl.textContent = txt;
    }, 500);
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.MWLoginSecurity = {
    sanitizeInput:       sanitizeInput,
    isInjectionAttempt:  isInjectionAttempt,
    recordFailedAttempt: recordFailedAttempt,
    getLockoutState:     getLockoutState,
    clearLockout:        clearLockout,
    startCountdown:      startCountdown
  };

})(window);
