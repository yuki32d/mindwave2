// Publish Modal for Faculty Game Creation
// This file provides a reusable modal for selecting target classes when publishing games

let facultyClasses = [];

// Load faculty's classes when page loads
async function loadFacultyClasses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api/faculty/classes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.ok) {
            facultyClasses = data.classes;
            console.log('Loaded faculty classes:', facultyClasses);
        }
    } catch (error) {
        console.error('Failed to load faculty classes:', error);
    }
}

// Populate the class selector in the modal
function populateClassSelector() {
    const select = document.getElementById('modalTargetClasses');
    if (select && facultyClasses.length > 0) {
        select.innerHTML = facultyClasses.map(cls =>
            `<option value="${cls.id}">${cls.displayName}</option>`
        ).join('');
    }
}

// Show the publish modal
function showPublishModal() {
    const modal = document.getElementById('publishModal');
    if (modal) {
        modal.style.display = 'flex';
        populateClassSelector();
    }
}

// Close the publish modal
function closePublishModal() {
    const modal = document.getElementById('publishModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirm publish with selected classes
async function confirmPublish() {
    const targetClasses = Array.from(document.getElementById('modalTargetClasses').selectedOptions)
        .map(opt => opt.value);
    const isPublic = document.getElementById('modalIsPublic').checked;

    if (targetClasses.length === 0 && !isPublic) {
        alert('Please select at least one class or make the game public to all departments');
        return;
    }

    // Call the page-specific publish function with class data
    if (typeof publishGameWithClasses === 'function') {
        await publishGameWithClasses(targetClasses, isPublic);
    } else {
        console.error('publishGameWithClasses function not found');
        alert('Error: Publish function not implemented');
    }

    closePublishModal();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadFacultyClasses();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('publishModal');
    if (event.target === modal) {
        closePublishModal();
    }
});
