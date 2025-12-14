// Fix language dropdown to show full text
document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('languageSelector');
    if (!select) return;

    // Force options to show full text by recreating them
    const options = Array.from(select.options);
    options.forEach(option => {
        const text = option.textContent;
        option.textContent = text; // Force re-render
        option.style.cssText = 'color: white !important; background: #1c1f26 !important; padding: 10px !important; font-size: 16px !important;';
    });

    // Also update the select itself
    select.style.cssText += '; width: 100%; max-width: 400px;';
});
