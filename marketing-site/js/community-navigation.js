// Community Navigation - Section Switching
document.addEventListener('DOMContentLoaded', function () {
    // Get all navigation buttons
    const navButtons = document.querySelectorAll('.hero-actions button[data-section]');

    // Add click event listeners
    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const sectionName = this.getAttribute('data-section');
            showSection(sectionName, this);
        });
    });

    function showSection(sectionName, clickedButton) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Remove active class from all buttons
        document.querySelectorAll('.hero-actions button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected section
        const sectionMap = {
            'community': 'communitySection',
            'poll': 'pollSection',
            'feedback': 'feedbackSection',
            'quiz': 'quizSection'
        };

        const sectionId = sectionMap[sectionName];
        if (sectionId) {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }
        }

        // Add active class to clicked button
        if (clickedButton) {
            clickedButton.classList.add('active');
        }
    }
});
