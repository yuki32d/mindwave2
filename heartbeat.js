// Heartbeat System - Tracks user activity
// Sends heartbeat every 60 seconds to update lastActive timestamp

(function () {
    // Only run heartbeat for logged-in users
    const token = localStorage.getItem('token');
    if (!token) return;

    // Send heartbeat immediately on page load
    sendHeartbeat();

    // Then send heartbeat every 60 seconds (reduced from 10s to avoid rate limits)
    setInterval(sendHeartbeat, 60000);

    async function sendHeartbeat() {
        try {
            const r = await fetch('/api/user/heartbeat', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // Silently ignore rate-limit responses
            if (r.status === 429) return;
        } catch (error) {
            // Silently fail - don't interrupt user experience
            console.debug('Heartbeat failed:', error);
        }
    }
})();
