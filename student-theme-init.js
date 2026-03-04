/**
 * MindWave Global Theme Initialize
 * Include as the FIRST script in <head> on every student page.
 * Reads localStorage 'theme' and applies data-theme to <html> immediately
 * to prevent any flash-of-wrong-theme.
 */
(function () {
    var theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
})();

// After DOM is ready, wire up the topbar theme toggle button and settings cards
document.addEventListener('DOMContentLoaded', function () {
    // ── Topbar pill toggle (mw-theme-toggle) ──
    var topbarToggle = document.querySelector('.mw-theme-toggle');
    if (topbarToggle) {
        topbarToggle.addEventListener('click', function () {
            var current = document.documentElement.getAttribute('data-theme') || 'dark';
            var next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        });
    }

    // ── Settings page: Dark/Light theme cards ──
    var themeCards = document.querySelectorAll('[data-theme-choice]');
    if (themeCards.length) {
        var current = localStorage.getItem('theme') || 'dark';
        themeCards.forEach(function (card) {
            if (card.getAttribute('data-theme-choice') === current) {
                card.classList.add('active');
            }
            card.addEventListener('click', function () {
                themeCards.forEach(function (c) { c.classList.remove('active'); });
                card.classList.add('active');
                applyTheme(card.getAttribute('data-theme-choice'));
            });
        });
    }
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}
