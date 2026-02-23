// Student Assignment View - Display assignment details in-app

let courseId = null;
let assignmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get assignment info from session storage
    courseId = sessionStorage.getItem('currentCourseId');
    assignmentId = sessionStorage.getItem('currentAssignmentId');

    if (!courseId || !assignmentId) {
        showError('Assignment not found. Please select an assignment from your courses.');
        return;
    }

    loadAssignmentDetails();
});

async function loadAssignmentDetails() {
    try {
        console.log('Loading assignment:', { courseId, assignmentId });

        // Fetch assignment details and submission status
        const [assignmentRes, submissionRes] = await Promise.all([
            fetch(`/api/google-classroom/courses/${courseId}/assignments`, {
                credentials: 'include'
            }),
            fetch(`/api/google-classroom/courses/${courseId}/assignments/${assignmentId}/my-submission`, {
                credentials: 'include'
            })
        ]);

        console.log('Assignment response status:', assignmentRes.status);
        console.log('Submission response status:', submissionRes.status);

        const assignmentData = await assignmentRes.json();
        const submissionData = await submissionRes.json();

        console.log('Assignment data:', assignmentData);
        console.log('Submission data:', submissionData);

        // Check for API errors
        if (!assignmentData.ok) {
            showError(`Failed to load assignments: ${assignmentData.message || 'Unknown error'}`);
            return;
        }

        // Find the specific assignment
        const assignment = assignmentData.assignments?.find(a => a.id === assignmentId);

        if (!assignment) {
            console.error('Assignment not found in list:', assignmentData.assignments);
            console.error('Looking for ID:', assignmentId);
            showError(`Assignment not found. Looking for ID: ${assignmentId}`);
            return;
        }

        const submission = submissionData.submission;

        displayAssignment(assignment, submission);

    } catch (error) {
        console.error('Error loading assignment:', error);
        showError(`Failed to load assignment details: ${error.message}`);
    }
}

function displayAssignment(assignment, submission) {
    // Update page title
    document.getElementById('assignmentTitle').textContent = assignment.title;

    // Format due date
    let dueDateStr = 'No due date';
    if (assignment.dueDate) {
        const { year, month, day } = assignment.dueDate;
        const dueDate = new Date(year, month - 1, day);

        if (assignment.dueTime) {
            const { hours, minutes } = assignment.dueTime;
            dueDate.setHours(hours || 0, minutes || 0);
            dueDateStr = dueDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            });
        } else {
            dueDateStr = dueDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    // Determine submission status
    let statusBadge = '';
    let statusClass = 'status-pending';
    let statusText = 'Not Submitted';

    if (submission) {
        if (submission.state === 'TURNED_IN' || submission.state === 'RETURNED') {
            statusClass = 'status-submitted';
            statusText = 'Submitted';
        }
        if (submission.assignedGrade !== undefined && submission.assignedGrade !== null) {
            statusClass = 'status-graded';
            statusText = `Graded: ${submission.assignedGrade}/${assignment.maxPoints || '?'}`;
        }
    }

    statusBadge = `<span class="status-badge ${statusClass}">${statusText}</span>`;

    // Render assignment details
    const container = document.getElementById('assignmentContent');
    container.innerHTML = `
        <div class="assignment-header">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                <div>
                    <h2 style="margin: 0 0 8px;">${escapeHtml(assignment.title)}</h2>
                    <p style="margin: 0; color: var(--text-muted);">
                        Due: ${dueDateStr} ${assignment.maxPoints ? `• Points: ${assignment.maxPoints}` : ''}
                    </p>
                </div>
                ${statusBadge}
            </div>
        </div>
        
        ${assignment.description ? `
            <div class="assignment-content">
                <h3 style="margin: 0 0 16px;">📋 Instructions</h3>
                <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(assignment.description)}</p>
            </div>
        ` : ''}
        
        ${assignment.materials && assignment.materials.length > 0 ? `
            <div class="materials-section">
                <h3 style="margin: 0 0 16px;">📎 Attached Materials</h3>
                <div style="display: grid; gap: 12px;">
                    ${assignment.materials.map((material, index) => {
        console.log(`Material ${index}:`, material);

        if (material.driveFile) {
            const fileLink = material.driveFile.alternateLink || material.driveFile.driveFile?.alternateLink || '#';
            const fileTitle = material.driveFile.title || material.driveFile.driveFile?.title || 'File';
            console.log('Drive file link:', fileLink);
            return `
                                <div class="material-item">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h4 style="margin: 0 0 4px; font-size: 15px;">📄 ${escapeHtml(fileTitle)}</h4>
                                            ${material.driveFile.thumbnailUrl ? `<img src="${material.driveFile.thumbnailUrl}" style="max-width: 100px; margin-top: 8px; border-radius: 4px;">` : ''}
                                        </div>
                                        <a href="${fileLink}" target="_blank" style="background: #0f62fe; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
                                            Open File
                                        </a>
                                    </div>
                                </div>
                            `;
        } else if (material.link) {
            return `
                                <div class="material-item">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h4 style="margin: 0 0 4px; font-size: 15px;">🔗 ${escapeHtml(material.link.title || 'Link')}</h4>
                                            ${material.link.thumbnailUrl ? `<img src="${material.link.thumbnailUrl}" style="max-width: 100px; margin-top: 8px; border-radius: 4px;">` : ''}
                                        </div>
                                        <a href="${material.link.url}" target="_blank" style="background: #0f62fe; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
                                            Open Link
                                        </a>
                                    </div>
                                </div>
                            `;
        } else if (material.youtubeVideo) {
            return `
                                <div class="material-item">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h4 style="margin: 0 0 4px; font-size: 15px;">🎥 ${escapeHtml(material.youtubeVideo.title || 'Video')}</h4>
                                            ${material.youtubeVideo.thumbnailUrl ? `<img src="${material.youtubeVideo.thumbnailUrl}" style="max-width: 100px; margin-top: 8px; border-radius: 4px;">` : ''}
                                        </div>
                                        <a href="${material.youtubeVideo.alternateLink}" target="_blank" style="background: #0f62fe; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
                                            Watch Video
                                        </a>
                                    </div>
                                </div>
                            `;
        }
        return '';
    }).join('')}
                </div>
            </div>
        ` : ''}
        
        ${submission ? `
            <div class="assignment-content">
                <h3 style="margin: 0 0 16px;">📊 Submission Status</h3>
                <div style="display: grid; gap: 12px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Status:</span>
                        <span style="font-weight: 500;">${getSubmissionStateText(submission.state)}</span>
                    </div>
                    ${submission.assignedGrade !== undefined && submission.assignedGrade !== null ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Grade:</span>
                            <span style="font-weight: 500; color: #34c759;">${submission.assignedGrade} / ${assignment.maxPoints || '?'}</span>
                        </div>
                    ` : ''}
                    ${submission.late ? `
                        <div style="background: rgba(255,59,48,0.1); padding: 12px; border-radius: 8px; color: #ff3b30;">
                            ⚠️ This submission was turned in late
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
        
        <div style="margin-top: 32px; padding: 24px; background: rgba(15,98,254,0.05); border-radius: 12px; border: 1px solid rgba(15,98,254,0.2);">
            <p style="margin: 0 0 16px; color: var(--text-muted);">
                To submit or update your work, please use Google Classroom:
            </p>
            <a href="${assignment.alternateLink}" target="_blank" style="display: inline-block; background: #0f62fe; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Open in Google Classroom →
            </a>
        </div>
    `;
}

function getSubmissionStateText(state) {
    const states = {
        'NEW': 'Not Started',
        'CREATED': 'In Progress',
        'TURNED_IN': 'Submitted',
        'RETURNED': 'Graded & Returned',
        'RECLAIMED_BY_STUDENT': 'Reclaimed'
    };
    return states[state] || state;
}

function showError(message) {
    const container = document.getElementById('assignmentContent');
    container.innerHTML = `
        <div style="text-align: center; padding: 64px; color: #ff3b30;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <p>${escapeHtml(message)}</p>
            <a href="student-courses.html" style="display: inline-block; margin-top: 24px; background: #0f62fe; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                Back to Courses
            </a>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
