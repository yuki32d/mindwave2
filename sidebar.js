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

// ── Custom Student Sidebar Scroll Indicator ──
(function () {
    function initScrollBar() {
        const sidebar = document.querySelector('.mw-sidebar');
        const navEl = document.querySelector('.mw-sidebar-nav');
        if (!sidebar || !navEl) return;

        // Inject track + thumb if not already present
        if (sidebar.querySelector('.mw-sidebar-scroll-track')) return;
        const track = document.createElement('div');
        track.className = 'mw-sidebar-scroll-track';
        const thumb = document.createElement('div');
        thumb.className = 'mw-sidebar-scroll-thumb';
        track.appendChild(thumb);
        sidebar.appendChild(track);

        let isDragging = false, dragStartY = 0, dragStartScrollTop = 0;

        function updateThumb() {
            const { scrollTop, scrollHeight, clientHeight } = navEl;
            const trackH = track.clientHeight;
            if (scrollHeight <= clientHeight) { thumb.style.opacity = '0'; return; }
            thumb.style.opacity = '1';
            const thumbH = Math.max(32, trackH * (clientHeight / scrollHeight));
            const maxTop = trackH - thumbH;
            thumb.style.height = thumbH + 'px';
            thumb.style.top = (scrollTop / (scrollHeight - clientHeight)) * maxTop + 'px';
        }

        navEl.addEventListener('scroll', updateThumb, { passive: true });

        // Click on track → jump
        track.addEventListener('mousedown', function (e) {
            if (e.target === thumb) return;
            e.preventDefault();
            const r = track.getBoundingClientRect();
            const thumbH = thumb.offsetHeight;
            const ratio = Math.min(Math.max(0, e.clientY - r.top - thumbH / 2), track.clientHeight - thumbH) / (track.clientHeight - thumbH);
            navEl.scrollTop = ratio * (navEl.scrollHeight - navEl.clientHeight);
        });

        // Drag thumb
        thumb.addEventListener('mousedown', function (e) {
            e.preventDefault(); e.stopPropagation();
            isDragging = true;
            dragStartY = e.clientY;
            dragStartScrollTop = navEl.scrollTop;
            thumb.style.animationPlayState = 'paused';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            const ratio = (e.clientY - dragStartY) / (track.clientHeight - thumb.offsetHeight);
            navEl.scrollTop = dragStartScrollTop + ratio * (navEl.scrollHeight - navEl.clientHeight);
        });

        document.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                thumb.style.animationPlayState = '';
                document.body.style.userSelect = '';
            }
        });

        updateThumb();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollBar);
    } else {
        initScrollBar();
    }
})();
