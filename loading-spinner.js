/**
 * MindWave Loading Spinner Utility
 * Uiverse.io loader with auto theme detection
 */

const MindWaveLoader = {
    // Initialize the loader (call this once on page load)
    init: function (theme = 'dark') {
        // Check if loader already exists
        if (document.getElementById('mindwave-loader')) {
            return;
        }

        // Create loader HTML with Uiverse.io design
        const loaderHTML = `
            <div id="mindwave-loader" class="mindwave-loading-overlay ${theme === 'light' ? 'light-theme' : ''}" role="status" aria-live="polite">
                <div class="loader">
                    <div class="loader__bar"></div>
                    <div class="loader__bar"></div>
                    <div class="loader__bar"></div>
                    <div class="loader__bar"></div>
                    <div class="loader__bar"></div>
                    <div class="loader__ball"></div>
                </div>
            </div>
        `;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', loaderHTML);
    },

    // Show the loader
    show: function () {
        const loader = document.getElementById('mindwave-loader');
        if (loader) {
            loader.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    // Hide the loader
    hide: function () {
        const loader = document.getElementById('mindwave-loader');
        if (loader) {
            loader.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Show loader for a specific duration (in milliseconds)
    showFor: function (duration) {
        this.show();
        setTimeout(() => {
            this.hide();
        }, duration);
    },

    // Wrap an async function with loader
    wrap: async function (asyncFunction) {
        this.show();
        try {
            const result = await asyncFunction();
            return result;
        } finally {
            this.hide();
        }
    }
};

// Auto-initialize on DOM ready (but don't show automatically)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        const theme = document.body.dataset.theme || 'dark';
        MindWaveLoader.init(theme);
        // Removed auto-show - loader will only show when explicitly called
    });
} else {
    const theme = document.body.dataset.theme || 'dark';
    MindWaveLoader.init(theme);
    // Removed auto-show - loader will only show when explicitly called
}

// Hide loader when page is fully loaded
window.addEventListener('load', function () {
    setTimeout(function () {
        MindWaveLoader.hide();
    }, 800);
});

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindWaveLoader;
}
