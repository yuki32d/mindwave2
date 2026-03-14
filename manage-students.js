// Student Management - Frontend Logic
const API_BASE = window.location.origin;

// State
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
let pageSize = 20;
let selectedStudents = new Set();

// DOM Elements
const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');
const pageSizeSelect = document.getElementById('pageSize');
const refreshBtn = document.getElementById('refreshBtn');
const selectAllCheckbox = document.getElementById('selectAll');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const bulkActionsRow = document.getElementById('bulkActionsRow');
const selectedCountSpan = document.getElementById('selectedCount');
const studentCountSpan = document.getElementById('studentCount');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const tableContainer = document.getElementById('tableContainer');
const studentsTableBody = document.getElementById('studentsTableBody');
const paginationContainer = document.getElementById('paginationContainer');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    loadStudents();
    attachEventListeners();
});

// Event Listeners
function attachEventListeners() {
    searchInput.addEventListener('input', handleSearch);
    dateFilter.addEventListener('change', handleDateFilter);
    pageSizeSelect.addEventListener('change', handlePageSizeChange);
    refreshBtn.addEventListener('click', loadStudents);
    selectAllCheckbox.addEventListener('change', handleSelectAll);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextBtn.addEventListener('click', () => changePage(currentPage + 1));
}

// Load Students from API
async function loadStudents() {
    try {
        showLoading();

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE}/api/admin/students`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.message || 'Failed to load students');
        }

        allStudents = data.students || [];

        // Fetch game submissions for each student
        await enrichStudentsWithGameData();

        applyFilters();
        renderStudents();

    } catch (error) {
        console.error('Error loading students:', error);
        showError(error.message);
    }
}

// Enrich students with game data
async function enrichStudentsWithGameData() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}/api/analytics/students`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.ok && data.students) {
            // Map game data to students
            allStudents = allStudents.map(student => {
                const gameData = data.students.find(s => s.email === student.email);
                return {
                    ...student,
                    gamesPlayed: gameData ? gameData.gamesPlayed : 0,
                    lastActive: gameData ? gameData.lastActive : null
                };
            });
        }
    } catch (error) {
        console.error('Error fetching game data:', error);
        // Continue without game data
    }
}

// Apply Filters
function applyFilters() {
    let filtered = [...allStudents];

    // Search filter
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(student => {
            const name = (student.displayName || student.name || '').toLowerCase();
            const email = (student.email || '').toLowerCase();
            return name.includes(searchTerm) || email.includes(searchTerm);
        });
    }

    // Date filter
    const dateRange = dateFilter.value;
    if (dateRange !== 'all') {
        const daysAgo = parseInt(dateRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

        filtered = filtered.filter(student => {
            const createdAt = new Date(student.createdAt);
            return createdAt >= cutoffDate;
        });
    }

    filteredStudents = filtered;
    currentPage = 1;
    selectedStudents.clear();
    updateBulkActions();
}

// Render Students
function renderStudents() {
    hideLoading();

    if (filteredStudents.length === 0) {
        showEmpty();
        return;
    }

    showTable();

    // Update student count
    studentCountSpan.textContent = `Showing ${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`;

    // Calculate pagination
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
    const pageStudents = filteredStudents.slice(startIndex, endIndex);

    // Render table rows
    studentsTableBody.innerHTML = '';
    pageStudents.forEach(student => {
        const row = createStudentRow(student);
        studentsTableBody.appendChild(row);
    });

    // Update pagination
    updatePagination(totalPages);

    // Update select all checkbox
    selectAllCheckbox.checked = false;
}

// Create Student Card
function createStudentRow(student) {
    const div = document.createElement('div');
    div.className = 'student-card';
    div.dataset.studentId = student._id;

    const isSelected = selectedStudents.has(student._id);
    const joinedDate = formatDate(student.createdAt);
    const lastActive = student.lastActive ? formatRelativeTime(student.lastActive) : 'Never';

    div.innerHTML = `
        <div style="padding-left: 2px;">
            <input type="checkbox" class="student-checkbox" data-student-id="${student._id}" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="student-name">${escapeHtml(student.displayName || student.name)}</div>
        <div class="student-email">${escapeHtml(student.email)}</div>
        <div class="col-hide-md student-meta">${joinedDate}</div>
        <div class="col-hide-sm student-meta">${student.gamesPlayed || 0}</div>
        <div class="col-hide-sm student-meta">${lastActive}</div>
        <div style="text-align: right;">
            <button class="action-btn danger-btn delete-student-btn" 
                    data-student-id="${student._id}" 
                    data-student-name="${escapeHtml(student.displayName || student.name)}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;

    // Add event listeners
    const checkbox = div.querySelector('.student-checkbox');
    checkbox.addEventListener('change', handleStudentCheckbox);

    const deleteBtn = div.querySelector('.delete-student-btn');
    deleteBtn.addEventListener('click', handleDeleteStudent);

    return div;
}

// Handle Search
function handleSearch() {
    applyFilters();
    renderStudents();
}

// Handle Date Filter
function handleDateFilter() {
    applyFilters();
    renderStudents();
}

// Handle Page Size Change
function handlePageSizeChange() {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1;
    renderStudents();
}

// Handle Select All
function handleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    const checkboxes = document.querySelectorAll('.student-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const studentId = checkbox.getAttribute('data-student-id');
        if (isChecked) {
            selectedStudents.add(studentId);
        } else {
            selectedStudents.delete(studentId);
        }
    });

    updateBulkActions();
}

// Handle Student Checkbox
function handleStudentCheckbox(event) {
    const studentId = event.target.getAttribute('data-student-id');

    if (event.target.checked) {
        selectedStudents.add(studentId);
    } else {
        selectedStudents.delete(studentId);
    }

    updateBulkActions();
}

// Update Bulk Actions
function updateBulkActions() {
    const count = selectedStudents.size;

    if (count > 0) {
        bulkActionsRow.style.display = 'flex';
        selectedCountSpan.textContent = `${count} selected`;
    } else {
        bulkActionsRow.style.display = 'none';
    }
}

// Handle Delete Student
async function handleDeleteStudent(event) {
    const studentId = event.target.getAttribute('data-student-id');
    const studentName = event.target.getAttribute('data-student-name');

    await deleteStudents([studentId], [studentName]);
}

// Handle Delete Selected
async function handleDeleteSelected() {
    const studentIds = Array.from(selectedStudents);
    const studentNames = studentIds.map(id => {
        const student = allStudents.find(s => s._id === id);
        return student ? (student.displayName || student.name) : 'Unknown';
    });

    await deleteStudents(studentIds, studentNames);
}

// Delete Students
async function deleteStudents(studentIds, studentNames) {
    const count = studentIds.length;
    const namesList = studentNames.slice(0, 3).join(', ') + (count > 3 ? ` and ${count - 3} more` : '');

    const confirmed = await confirm(
        `Are you sure you want to delete ${count} student${count !== 1 ? 's' : ''}?\n\n` +
        `${namesList}\n\n` +
        `This will permanently remove their records.`,
        "Confirm Deletion"
    );

    if (!confirmed) return;

    try {
        const token = localStorage.getItem('token');

        // Delete each student
        const deletePromises = studentIds.map(studentId =>
            fetch(`${API_BASE}/api/admin/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
        );

        const responses = await Promise.all(deletePromises);

        // Check if all deletions were successful
        const allSuccessful = responses.every(r => r.ok);

        if (allSuccessful) {
            alert(`✅ Successfully deleted ${count} student${count !== 1 ? 's' : ''}!`);
            selectedStudents.clear();
            await loadStudents();
        } else {
            throw new Error('Some deletions failed');
        }

    } catch (error) {
        console.error('Error deleting students:', error);
        alert('❌ Error deleting students. Please try again.');
    }
}

// Change Page
function changePage(newPage) {
    const totalPages = Math.ceil(filteredStudents.length / pageSize);

    if (newPage < 1 || newPage > totalPages) return;

    currentPage = newPage;
    renderStudents();
}

// Update Pagination
function updatePagination(totalPages) {
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// UI State Functions
function showLoading() {
    loadingState.style.display = 'flex';
    emptyState.style.display = 'none';
    tableContainer.style.display = 'none';
    paginationContainer.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
}

function showEmpty() {
    emptyState.style.display = 'flex';
    tableContainer.style.display = 'none';
    paginationContainer.style.display = 'none';
}

function showTable() {
    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';
}

function showError(message) {
    hideLoading();
    emptyState.style.display = 'flex';
    emptyState.querySelector('h3').textContent = 'Error Loading Students';
    emptyState.querySelector('p').textContent = message;
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRelativeTime(dateString) {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return formatDate(dateString);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
