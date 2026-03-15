// faculty-ai-config.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial UI Setup
    const courseSelect = document.getElementById('courseSelect');
    const syncBtn = document.getElementById('syncBtn');
    const syncText = document.getElementById('syncText');
    const syncSpinner = document.getElementById('syncSpinner');
    const syncStatus = document.getElementById('syncStatus');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    let isSyncing = false;

    // Helper: Show Toast
    function showToast(message, type = 'success') {
        toastMsg.textContent = message;
        toast.className = `toast show ${type}`;
        
        if (type === 'success') {
            toastIcon.setAttribute('data-lucide', 'check-circle');
            toastIcon.style.color = 'var(--green)';
        } else {
            toastIcon.setAttribute('data-lucide', 'alert-circle');
            toastIcon.style.color = 'var(--red)';
        }
        lucide.createIcons();

        setTimeout(() => {
            toast.className = 'toast';
        }, 4000);
    }

    // 2. Load Google Classroom Courses
    async function loadCourses() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/google-classroom/courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('[Course Load Detail]', { status: res.status, data: errData });
                
                if (res.status === 401) {
                    courseSelect.innerHTML = '<option value="">Google Classroom Not Connected</option>';
                    syncBtn.disabled = true;
                    showToast('Please connect Google Classroom in settings first', 'error');
                    return;
                }
                throw new Error(errData.message || 'Failed to load courses');
            }

            const data = await res.json();
            
            if (data.courses && data.courses.length > 0) {
                courseSelect.innerHTML = '<option value="">-- Select a Course to Sync --</option>';
                data.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.id;
                    option.textContent = course.name;
                    courseSelect.appendChild(option);
                });
                syncBtn.disabled = false;
            } else {
                courseSelect.innerHTML = '<option value="">No Active Courses Found</option>';
                syncBtn.disabled = true;
            }

        } catch (error) {
            console.error('Error loading courses:', error);
            courseSelect.innerHTML = '<option value="">Error Loading Courses</option>';
            syncBtn.disabled = true;
            showToast(error.message || 'Failed to connect to Google Classroom', 'error');
        }
    }

    // 3. Handle Manual Sync Form Submit
    syncBtn.addEventListener('click', async () => {
        if (isSyncing) return;
        
        const courseId = courseSelect.value;
        if (!courseId) {
            showToast("Please select a course first", "error");
            return;
        }

        // Update UI to loading state
        isSyncing = true;
        syncBtn.disabled = true;
        syncText.textContent = "Syncing and Chunking Documents...";
        syncSpinner.style.display = "block";
        syncStatus.textContent = "This may take a minute depending on the amount of attached Drive files.";

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/sync-classroom', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ courseId })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || "Manual sync failed");
            }

            showToast(result.message || "Course Material Synced!", "success");
            syncStatus.textContent = result.message;
            syncStatus.style.color = "var(--green)";

        } catch (err) {
            console.error(err);
            showToast(err.message, "error");
            syncStatus.textContent = `Sync Failed: ${err.message}`;
            syncStatus.style.color = "var(--red)";
        } finally {
            isSyncing = false;
            syncBtn.disabled = false;
            syncText.textContent = "Sync Course Materials to Sage";
            syncSpinner.style.display = "none";
        }
    });

    // 4. Initialize
    await loadCourses();
});
