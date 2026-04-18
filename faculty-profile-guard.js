/**
 * faculty-profile-guard.js
 * ─────────────────────────────────────────────────────────────
 * Blocks regular faculty from accessing protected pages until
 * they set their Department AND at least one Section.
 * HODs (detected by hod.XXX@cmrit.ac.in pattern) always bypass.
 *
 * Usage: <script src="faculty-profile-guard.js"></script>
 * Place BEFORE the page's main JS so the overlay renders early.
 */

(function () {
  const HOD_REGEX = /^hod\.[a-z]+@cmrit\.ac\.in$/i;
  const API = window.location.origin + '/api';

  // ── Inject overlay CSS + HTML immediately ────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #fpGuardOverlay {
      display: none;
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(10, 15, 28, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center; justify-content: center;
      flex-direction: column; text-align: center;
      font-family: 'Inter', sans-serif;
      padding: 24px;
    }
    #fpGuardOverlay.show { display: flex; }
    #fpGuardOverlay .fp-icon {
      width: 72px; height: 72px; border-radius: 20px;
      background: rgba(220,38,38,0.14); border: 1.5px solid rgba(220,38,38,0.3);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 22px;
    }
    #fpGuardOverlay .fp-icon svg { width: 36px; height: 36px; color: #dc2626; }
    #fpGuardOverlay h2 {
      font-size: 22px; font-weight: 800; color: #f1f5f9;
      margin: 0 0 10px; letter-spacing: -.02em;
    }
    #fpGuardOverlay p {
      font-size: 14px; color: #94a3b8; max-width: 420px;
      line-height: 1.6; margin: 0 0 24px;
    }
    #fpGuardOverlay a.fp-cta {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f5a623; color: #000; font-size: 14px;
      font-weight: 700; padding: 10px 22px; border-radius: 9px;
      text-decoration: none; transition: opacity .15s;
    }
    #fpGuardOverlay a.fp-cta:hover { opacity: .85; }
    #fpGuardOverlay .fp-steps {
      margin-top: 28px; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
      padding: 16px 22px; text-align: left; max-width: 380px;
    }
    #fpGuardOverlay .fp-steps h4 {
      font-size: 12px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: .06em; margin: 0 0 10px;
    }
    #fpGuardOverlay .fp-step {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: #cbd5e1; padding: 4px 0;
    }
    #fpGuardOverlay .fp-step-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(245,166,35,.15); color: #f5a623;
      font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'fpGuardOverlay';
  overlay.innerHTML = `
    <div class="fp-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h2>Complete Your Profile First</h2>
    <p>To access this page you must set your <strong style="color:#f1f5f9;">Department</strong> and at least one <strong style="color:#f1f5f9;">Section</strong> in your faculty profile. This ensures students are matched to the right teacher.</p>
    <a class="fp-cta" href="faculty-profile.html?tab=settings">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Complete My Profile
    </a>
    <div class="fp-steps">
      <h4>Quick Steps</h4>
      <div class="fp-step"><span class="fp-step-num">1</span> Open <strong> Faculty Profile → Settings</strong></div>
      <div class="fp-step"><span class="fp-step-num">2</span> Select your <strong>Department</strong> from the dropdown</div>
      <div class="fp-step"><span class="fp-step-num">3</span> Check the <strong>Sections</strong> you teach (A, B, C…)</div>
      <div class="fp-step"><span class="fp-step-num">4</span> Click <strong>Save Changes</strong> and return here</div>
    </div>
  `;

  // Defer body injection — script runs in <head> before <body> exists
  function appendOverlay() {
    document.body.appendChild(overlay);
  }

  // ── Check profile completeness ───────────────────────────────
  async function checkProfileGuard() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
      if (!token) return; // auth-guard.js will redirect to login

      const res = await fetch(`${API}/faculty/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return; // network error — don't block

      const data = await res.json();
      const email = data.email || '';

      // HODs always bypass (their dept is encoded in their email)
      if (HOD_REGEX.test(email)) return;

      const dept = (data.department || '').trim();
      const sections = Array.isArray(data.facultySections) ? data.facultySections : [];

      if (!dept || sections.length === 0) {
        // Block the page
        overlay.classList.add('show');
        // Disable scrolling on the underlying page
        document.body.style.overflow = 'hidden';
      }
    } catch (e) {
      console.warn('[faculty-profile-guard] Could not verify profile:', e.message);
      // Fail open — don't block on network error
    }
  }

  // Run after DOM is ready (also appends the overlay once body exists)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      appendOverlay();
      checkProfileGuard();
    });
  } else {
    appendOverlay();
    checkProfileGuard();
  }
})();
