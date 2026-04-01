/**
 * MindWave Community Poll Engine  v2  (MongoDB-backed)
 * Shared between faculty-community.html and student-community.html
 */

const API = {
  getToken() {
    return localStorage.getItem('token') || localStorage.getItem('mindwave_token') || '';
  },
  headers() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.getToken()}` };
  },
  async get(url) {
    const r = await fetch(url, { headers: this.headers(), credentials: 'include' });
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: this.headers(), credentials: 'include', body: JSON.stringify(body) });
    return r.json();
  }
};

window.CommunityPoll = {

  /* ════════════════ SHARED ════════════════ */

  /** Faculty: fetch distinct sections/batches/departments from students */
  getSections()  { return API.get('/api/community/sections'); },

  /* ════════════════ POLL ════════════════ */

  /** Faculty: launch a new poll */
  launchPoll(question, options, targetSections, targetBatch, targetDepartment) {
    return API.post('/api/community/poll', { question, options, targetSections, targetBatch, targetDepartment });
  },

  /** Faculty: stop a poll */
  stopPoll(id) { return API.post(`/api/community/poll/${id}/stop`, {}); },

  /** Faculty: get results of a specific poll */
  getPollResults(id) { return API.get(`/api/community/poll/${id}/results`); },

  /** Student: get the active poll for their section */
  getActivePoll() { return API.get('/api/community/poll/active'); },

  /** Student: cast an anonymous vote */
  votePoll(pollId, optionIndex) { return API.post(`/api/community/poll/${pollId}/vote`, { optionIndex }); },

  /* ════════════════ FEEDBACK ════════════════ */

  /** Faculty: launch live feedback */
  launchFeedback(question, targetSections, targetBatch, targetDepartment) {
    return API.post('/api/community/feedback', { question, targetSections, targetBatch, targetDepartment });
  },

  /** Faculty: stop feedback */
  stopFeedback(id) { return API.post(`/api/community/feedback/${id}/stop`, {}); },

  /** Faculty: get results of a specific feedback */
  getFeedbackResults(id) { return API.get(`/api/community/feedback/${id}/results`); },

  /** Student: get the active feedback for their section */
  getActiveFeedback() { return API.get('/api/community/feedback/active'); },

  /** Student: submit an anonymous rating */
  submitFeedback(feedbackId, rating, label) {
    return API.post(`/api/community/feedback/${feedbackId}/respond`, { rating, label });
  }
};
