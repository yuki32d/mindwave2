document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    const formSubtitle = document.getElementById('form-subtitle');
    
    let currentMode = 'login'; // 'login' or 'register'

    // Function exposed to toggleMode onClick
    window.toggleMode = (mode) => {
        currentMode = mode;
        
        // Update Tabs UI
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${mode}`).classList.add('active');

        // Update Form UI
        if (mode === 'register') {
            authForm.classList.add('register-mode');
            submitBtn.textContent = 'Create Account';
            formSubtitle.textContent = 'Join our learning community today';
            document.getElementById('name').required = true;
        } else {
            authForm.classList.remove('register-mode');
            submitBtn.textContent = 'Sign In';
            formSubtitle.textContent = 'Welcome back to your learning journey';
            document.getElementById('name').required = false;
        }
        
        // Clear errors
        showError('');
    };

    function showError(msg) {
        if (msg) {
            errorMsg.textContent = msg;
            errorMsg.classList.add('visible');
        } else {
            errorMsg.classList.remove('visible');
            setTimeout(() => { errorMsg.textContent = ''; }, 300);
        }
    }

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showError('');
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value.trim();
        const role = document.getElementById('role').value;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Please wait...';

        try {
            const endpoint = currentMode === 'login' ? '/api/mooc/login' : '/api/mooc/register';
            const payload = currentMode === 'login' 
                ? { email, password } 
                : { email, password, name, role };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.ok) {
                // Store token explicitly if needed, but it's also set in httpOnly cookie
                localStorage.setItem('mindwave_mooc_token', data.token);
                localStorage.setItem('mooc_role', data.user.role);
                localStorage.setItem('mooc_name', data.user.name);
                
                // Redirect based on role
                if (data.user.role === 'super_admin') {
                    window.location.replace('/mooc/admin.html');
                } else if (data.user.role === 'faculty') {
                    window.location.replace('/mooc/courses.html'); // Faculty goes to course directory to enroll/view
                } else {
                    window.location.replace('/mooc/courses.html');
                }
            } else {
                showError(data.message || 'Authentication failed. Please try again.');
            }
        } catch (error) {
            console.error('Auth Error:', error);
            showError('Network error. Please ensure the server is running.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});
