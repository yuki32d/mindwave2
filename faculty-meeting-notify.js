// Faculty Live Meeting - Additional Script
// This script adds the faculty join notification functionality

document.addEventListener('DOMContentLoaded', function () {
    const joinBtn = document.getElementById('joinBtn');
    const token = localStorage.getItem('token');
    const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://mindwave2.onrender.com';

    if (joinBtn) {
        // Add click handler
        joinBtn.addEventListener('click', async function (event) {
            event.preventDefault();

            // Get meeting code and URL from the page
            const meetingCodeElement = document.getElementById('meetingCode');
            const meetingLinkElement = document.getElementById('meetingLink');

            if (!meetingCodeElement || !meetingLinkElement) {
                console.error('Meeting elements not found');
                return;
            }

            const meetingCode = meetingCodeElement.textContent.trim();
            const meetingUrl = meetingLinkElement.textContent.trim();

            try {
                // Notify backend that faculty has joined
                console.log('Notifying backend that faculty joined meeting:', meetingCode);

                await fetch(`${API_BASE}/api/meetings/${meetingCode}/faculty-joined`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Faculty join notification sent successfully');
            } catch (error) {
                console.error('Error notifying faculty join:', error);
                // Continue anyway - don't block faculty from joining
            }

            // Proceed to join meeting using the actual meeting URL
            console.log('Redirecting to:', meetingUrl);
            window.location.href = meetingUrl;
        });
    }
});
