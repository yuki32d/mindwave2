// Heartbeat System - Tracks user activity
// Sends heartbeat every 10 seconds to update lastActive timestamp

(function () {
    // Only run heartbeat for logged-in users
    const token = localStorage.getItem('token');
    if (!token) return;

    // Send heartbeat immediately on page load
    sendHeartbeat();

    // Then send heartbeat every 10 seconds
    setInterval(sendHeartbeat, 10000);

    async function sendHeartbeat() {
        try {
            await fetch('/api/user/heartbeat', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            // Silently fail - don't interrupt user experience
            console.debug('Heartbeat failed:', error);
        }
    }
})();
