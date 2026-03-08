/**
 * MindWave Auth Guard
 * Load as the FIRST script (after student-theme-init.js) on every student or faculty page.
 *
 * Usage:
 *   Student pages: <script src="auth-guard.js" data-role="student"></script>
 *   Faculty pages: <script src="auth-guard.js" data-role="faculty"></script>
 *
 * What it does:
 * 1. Checks that a token exists in localStorage — redirects to login if not.
 * 2. Decodes the JWT role claim (without a library — just base64 decodes the payload).
 * 3. If the page requires "student" but the user is "faculty" → redirects to faculty homepage.
 * 4. If the page requires "faculty" but the user is "student" → redirects to student homepage.
 */
(function () {
    var scriptEl = document.currentScript;
    var requiredRole = scriptEl ? scriptEl.getAttribute('data-role') : null;

    var token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('marketing-site/student-login.html');
        return;
    }

    try {
        var payloadB64 = token.split('.')[1];
        var base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        var padding = base64.length % 4 === 0 ? '' : '===='.slice(base64.length % 4);
        var payload = JSON.parse(atob(base64 + padding));

        // Check token expiry
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            localStorage.removeItem('token');
            window.location.replace('marketing-site/student-login.html');
            return;
        }

        var userRole = payload.role; // 'student' | 'faculty' | 'admin'

        if (requiredRole === 'student' && userRole !== 'student') {
            window.location.replace('homepage.html');
            return;
        }

        if (requiredRole === 'faculty' && userRole !== 'faculty' && userRole !== 'admin') {
            window.location.replace('homepage.html');
            return;
        }

        // Expose for other scripts
        window.MW_USER_ROLE = userRole;
        window.MW_USER_ID = payload.sub;

    } catch (e) {
        localStorage.removeItem('token');
        window.location.replace('marketing-site/student-login.html');
    }
})();
