/**
 * MindWave Loading Spinner Utility
 * Simple JavaScript utility to show/hide the loading animation
 */

const MindWaveLoader = {
    // Initialize the loader (call this once on page load)
    init: function (theme = 'dark') {
        // Check if loader already exists
        if (document.getElementById('mindwave-loader')) {
            return;
        }

        // Create loader HTML with new MW design
        const loaderHTML = `
            <div id="mindwave-loader" class="mindwave-loading-overlay ${theme === 'light' ? 'light-theme' : ''}" role="status" aria-live="polite">
                <div class="mindwave-loader-container">
                    <div class="mindwave-loader">
                        <div class="wave-ring"></div>
                        <div class="wave-ring"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="particle"></div>
                        <div class="mw-text">MW</div>
                    </div>
                    <div class="mindwave-loading-text" aria-label="Loading MindWave">Loading MindWave...</div>
                    <div class="progress-dots">
                        <div class="progress-dot"></div>
                        <div class="progress-dot"></div>
                        <div class="progress-dot"></div>
                    </div>
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
            // Prevent body scroll when loader is active
            document.body.style.overflow = 'hidden';
        }
    },

    // Hide the loader
    hide: function () {
        const loader = document.getElementById('mindwave-loader');
        if (loader) {
            loader.classList.remove('active');
            // Restore body scroll
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

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        // Detect theme based on body background or data attribute
        const theme = document.body.dataset.theme || 'dark';
        MindWaveLoader.init(theme);
        // Show loader immediately
        MindWaveLoader.show();
    });
} else {
    // DOM already loaded
    const theme = document.body.dataset.theme || 'dark';
    MindWaveLoader.init(theme);
    // Show loader immediately
    MindWaveLoader.show();
}

// Hide loader when page is fully loaded (images, scripts, etc.)
window.addEventListener('load', function () {
    // Add a small delay so users can actually see the animation
    setTimeout(function () {
        MindWaveLoader.hide();
    }, 800); // Show for at least 800ms to appreciate the animation
});

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MindWaveLoader;
}
