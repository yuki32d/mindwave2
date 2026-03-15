/**
 * admin-logout-handler.js
 * Centralized logic for Admin Logout and Sidebar Sync.
 * Injects the logout modal if missing and handles the logout process.
 */

(function() {
    // 1. Inject Logout Modal if missing
    function injectLogoutModal() {
        if (document.getElementById('signoutModal')) return;

        const modalHtml = `
            <div id="signoutModal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">
                <div class="modal" style="background:var(--surface, #111); border:1px solid var(--border, #333); border-radius:18px; padding:32px; width:400px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
                    <div style="width:60px; height:60px; background:rgba(248,113,113,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                        <i data-lucide="log-out" style="color:#f87171; width:30px; height:30px;"></i>
                    </div>
                    <h3 style="font-size:20px; font-weight:800; margin-bottom:10px; color:var(--text, #fff);">Ready to sign out?</h3>
                    <p style="color:var(--muted, #999); font-size:14px; margin-bottom:28px; line-height:1.6;">You'll need to log back in to access the admin workspace.</p>
                    <div style="display:flex; gap:12px;">
                        <button onclick="closeLogoutModal()" style="flex:1; padding:12px; border-radius:10px; border:1px solid var(--border, #333); background:var(--bg, #000); color:var(--text, #fff); font-weight:700; cursor:pointer; transition:0.2s;">Cancel</button>
                        <button onclick="_doLogout()" style="flex:1; padding:12px; border-radius:10px; border:none; background:#f87171; color:white; font-weight:700; cursor:pointer; transition:0.2s;">Sign Out</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Ensure Lucide icons are refreshed for the injected content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 2. Logout Logic
    window.performLogout = function() {
        const modal = document.getElementById('signoutModal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.style.opacity = '1', 10);
        } else {
            window._doLogout();
        }
    };

    window.closeLogoutModal = function() {
        const modal = document.getElementById('signoutModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.style.display = 'none', 200);
        }
    };

    window._doLogout = async function() {
        const API_BASE = window.location.origin;
        try {
            await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
        } catch (error) {
            console.error('Logout failed', error);
        } finally {
            localStorage.clear();
            window.location.href = '/marketing-site/admin-login.html';
        }
    };

    // 3. Sidebar Link Sync
    function syncSidebarLinks() {
        const adminPages = ['admin-students.html', 'faculty-classroom.html', 'faculty-dataanalytics.html', 'faculty-settings.html', 'faculty-profile.html', 'interactive-tools-selector.html', 'ai-game-builder.html'];
        const currentPage = window.location.pathname.split('/').pop();

        if (adminPages.includes(currentPage) || adminPages.some(p => currentPage.startsWith(p))) {
            const sidebar = document.querySelector('.sidebar') || document.querySelector('aside');
            if (sidebar) {
                // Update Announcements and Post Update links if they point to local fragments
                sidebar.querySelectorAll('a.nav-item').forEach(link => {
                    const text = link.textContent.trim().toLowerCase();
                    const href = link.getAttribute('href');

                    if (text.includes('announcements') && (href === '#' || href.includes('#announcementSection'))) {
                        if (currentPage !== 'admin.html') {
                            link.setAttribute('href', 'admin.html#announcementSection');
                            link.removeAttribute('onclick');
                        }
                    }
                    if (text.includes('post update') && (href === '#' || href.includes('#updateSection'))) {
                        if (currentPage !== 'admin.html') {
                            link.setAttribute('href', 'admin.html#updateSection');
                            link.removeAttribute('onclick');
                        }
                    }
                });
            }
        }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        injectLogoutModal();
        syncSidebarLinks();

        // Wire up logout button in sidebar
        const signOutBtn = document.getElementById('signOutControl') || document.querySelector('button[style*="color:#f87171"]');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                performLogout();
            });
        }

        // Handle URL fragments on page load (for admin.html sections)
        if (window.location.hash) {
            const section = document.querySelector(window.location.hash);
            if (section) {
                setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 500);
            }
        }
    });

})();
