// Faculty Management – manage-faculty.js
// HOD-only page. Mirrors manage-students.js logic.
const API_BASE = window.location.origin;

let allFaculty = [];
let filteredFaculty = [];
let currentPage = 1;
let pageSize = 20;
let selectedFaculty = new Set();

// DOM refs (set after DOMContentLoaded)
let searchInput, pageSizeSelect, refreshBtn, selectAllCheckbox;
let deleteSelectedBtn, bulkActionsRow, selectedCountSpan, facultyCountSpan;
let loadingState, emptyState, tableContainer, facultyTableBody;
let paginationContainer, prevBtn, nextBtn, currentPageSpan, totalPagesSpan;

document.addEventListener('DOMContentLoaded', async () => {
    searchInput       = document.getElementById('searchInput');
    pageSizeSelect    = document.getElementById('pageSize');
    refreshBtn        = document.getElementById('refreshBtn');
    selectAllCheckbox = document.getElementById('selectAll');
    deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    bulkActionsRow    = document.getElementById('bulkActionsRow');
    selectedCountSpan = document.getElementById('selectedCount');
    facultyCountSpan  = document.getElementById('facultyCount');
    loadingState      = document.getElementById('loadingState');
    emptyState        = document.getElementById('emptyState');
    tableContainer    = document.getElementById('tableContainer');
    facultyTableBody  = document.getElementById('facultyTableBody');
    paginationContainer = document.getElementById('paginationContainer');
    prevBtn           = document.getElementById('prevBtn');
    nextBtn           = document.getElementById('nextBtn');
    currentPageSpan   = document.getElementById('currentPage');
    totalPagesSpan    = document.getElementById('totalPages');

    // Verify HOD access before showing content
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        const data = await res.json();
        if (!data.ok || !data.user) {
            showAccessDenied(); return;
        }
        const SUPER_ADMIN = 'jeeban.mca@cmrit.ac.in';
        const HOD_RE = /^hod\.([a-z]+)@cmrit\.ac\.in$/i;
        const isHod = data.user.isHod === true || data.user.email === SUPER_ADMIN || HOD_RE.test(data.user.email || '');
        if (!isHod) { showAccessDenied(); return; }
    } catch (e) {
        showAccessDenied(); return;
    }

    document.getElementById('mainContent').style.display = 'block';
    attachEventListeners();
    loadFaculty();
});

function showAccessDenied() {
    document.getElementById('accessDeniedState').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
}

function attachEventListeners() {
    searchInput.addEventListener('input', () => { applyFilters(); renderFaculty(); });
    pageSizeSelect.addEventListener('change', () => { pageSize = parseInt(pageSizeSelect.value); currentPage = 1; renderFaculty(); });
    refreshBtn.addEventListener('click', loadFaculty);
    selectAllCheckbox.addEventListener('change', handleSelectAll);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    nextBtn.addEventListener('click', () => changePage(currentPage + 1));
}

async function loadFaculty() {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/admin/faculty`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Failed to load faculty');
        allFaculty = data.faculty || [];
        applyFilters();
        renderFaculty();
    } catch (err) {
        console.error('Error loading faculty:', err);
        showError(err.message);
    }
}

function applyFilters() {
    let result = [...allFaculty];
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (term) {
        result = result.filter(f => {
            const name  = (f.displayName || f.name || '').toLowerCase();
            const email = (f.email || '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });
    }
    filteredFaculty = result;
    currentPage = 1;
    selectedFaculty.clear();
    updateBulkActions();
}

function renderFaculty() {
    hideLoading();
    if (filteredFaculty.length === 0) { showEmpty(); return; }
    showTable();

    facultyCountSpan.textContent = `${filteredFaculty.length} faculty member${filteredFaculty.length !== 1 ? 's' : ''}`;

    const totalPages = Math.ceil(filteredFaculty.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const page  = filteredFaculty.slice(start, start + pageSize);

    facultyTableBody.innerHTML = '';
    page.forEach(f => facultyTableBody.appendChild(createFacultyRow(f)));
    updatePagination(totalPages);
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
}

function createFacultyRow(faculty) {
    const div = document.createElement('div');
    div.className = 'faculty-card';
    div.dataset.facultyId = faculty._id;

    const isSelected  = selectedFaculty.has(faculty._id);
    const joined      = formatDate(faculty.createdAt);
    const name        = faculty.displayName || faculty.name || 'Unknown';
    const initials    = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    const dept        = faculty.department || '—';
    const sections    = Array.isArray(faculty.facultySections) && faculty.facultySections.length
                        ? faculty.facultySections.join(', ') : '—';

    div.innerHTML = `
        <div style="padding-left:2px;">
            <input type="checkbox" class="faculty-checkbox" data-faculty-id="${faculty._id}" ${isSelected ? 'checked' : ''}>
        </div>
        <div class="faculty-avatar">${escapeHtml(initials)}</div>
        <div class="faculty-name">${escapeHtml(name)}</div>
        <div class="faculty-email">${escapeHtml(faculty.email || '')}</div>
        <div class="col-hide-md">
            <span class="dept-badge">${escapeHtml(dept)}</span>
        </div>
        <div class="col-hide-md faculty-meta">${joined}</div>
        <div class="col-hide-sm faculty-meta">${escapeHtml(sections)}</div>
        <div style="text-align:right;">
            <button class="action-btn danger-btn delete-faculty-btn"
                data-faculty-id="${faculty._id}"
                data-faculty-name="${escapeHtml(name)}">
                <i class="fas fa-user-times"></i>
            </button>
        </div>
    `;

    div.querySelector('.faculty-checkbox').addEventListener('change', e => {
        const id = e.target.getAttribute('data-faculty-id');
        if (e.target.checked) selectedFaculty.add(id); else selectedFaculty.delete(id);
        updateBulkActions();
    });

    div.querySelector('.delete-faculty-btn').addEventListener('click', e => {
        const btn = e.currentTarget;
        deleteFaculty([btn.getAttribute('data-faculty-id')], [btn.getAttribute('data-faculty-name')]);
    });

    return div;
}

function handleSelectAll() {
    const checked = selectAllCheckbox.checked;
    document.querySelectorAll('.faculty-checkbox').forEach(cb => {
        cb.checked = checked;
        const id = cb.getAttribute('data-faculty-id');
        if (checked) selectedFaculty.add(id); else selectedFaculty.delete(id);
    });
    updateBulkActions();
}

function handleDeleteSelected() {
    const ids   = Array.from(selectedFaculty);
    const names = ids.map(id => {
        const f = allFaculty.find(x => x._id === id);
        return f ? (f.displayName || f.name) : 'Unknown';
    });
    deleteFaculty(ids, names);
}

async function deleteFaculty(ids, names) {
    const count     = ids.length;
    const namesList = names.slice(0,3).join(', ') + (count > 3 ? ` and ${count-3} more` : '');
    const confirmed = await confirm(
        `Remove ${count} faculty member${count !== 1 ? 's' : ''}?\n\n${namesList}\n\nThis will permanently delete their accounts.`,
        'Confirm Removal'
    );
    if (!confirmed) return;

    try {
        const token = localStorage.getItem('token');
        const results = await Promise.all(ids.map(id =>
            fetch(`${API_BASE}/api/admin/faculty/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ));
        const allOk = results.every(r => r.ok);
        if (allOk) {
            alert(`✅ Successfully removed ${count} faculty member${count !== 1 ? 's' : ''}!`);
            selectedFaculty.clear();
            await loadFaculty();
        } else {
            alert('⚠️ Some deletions failed. Please try again.');
        }
    } catch (err) {
        console.error('Delete faculty error:', err);
        alert('❌ Error removing faculty. Please try again.');
    }
}

function updateBulkActions() {
    const count = selectedFaculty.size;
    if (count > 0) {
        bulkActionsRow.style.display = 'flex';
        selectedCountSpan.textContent = `${count} selected`;
    } else {
        bulkActionsRow.style.display = 'none';
    }
}

function changePage(p) {
    const total = Math.ceil(filteredFaculty.length / pageSize);
    if (p < 1 || p > total) return;
    currentPage = p;
    renderFaculty();
}

function updatePagination(total) {
    if (total <= 1) { paginationContainer.style.display = 'none'; return; }
    paginationContainer.style.display = 'flex';
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent  = total;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === total;
}

// UI helpers
function showLoading()       { loadingState.style.display = 'flex'; emptyState.style.display = 'none'; tableContainer.style.display = 'none'; paginationContainer.style.display = 'none'; }
function hideLoading()       { loadingState.style.display = 'none'; }
function showEmpty()         { emptyState.style.display = 'flex'; tableContainer.style.display = 'none'; paginationContainer.style.display = 'none'; }
function showTable()         { emptyState.style.display = 'none'; tableContainer.style.display = 'block'; }
function showError(message)  { hideLoading(); emptyState.style.display = 'flex'; emptyState.querySelector('h3').textContent = 'Error Loading Faculty'; emptyState.querySelector('p').textContent = message; }

// Utilities
function formatDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
