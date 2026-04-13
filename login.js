document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        errorMessageDiv.textContent = '';

        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const roleInput = document.querySelector('input[name="role"]:checked');
        const role = roleInput ? roleInput.value : 'student';

        if (!email || !password) {
            errorMessageDiv.textContent = 'Email and password are required.';
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, role })
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('email', email);
                localStorage.setItem('role', role);
                localStorage.setItem('token', data.token);

                if (role === 'admin') {
                    window.location.replace('admin.html');
                } else {
                    window.location.replace('homepage.html');
                }
            } else {
                errorMessageDiv.textContent = data.message || 'Login failed. Please try again.';
            }
        } catch (err) {
            errorMessageDiv.textContent = 'Network error. Please try again later.';
        }
    });
});
