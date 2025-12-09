// Shared Utility Functions for MindWave
// This file contains common functions used across multiple pages

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date to human-readable string
 * @param {string|Date} dateString - Date to format
 * @returns {string} - Formatted date
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time in seconds to human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time (e.g., "5m 30s" or "45s")
 */
export function formatTime(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/**
 * Format relative time (e.g., "2 days ago")
 * @param {string|Date} dateString - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Show loading spinner
 * @param {string} elementId - ID of element to show spinner in
 */
export function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
                <p>Loading...</p>
            </div>
        `;
    }
}

/**
 * Show error message
 * @param {string} elementId - ID of element to show error in
 * @param {string} message - Error message
 */
export function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #ff3b30;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h3>Error</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Get grade color based on score
 * @param {number} grade - Grade (0-100)
 * @returns {string} - Color hex code
 */
export function getGradeColor(grade) {
    if (grade >= 90) return '#34c759';
    if (grade >= 75) return '#0f62fe';
    if (grade >= 60) return '#ff9f0a';
    return '#ff3b30';
}
