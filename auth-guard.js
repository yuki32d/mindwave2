// Authentication Guard Utility
// Prevents unauthorized access to protected pages via browser navigation

function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || !role) {
        // No authentication found, redirect to marketing login
        window.location.replace('/marketing-site/website-login.html');
        return false;
    }

    return true;
}

function checkAdminAuth() {
    if (!checkAuth()) return false;

    const role = localStorage.getItem('role');
    if (role !== 'admin') {
        // Not an admin, redirect to appropriate page
        window.location.replace(role === 'student' ? '/homepage.html' : '/marketing-site/website-login.html');
        return false;
    }

    return true;
}

function checkStudentAuth() {
    if (!checkAuth()) return false;

    const role = localStorage.getItem('role');
    if (role !== 'student') {
        // Not a student, redirect to appropriate page
        window.location.replace(role === 'admin' ? '/admin.html' : '/marketing-site/website-login.html');
        return false;
    }

    return true;
}

// Prevent browser back button after logout
function preventBackNavigation() {
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
        window.history.pushState(null, null, window.location.href);
    };
}

// Clear browser cache on logout
function clearAuthAndCache() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');

    // Clear session storage
    sessionStorage.clear();

    // Prevent caching
    if (window.performance && window.performance.navigation.type === 2) {
        window.location.reload();
    }
}
