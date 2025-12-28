/**
 * Organization Setup - Professional JavaScript
 * Handles multi-step wizard, form validation, and API integration
 */

// ===================================
// State Management
// ===================================

const setupState = {
    currentStep: 1,
    totalSteps: 5,
    selectedPlan: null,
    organizationData: {
        name: '',
        type: '',
        size: '',
        logo: null,
        subdomain: '',
        timezone: '',
        language: 'en',
        academicYear: '',
        plan: '',
        invites: []
    }
};

// ===================================
// DOM Elements
// ===================================

const elements = {
    steps: document.querySelectorAll('.setup-step'),
    progressSteps: document.querySelectorAll('.step'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadSavedProgress();
    // checkUserAuthentication(); // Removed - function doesn't exist and blocks setup
});

function initializeEventListeners() {
    // Step 1
    document.getElementById('step1Next')?.addEventListener('click', () => validateAndNext(1));

    // Step 2
    document.getElementById('step2Back')?.addEventListener('click', () => goToStep(1));
    document.getElementById('step2Next')?.addEventListener('click', () => validateAndNext(2));
    document.getElementById('subdomain')?.addEventListener('input', debounce(checkSubdomainAvailability, 500));

    // Step 3
    document.getElementById('step3Back')?.addEventListener('click', () => goToStep(2));
    document.getElementById('step3Next')?.addEventListener('click', () => validateAndNext(3));
    document.querySelectorAll('.btn-plan').forEach(btn => {
        btn.addEventListener('click', selectPlan);
    });

    // Step 4
    document.getElementById('step4Back')?.addEventListener('click', () => goToStep(3));
    document.getElementById('step4Next')?.addEventListener('click', sendInvitesAndContinue);
    document.getElementById('step4Skip')?.addEventListener('click', () => goToStep(5));
    document.getElementById('addMoreEmails')?.addEventListener('click', addEmailInviteRow);

    // Invite method toggle
    document.querySelectorAll('.invite-method').forEach(method => {
        method.addEventListener('click', toggleInviteMethod);
    });

    // Step 5
    document.getElementById('goToDashboard')?.addEventListener('click', goToDashboard);

    // Header actions
    document.getElementById('saveProgressBtn')?.addEventListener('click', saveProgress);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

// ===================================
// Authentication Check
// ===================================

function checkUserAuthentication() {
    const authToken = localStorage.getItem('auth_token');
    const userName = localStorage.getItem('user_name');

    if (!authToken) {
        window.location.href = '/marketing-site/website-signup.html';
        return;
    }

    // Check if user already has an organization (for returning users)
    checkExistingOrganization();
}

async function checkExistingOrganization() {
    try {
        // Only check via API - don't trust localStorage
        const response = await fetch('/api/me', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        if (!response.ok) {
            console.log('API check failed, allowing setup to continue');
            return;
        }

        const data = await response.json();

        // Only redirect if user ACTUALLY has an organization in the database
        if (data.ok && data.user && (data.user.organizationId || data.user.orgRole)) {
            console.log('User has organization in database, redirecting to dashboard...');

            // Update local storage with verified organization data
            const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
            const updatedUser = {
                ...user,
                organizationId: data.user.organizationId,
                orgRole: data.user.orgRole,
                userType: data.user.userType || 'organization'
            };

            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
            }

            window.location.href = '/marketing-site/modern-dashboard.html';
        } else {
            console.log('User does not have organization, continuing with setup...');
        }
    } catch (error) {
        console.error('Error checking organization:', error);
        // On error, allow setup to continue
    }
}

// ===================================
// Step Navigation
// ===================================

function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > setupState.totalSteps) return;

    // Hide all steps
    elements.steps.forEach(step => step.classList.remove('active'));

    // Show target step
    const targetStep = document.getElementById(`step${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }

    // Update progress stepper
    elements.progressSteps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');

        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });

    setupState.currentStep = stepNumber;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateAndNext(currentStep) {
    if (validateStep(currentStep)) {
        saveStepData(currentStep);
        goToStep(currentStep + 1);

        // If moving to step 5, populate summary
        if (currentStep + 1 === 5) {
            populateSummary();
            createOrganization();
        }
    }
}

// ===================================
// Validation
// ===================================

function validateStep(stepNumber) {
    switch (stepNumber) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return true; // Optional step
        default:
            return true;
    }
}

function validateStep1() {
    const orgName = document.getElementById('orgName').value.trim();
    const orgType = document.getElementById('orgType').value;
    const orgSize = document.getElementById('orgSize').value;

    if (!orgName) {
        showError('Please enter your organization name');
        return false;
    }

    if (!orgType) {
        showError('Please select your organization type');
        return false;
    }

    if (!orgSize) {
        showError('Please select your expected number of students');
        return false;
    }

    return true;
}

function validateStep2() {
    const subdomain = document.getElementById('subdomain').value.trim();
    const timezone = document.getElementById('timezone').value;

    if (!subdomain) {
        showError('Please enter a workspace URL');
        return false;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        showError('Workspace URL can only contain lowercase letters, numbers, and hyphens');
        return false;
    }

    if (!timezone) {
        showError('Please select a timezone');
        return false;
    }

    return true;
}

function validateStep3() {
    if (!setupState.selectedPlan) {
        showError('Please select a plan to continue');
        return false;
    }
    return true;
}

// ===================================
// Save Step Data
// ===================================

function saveStepData(stepNumber) {
    switch (stepNumber) {
        case 1:
            setupState.organizationData.name = document.getElementById('orgName').value.trim();
            setupState.organizationData.type = document.getElementById('orgType').value;
            setupState.organizationData.size = document.getElementById('orgSize').value;
            break;
        case 2:
            setupState.organizationData.subdomain = document.getElementById('subdomain').value.trim();
            setupState.organizationData.timezone = document.getElementById('timezone').value;
            setupState.organizationData.language = document.getElementById('language').value;
            setupState.organizationData.academicYear = document.getElementById('academicYear').value.trim();
            break;
        case 3:
            setupState.organizationData.plan = setupState.selectedPlan;
            break;
    }

    saveProgress();
}

// ===================================
// Subdomain Availability Check
// ===================================

async function checkSubdomainAvailability() {
    const subdomain = document.getElementById('subdomain').value.trim();
    const statusEl = document.getElementById('subdomainStatus');

    if (!subdomain) {
        statusEl.textContent = '';
        return;
    }

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
        statusEl.textContent = '❌ Only lowercase letters, numbers, and hyphens allowed';
        statusEl.className = 'status-message error';
        return;
    }

    statusEl.textContent = '⏳ Checking availability...';
    statusEl.className = 'status-message';

    try {
        const response = await fetch(`/api/organizations/check-subdomain?subdomain=${subdomain}`);
        const data = await response.json();

        if (data.available) {
            statusEl.textContent = '✓ Available!';
            statusEl.className = 'status-message success';
        } else {
            statusEl.textContent = '❌ This subdomain is already taken';
            statusEl.className = 'status-message error';
        }
    } catch (error) {
        statusEl.textContent = '';
    }
}

// ===================================
// Plan Selection
// ===================================

function selectPlan(e) {
    const card = e.target.closest('.pricing-card');
    const plan = card.dataset.plan;

    // Remove selection from all cards
    document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));

    // Select this card
    card.classList.add('selected');
    setupState.selectedPlan = plan;

    // Enable next button
    document.getElementById('step3Next').disabled = false;
}

// ===================================
// Team Invitations
// ===================================

function toggleInviteMethod(e) {
    const method = e.currentTarget.dataset.method;

    // Update active method
    document.querySelectorAll('.invite-method').forEach(m => m.classList.remove('active'));
    e.currentTarget.classList.add('active');

    // Show corresponding content
    document.querySelectorAll('.invite-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${method}Invite`).classList.add('active');
}

function addEmailInviteRow() {
    const container = document.querySelector('.email-invites');
    const row = document.createElement('div');
    row.className = 'email-invite-row';
    row.innerHTML = `
        <input type="email" placeholder="colleague@example.com" class="invite-email">
        <select class="invite-role">
            <option value="admin">Admin</option>
            <option value="faculty">Faculty</option>
        </select>
        <button class="btn-icon" title="Remove" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(row);
}

async function sendInvitesAndContinue() {
    const invites = [];

    document.querySelectorAll('.email-invite-row').forEach(row => {
        const email = row.querySelector('.invite-email').value.trim();
        const role = row.querySelector('.invite-role').value;

        if (email) {
            invites.push({ email, role });
        }
    });

    setupState.organizationData.invites = invites;

    if (invites.length > 0) {
        showLoading('Sending invitations...');

        try {
            await fetch('/api/organizations/send-invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ invites })
            });
        } catch (error) {
            console.error('Error sending invites:', error);
        }

        hideLoading();
    }

    goToStep(5);
}

// ===================================
// Organization Creation
// ===================================

async function createOrganization() {
    showLoading('Creating your organization...');

    try {
        // Log what we're sending
        console.log('Creating organization with data:', setupState.organizationData);

        const response = await fetch('/api/organizations/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(setupState.organizationData)
        });

        const data = await response.json();

        console.log('Server response:', data);

        if (data.ok) {
            // Store organization ID and data
            localStorage.setItem('organization_id', data.organization._id);
            localStorage.setItem('organization_name', setupState.organizationData.name);
            localStorage.setItem('organization_type', setupState.organizationData.type);

            // Update user object with organization info
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.organizationId = data.organization._id;
            user.orgRole = 'owner';
            user.userType = 'organization';
            localStorage.setItem('user', JSON.stringify(user));

            localStorage.removeItem('needs_org_setup');

            hideLoading();
        } else {
            throw new Error(data.message || 'Failed to create organization');
        }
    } catch (error) {
        console.error('Organization creation error:', error);
        hideLoading();
        showError('Failed to create organization: ' + error.message);
        throw error; // Re-throw to prevent redirect
    }
}

// ===================================
// Summary Population
// ===================================

function populateSummary() {
    document.getElementById('summaryOrgName').textContent = setupState.organizationData.name;
    document.getElementById('summaryOrgType').textContent = formatOrgType(setupState.organizationData.type);
    document.getElementById('summarySubdomain').textContent = `${setupState.organizationData.subdomain}.mindwave.com`;
    document.getElementById('summaryPlan').textContent = formatPlanName(setupState.organizationData.plan);
}

function formatOrgType(type) {
    const types = {
        'university': 'University',
        'school': 'School / K-12',
        'training': 'Training Center',
        'corporate': 'Corporate Training',
        'bootcamp': 'Coding Bootcamp',
        'other': 'Other'
    };
    return types[type] || type;
}

function formatPlanName(plan) {
    return plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
}

// ===================================
// Progress Management
// ===================================

function saveProgress() {
    localStorage.setItem('org_setup_progress', JSON.stringify({
        step: setupState.currentStep,
        data: setupState.organizationData,
        selectedPlan: setupState.selectedPlan
    }));

    showSuccess('Progress saved!');
}

function loadSavedProgress() {
    const saved = localStorage.getItem('org_setup_progress');

    if (saved) {
        try {
            const progress = JSON.parse(saved);
            setupState.organizationData = progress.data || {};
            setupState.selectedPlan = progress.selectedPlan;

            // Populate form fields
            if (setupState.organizationData.name) {
                document.getElementById('orgName').value = setupState.organizationData.name;
            }
            if (setupState.organizationData.type) {
                document.getElementById('orgType').value = setupState.organizationData.type;
            }
            // ... populate other fields
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }
}

// ===================================
// Navigation
// ===================================

async function goToDashboard() {
    // Create organization in backend before going to dashboard
    await createOrganization();

    localStorage.removeItem('org_setup_progress');

    // Store the selected plan for future reference
    if (setupState.selectedPlan) {
        localStorage.setItem('selected_plan', setupState.selectedPlan);
    }

    // Redirect directly to the dashboard after organization setup
    window.location.href = '/marketing-site/modern-dashboard.html';
}

function logout() {
    if (confirm('Are you sure you want to sign out? Your progress will be saved.')) {
        saveProgress();
        localStorage.removeItem('auth_token');
        window.location.href = '/marketing-site/website-signup.html';
    }
}

// ===================================
// UI Helpers
// ===================================

function showLoading(message = 'Loading...') {
    const overlay = elements.loadingOverlay;
    overlay.querySelector('p').textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    // You can implement a toast notification here
    console.log('✓ ' + message);
}

// ===================================
// Utility Functions
// ===================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
