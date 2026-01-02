// Faculty Live Meeting - Redirect to Confirmation Page
// This script redirects to confirmation page before joining

document.addEventListener('DOMContentLoaded', function () {
    const joinBtn = document.getElementById('joinBtn');

    if (joinBtn) {
        // Add click handler
        joinBtn.addEventListener('click', function (event) {
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

            // Redirect to confirmation page
            const confirmUrl = `faculty-ready-confirm.html?code=${meetingCode}&url=${encodeURIComponent(meetingUrl)}`;
            console.log('Redirecting to confirmation page:', confirmUrl);
            window.location.href = confirmUrl;
        });
    }
});
