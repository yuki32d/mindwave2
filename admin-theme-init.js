/**
 * MindWave Admin Theme Init
 * Include as the FIRST script in every admin page's <head>.
 * Reads 'mw_admin_theme' from localStorage and sets data-theme on <html> immediately.
 * Also wires the topbar theme toggle button (id="themeToggle") on DOMContentLoaded.
 */
(function () {
    var saved = localStorage.getItem('mw_admin_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    document.addEventListener('DOMContentLoaded', function () {
        // Wire theme toggle (id="themeToggle" used in admin.html)
        var btn = document.getElementById('themeToggle') || document.getElementById('adminThemeToggle');
        if (btn) {
            btn.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme') || 'dark';
                var next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('mw_admin_theme', next);
            });
        }

        // Topbar icon-btn fallback: any button with data-action="theme"
        document.querySelectorAll('[data-action="theme"]').forEach(function (b) {
            b.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme') || 'dark';
                var next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('mw_admin_theme', next);
            });
        });
    });
})();
