/**
 * MindWave Community Poll Engine
 * Shared localStorage-based state for Quick Poll + Live Feedback
 * Works across faculty-community.html ↔ student-community.html on the same origin
 */

const POLL_KEY   = 'mw_community_poll';
const FB_KEY     = 'mw_community_feedback';

/* ── HELPERS ── */
function pollGet()  { try { return JSON.parse(localStorage.getItem(POLL_KEY)  || 'null'); } catch(e){ return null; } }
function pollSet(v) { localStorage.setItem(POLL_KEY,  JSON.stringify(v)); }
function fbGet()    { try { return JSON.parse(localStorage.getItem(FB_KEY)    || 'null'); } catch(e){ return null; } }
function fbSet(v)   { localStorage.setItem(FB_KEY,    JSON.stringify(v)); }

window.CommunityPoll = {
  /* ── FACULTY: launch a poll ── */
  launchPoll(question, options) {
    pollSet({ question, options, responses: {}, active: true, launchedAt: Date.now() });
    window.dispatchEvent(new Event('poll_updated'));
  },
  /* ── FACULTY: stop a poll ── */
  stopPoll() {
    const p = pollGet();
    if (p) { p.active = false; pollSet(p); }
    window.dispatchEvent(new Event('poll_updated'));
  },
  /* ── FACULTY: clear poll ── */
  clearPoll() { localStorage.removeItem(POLL_KEY); window.dispatchEvent(new Event('poll_updated')); },
  /* ── STUDENT: vote ── */
  votePoll(optionIndex) {
    const p = pollGet();
    if (!p || !p.active) return false;
    const uid = 'anon_' + Math.random().toString(36).slice(2,9);
    p.responses[uid] = optionIndex;
    pollSet(p);
    window.dispatchEvent(new Event('poll_updated'));
    return true;
  },
  /* ── READ ── */
  getPoll() { return pollGet(); },

  /* ── FACULTY: launch feedback question ── */
  launchFeedback(question) {
    fbSet({ question, responses: {}, active: true, launchedAt: Date.now() });
    window.dispatchEvent(new Event('feedback_updated'));
  },
  stopFeedback() {
    const f = fbGet();
    if (f) { f.active = false; fbSet(f); }
    window.dispatchEvent(new Event('feedback_updated'));
  },
  clearFeedback() { localStorage.removeItem(FB_KEY); window.dispatchEvent(new Event('feedback_updated')); },
  /* ── STUDENT: submit feedback rating ── */
  submitFeedback(rating, label) {
    const f = fbGet();
    if (!f || !f.active) return false;
    const uid = 'anon_' + Math.random().toString(36).slice(2,9);
    f.responses[uid] = { rating, label, ts: Date.now() };
    fbSet(f);
    window.dispatchEvent(new Event('feedback_updated'));
    return true;
  },
  getFeedback() { return fbGet(); },

  /* ── REPORT: aggregate poll results ── */
  getPollResults() {
    const p = pollGet();
    if (!p) return null;
    const totals = {};
    p.options.forEach((_, i) => { totals[i] = 0; });
    Object.values(p.responses).forEach(v => { totals[v] = (totals[v] || 0) + 1; });
    return { question: p.question, options: p.options, totals, total: Object.keys(p.responses).length };
  },

  /* ── REPORT: aggregate feedback results ── */
  getFeedbackResults() {
    const f = fbGet();
    if (!f) return null;
    const labels = { 1:'Very Confused', 2:'Confused', 3:'Neutral', 4:'Confident', 5:'Very Confident' };
    const totals = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    Object.values(f.responses).forEach(r => { totals[r.rating] = (totals[r.rating] || 0) + 1; });
    const total = Object.keys(f.responses).length;
    const avg = total ? (Object.entries(totals).reduce((s,[k,v]) => s + Number(k)*v, 0) / total).toFixed(2) : '—';
    return { question: f.question, totals, labels, total, avg };
  }
};
