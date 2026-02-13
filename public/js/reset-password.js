// Reset password page (linked from forgot-password or email)

document.addEventListener('DOMContentLoaded', function() {
  if (Auth.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) {
    document.getElementById('error-message').textContent = 'Missing reset link. Please use the link from your email or request a new one.';
    document.getElementById('error-message').style.display = 'block';
    document.getElementById('reset-form').querySelector('button[type="submit"]').disabled = true;
    return;
  }

  const form = document.getElementById('reset-form');
  const errorEl = document.getElementById('error-message');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    errorEl.style.display = 'none';

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      errorEl.style.display = 'block';
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Resetting...';
    submitBtn.disabled = true;

    try {
      await ConvexApp.mutation('customAuth:resetPassword', { token, newPassword: password });
      errorEl.style.display = 'none';
      window.location.href = '/login?reset=success';
    } catch (error) {
      errorEl.textContent = Helpers.cleanError ? Helpers.cleanError(error) : (error.message || 'Something went wrong.');
      errorEl.style.display = 'block';
    } finally {
      submitBtn.textContent = 'Reset password';
      submitBtn.disabled = false;
    }
  });
});
