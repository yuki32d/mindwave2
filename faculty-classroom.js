// Faculty Google Classroom Manager
// Handles uploading materials and viewing Google Classroom content

let selectedCourseId = null;
let selectedFile = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkGoogleConnection();
});

// Check if user is connected to Google Classroom
async function checkGoogleConnection() {
    try {
        const response = await fetch('/api/auth/google/status', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.connected) {
            // Not connected - show connection prompt
            showConnectionPrompt();
        } else {
            // Connected - load the interface
            initializeInterface();
        }
    } catch (error) {
        console.error('Error checking Google connection:', error);
        showConnectionPrompt();
    }
}

// Show connection prompt
function showConnectionPrompt() {
    document.querySelector('.classroom-container').innerHTML = `
        <div style="text-align: center; padding: 64px 24px; max-width: 600px; margin: 0 auto;">
            <div style="font-size: 64px; margin-bottom: 24px;">🔗</div>
            <h2 style="margin-bottom: 16px;">Connect to Google Classroom</h2>
            <p style="color: var(--text-muted); margin-bottom: 32px; line-height: 1.6;">
                To upload materials and manage your Google Classroom courses from MindWave, 
                you need to connect your Google account first.
            </p>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 24px; border-radius: 12px; margin-bottom: 32px; text-align: left;">
                <h3 style="margin-top: 0;">What you'll be able to do:</h3>
                <ul style="color: var(--text-muted); line-height: 2;">
                    <li>✅ Upload materials directly to Google Classroom</li>
                    <li>✅ Create assignments from MindWave</li>
                    <li>✅ View your courses and materials</li>
                    <li>✅ Manage student submissions</li>
                </ul>
            </div>
            
            <button onclick="connectToGoogle()" class="upload-btn" style="font-size: 18px; padding: 16px 48px;">
                <img src="https://www.google.com/favicon.ico" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;">
                Connect with Google
            </button>
            
            <p style="color: var(--text-muted); font-size: 14px; margin-top: 24px;">
                🔒 Secure OAuth 2.0 authentication
            </p>
        </div>
    `;
}

// Connect to Google
window.connectToGoogle = function () {
    // Redirect to Google OAuth
    window.location.href = '/auth/google?scope=classroom';
};

// Initialize the interface (when connected)
function initializeInterface() {
    loadCourses();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Course selector
    document.getElementById('courseSelect').addEventListener('change', handleCourseChange);

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // File upload
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');

    fileUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUpload.style.borderColor = '#0f62fe';
    });

    fileUpload.addEventListener('dragleave', () => {
        fileUpload.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUpload.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });

    // Upload form
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
}

// Load Google Classroom courses
async function loadCourses() {
    try {
        const response = await fetch('/api/google-classroom/courses', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            showError('Failed to load courses: ' + data.message);
            return;
        }

        const select = document.getElementById('courseSelect');
        select.innerHTML = '<option value="">Select a course...</option>';

        data.courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.name + (course.section ? ` (${course.section})` : '');
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses. Make sure you\'re connected to Google Classroom.');
    }
}

// Handle course selection change
function handleCourseChange(e) {
    selectedCourseId = e.target.value;

    if (selectedCourseId) {
        // Load materials and assignments for selected course
        loadMaterials();
        loadAssignments();
    }
}

// Switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        selectedFile = file;
        document.getElementById('fileName').textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Handle material upload
async function handleUpload(e) {
    e.preventDefault();

    if (!selectedCourseId) {
        showError('Please select a course first');
        return;
    }

    const title = document.getElementById('materialTitle').value;
    const description = document.getElementById('materialDescription').value;

    if (!selectedFile) {
        showError('Please select a file to upload');
        return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Uploading...';

    try {
        // Step 1: Upload file to Google Drive
        const fileData = await uploadFileToGoogleDrive(selectedFile);

        // Step 2: Create material in Google Classroom with Drive file
        const materialData = {
            title: title,
            description: description,
            materials: [{
                driveFile: {
                    id: fileData.id,
                    title: fileData.title,
                    alternateLink: fileData.alternateLink,
                    thumbnailUrl: fileData.thumbnailUrl
                }
            }]
        };

        const response = await fetch(`/api/google-classroom/courses/${selectedCourseId}/materials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(materialData)
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message);
        }

        showSuccess('✅ Material uploaded successfully to Google Classroom!');

        // Reset form
        document.getElementById('uploadForm').reset();
        selectedFile = null;
        document.getElementById('fileName').textContent = '';

        // Reload materials
        loadMaterials();

    } catch (error) {
        console.error('Upload error:', error);
        showError('Failed to upload material: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = '🚀 Upload to Google Classroom';
    }
}

// Upload file to Google Drive
async function uploadFileToGoogleDrive(file) {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    const response = await fetch('/api/google-drive/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            name: file.name,
            mimeType: file.type,
            content: base64
        })
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.message);
    }

    return data.file;
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Load materials for selected course
async function loadMaterials() {
    if (!selectedCourseId) return;

    const container = document.getElementById('materialsList');
    container.innerHTML = '<div class="loading">⏳ Loading materials...</div>';

    try {
        const response = await fetch(`/api/google-classroom/courses/${selectedCourseId}/materials`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message);
        }

        if (data.materials.length === 0) {
            container.innerHTML = '<div class="loading">No materials yet. Upload your first material!</div>';
            return;
        }

        container.innerHTML = data.materials.map(material => `
            <div class="material-item">
                <div class="material-info">
                    <h4>📄 ${escapeHtml(material.title)}</h4>
                    <p>${escapeHtml(material.description || 'No description')}</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        Created: ${new Date(material.creationTime).toLocaleDateString()}
                    </p>
                </div>
                <div>
                    ${material.materials && material.materials.length > 0 ?
                material.materials.map(m => {
                    if (m.driveFile) {
                        return `<a href="${m.driveFile.alternateLink}" target="_blank" style="color: #0f62fe;">View File</a>`;
                    }
                    return '';
                }).join(' ')
                : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading materials:', error);
        container.innerHTML = '<div class="error-message">Failed to load materials</div>';
    }
}

// Load assignments for selected course
async function loadAssignments() {
    if (!selectedCourseId) return;

    const container = document.getElementById('assignmentsList');
    container.innerHTML = '<div class="loading">⏳ Loading assignments...</div>';

    try {
        const response = await fetch(`/api/google-classroom/courses/${selectedCourseId}/assignments`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message);
        }

        if (data.assignments.length === 0) {
            container.innerHTML = '<div class="loading">No assignments yet.</div>';
            return;
        }

        container.innerHTML = data.assignments.map(assignment => `
            <div class="material-item">
                <div class="material-info">
                    <h4>📝 ${escapeHtml(assignment.title)}</h4>
                    <p>${escapeHtml(assignment.description || 'No description')}</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        Points: ${assignment.maxPoints || 'Ungraded'} | 
                        Due: ${assignment.dueDate ? formatDueDate(assignment.dueDate, assignment.dueTime) : 'No due date'}
                    </p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading assignments:', error);
        container.innerHTML = '<div class="error-message">Failed to load assignments</div>';
    }
}

// Format due date
function formatDueDate(dueDate, dueTime) {
    if (!dueDate) return 'No due date';

    const date = new Date(dueDate.year, dueDate.month - 1, dueDate.day);
    let dateStr = date.toLocaleDateString();

    if (dueTime) {
        const hours = dueTime.hours || 0;
        const minutes = dueTime.minutes || 0;
        dateStr += ` at ${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    return dateStr;
}

// Show error message
function showError(message) {
    const container = document.getElementById('messageContainer');
    container.innerHTML = `<div class="error-message">❌ ${escapeHtml(message)}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

// Show success message
function showSuccess(message) {
    const container = document.getElementById('messageContainer');
    container.innerHTML = `<div class="success-message">${escapeHtml(message)}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
