/**
 * sidebar.js — Shared collapsible sidebar logic + user profile loader
 * Include on every student page that uses the mw-sidebar shell.
 */
(function () {
    const STORAGE_KEY = 'mw_sidebar_collapsed';

    function getApp() {
        return document.querySelector('.mw-app') || document.querySelector('.mw-shell');
    }

    function applyState(collapsed) {
        const app = getApp();
        if (!app) return;
        app.classList.toggle('sidebar-collapsed', collapsed);
        // Also toggle the aside directly in case CSS targets the aside
        const sidebar = document.getElementById('mwSidebar');
        if (sidebar) sidebar.classList.toggle('collapsed', collapsed);
    }

    function toggle() {
        const app = getApp();
        if (!app) return;
        const isNowCollapsed = !app.classList.contains('sidebar-collapsed');
        applyState(isNowCollapsed);
        localStorage.setItem(STORAGE_KEY, isNowCollapsed ? '1' : '0');
    }

    /* ── Populate sidebar user name + avatar ── */
    function setUserUI(name) {
        const trimmed = (name || '').trim() || 'Student';
        const initials = trimmed.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);

        // Sidebar footer name
        const nameEl = document.getElementById('sidebarUserName');
        if (nameEl) nameEl.textContent = trimmed;

        // Avatar initials (sidebar + topbar)
        document.querySelectorAll('#avatarInitials, #topbarAvatar').forEach(el => {
            el.textContent = initials;
        });

        // Dropdown name if present
        const dropdownName = document.getElementById('dropdownUserName');
        if (dropdownName) dropdownName.textContent = trimmed;
    }

    async function loadUserProfile() {
        // 1. Immediately apply cached name from localStorage
        const cached = localStorage.getItem('mw_displayName');
        if (cached) setUserUI(cached);

        // 2. Fetch fresh name from API
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${window.location.origin}/api/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            const user = data.user || {};
            const displayName = user.displayName || user.name ||
                [localStorage.getItem('firstName'), localStorage.getItem('lastName')]
                    .filter(Boolean).join(' ') || 'Student';

            // Cache for instant load on next page
            localStorage.setItem('mw_displayName', displayName);
            setUserUI(displayName);
        } catch (e) {
            // Silently fail — cached name is already shown
        }
    }

    // Restore saved state on load
    document.addEventListener('DOMContentLoaded', function () {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === '1') applyState(true);

        // Wire up any hamburger button
        const btn = document.getElementById('sidebarToggle');
        if (btn) btn.addEventListener('click', toggle);

        // Load user profile for sidebar
        loadUserProfile();
    });
})();
