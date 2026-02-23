// Reset Account - Clear all data and start fresh

function resetEverything() {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage
    sessionStorage.clear();

    // Clear all cookies (if any)
    document.cookie.split(";").forEach(function (c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Show success message
    document.getElementById('success').style.display = 'block';

    console.log('✅ All data cleared successfully!');

    // Redirect to signup page after 2 seconds
    setTimeout(() => {
        window.location.href = 'website-signup.html';
    }, 2000);
}

// Attach event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    const resetBtn = document.getElementById('resetBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    if (resetBtn) {
        resetBtn.addEventListener('click', resetEverything);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            window.location.href = 'website-signup.html';
        });
    }
});
