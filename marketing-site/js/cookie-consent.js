// Cookie Consent Banner JavaScript
// Handles cookie consent with localStorage

(function () {
    'use strict';

    const COOKIE_CONSENT_KEY = 'mindwave_cookie_consent';
    const COOKIE_PREFERENCES_KEY = 'mindwave_cookie_preferences';

    // Check if user has already made a choice
    function hasConsent() {
        return localStorage.getItem(COOKIE_CONSENT_KEY) !== null;
    }

    // Get consent status
    function getConsent() {
        return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted';
    }

    // Save consent choice
    function saveConsent(accepted, preferences = null) {
        localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'rejected');
        if (preferences) {
            localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
        }

        // Trigger custom event for analytics/tracking scripts
        window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
            detail: { accepted, preferences }
        }));
    }

    // Create and show banner
    function showCookieBanner() {
        // Don't show if already consented
        if (hasConsent()) {
            return;
        }

        // Create banner HTML
        const banner = document.createElement('div');
        banner.className = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-content">
                <div class="cookie-icon">🍪</div>
                <div class="cookie-text">
                    <h3>We value your privacy</h3>
                    <p>
                        We use cookies to enhance your browsing experience, serve personalized content, 
                        and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                        <a href="/marketing-site/privacy-policy.html" target="_blank">Learn more</a>
                    </p>
                </div>
                <div class="cookie-actions">
                    <button class="cookie-btn cookie-btn-accept" id="acceptCookies">
                        Accept All
                    </button>
                    <button class="cookie-btn cookie-btn-reject" id="rejectCookies">
                        Reject
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Show banner with animation
        setTimeout(() => {
            banner.classList.add('show');
        }, 500);

        // Add event listeners
        document.getElementById('acceptCookies').addEventListener('click', () => {
            saveConsent(true, {
                analytics: true,
                marketing: true,
                functional: true
            });
            hideBanner(banner);
        });

        document.getElementById('rejectCookies').addEventListener('click', () => {
            saveConsent(false, {
                analytics: false,
                marketing: false,
                functional: true // Keep functional cookies
            });
            hideBanner(banner);
        });
    }

    // Hide and remove banner
    function hideBanner(banner) {
        banner.classList.remove('show');
        setTimeout(() => {
            banner.remove();
        }, 400);
    }

    // Initialize on page load
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showCookieBanner);
        } else {
            showCookieBanner();
        }
    }

    // Public API
    window.CookieConsent = {
        hasConsent,
        getConsent,
        saveConsent,
        show: showCookieBanner
    };

    // Auto-initialize
    init();
})();
