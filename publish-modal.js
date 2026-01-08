// Publish Modal for Faculty Game Creation
// This file provides a reusable modal for selecting target classes when publishing games

let facultyClasses = [];

// Load faculty's classes when page loads
async function loadFacultyClasses() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        console.log('Loading faculty classes...');
        const response = await fetch(`${window.location.origin}/api/faculty/classes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.ok && data.classes) {
            facultyClasses = data.classes;
            console.log('Loaded faculty classes:', facultyClasses);
            populateClassSelector();
        } else {
            console.error('Failed to load classes:', data.message);
            // Add fallback demo classes for testing
            facultyClasses = [
                { id: 'MCA-2024-A', displayName: 'MCA 2024 - Section A' },
                { id: 'MCA-2024-B', displayName: 'MCA 2024 - Section B' },
                { id: 'MCA-2023-A', displayName: 'MCA 2023 - Section A' }
            ];
            console.log('Using fallback classes:', facultyClasses);
            populateClassSelector();
        }
    } catch (error) {
        console.error('Failed to load classes:', error);
        // Add fallback demo classes
        facultyClasses = [
            { id: 'MCA-2024-A', displayName: 'MCA 2024 - Section A' },
            { id: 'MCA-2024-B', displayName: 'MCA 2024 - Section B' },
            { id: 'MCA-2023-A', displayName: 'MCA 2023 - Section A' }
        ];
        console.log('Using fallback classes due to error:', facultyClasses);
        populateClassSelector();
    }
}

// Populate the class selector in the modal
function populateClassSelector() {
    const select = document.getElementById('modalTargetClasses');
    if (select) {
        if (facultyClasses.length > 0) {
            select.innerHTML = facultyClasses.map(cls =>
                `<option value="${cls.id}">${cls.displayName}</option>`
            ).join('');
            console.log('Populated selector with', facultyClasses.length, 'classes');
        } else {
            select.innerHTML = '<option value="">No classes available</option>';
            console.warn('No classes to populate');
        }
    } else {
        console.error('modalTargetClasses select element not found');
    }
}

// Show the publish modal
function showPublishModal() {
    console.log('Showing publish modal...');
    const modal = document.getElementById('publishModal');
    if (modal) {
        modal.style.display = 'flex';
        populateClassSelector(); // Refresh the list
    } else {
        console.error('publishModal element not found');
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
    const select = document.getElementById('modalTargetClasses');
    const targetClasses = Array.from(select.selectedOptions).map(opt => opt.value);
    const isPublic = document.getElementById('modalIsPublic').checked;

    console.log('Selected classes:', targetClasses);
    console.log('Is public:', isPublic);

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
    console.log('Publish modal script loaded');
    loadFacultyClasses();

    // Add event listeners for modal buttons
    const closeBtn = document.getElementById('modalCloseBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePublishModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closePublishModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmPublish);
    }
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('publishModal');
    if (event.target === modal) {
        closePublishModal();
    }
});
