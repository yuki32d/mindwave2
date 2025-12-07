// Student Management Functions for Faculty Settings

async function loadStudents() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token');
            return;
        }

        const response = await fetch(window.location.origin + '/api/admin/students', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'Failed to load students');
        }

        renderStudentList(data.students);
    } catch (error) {
        console.error('Error loading students:', error);
        const studentList = document.getElementById('studentList');
        if (studentList) {
            studentList.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 20px;">❌ Error loading students: ' + error.message + '</p>';
        }
    }
}

function renderStudentList(students) {
    const studentList = document.getElementById('studentList');

    if (!studentList) return;

    if (students.length === 0) {
        studentList.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 20px;">No students found.</p>';
        return;
    }

    let html = '';
    students.forEach(function (student) {
        html += '<div class="student-item">';
        html += '<div class="student-info">';
        html += '<strong>' + (student.displayName || student.name) + '</strong>';
        html += '<span>' + student.email + '</span>';
        html += '</div>';
        html += '<button class="delete-student-btn" data-student-id="' + student._id + '" data-student-name="' + (student.displayName || student.name) + '">🗑️ Delete</button>';
        html += '</div>';
    });

    studentList.innerHTML = html;

    // Add event listeners to delete buttons
    const deleteButtons = studentList.querySelectorAll('.delete-student-btn');
    deleteButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            const studentId = this.getAttribute('data-student-id');
            const studentName = this.getAttribute('data-student-name');
            deleteStudent(studentId, studentName);
        });
    });
}

async function deleteStudent(studentId, studentName) {
    const confirmed = confirm('Are you sure you want to delete ' + studentName + '?\n\nThis will:\n- Remove their account\n- Delete all their game submissions\n- Allow them to re-register\n\nThis action cannot be undone.');

    if (!confirmed) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in again');
            return;
        }

        const response = await fetch(window.location.origin + '/api/admin/students/' + studentId, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'Failed to delete student');
        }

        alert('✅ ' + data.student.name + ' has been deleted successfully.\n\nThey can now create a new account.');

        // Reload the student list
        loadStudents();
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('❌ Error: ' + error.message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Load students if the list element exists
    if (document.getElementById('studentList')) {
        loadStudents();
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshStudentsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadStudents);
    }
});
