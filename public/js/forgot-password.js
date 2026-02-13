// Forgot password page

document.addEventListener('DOMContentLoaded', function() {
  if (Auth.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }

  const form = document.getElementById('forgot-form');
  const errorEl = document.getElementById('error-message');
  const successEl = document.getElementById('success-message');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
      const baseUrl = window.location.origin;
      const result = await ConvexApp.mutation('customAuth:requestPasswordReset', { email, baseUrl });

      if (result.resetLink) {
        successEl.innerHTML = 'Use this link to reset your password (valid for 1 hour):<br><a href="' + result.resetLink + '" class="reset-link">Reset password</a>';
        successEl.style.display = 'block';
        form.reset();
      } else {
        successEl.textContent = 'If that email is registered, a reset link appears above. Otherwise try another email or sign up.';
        successEl.style.display = 'block';
      }
    } catch (error) {
      errorEl.textContent = Helpers.cleanError ? Helpers.cleanError(error) : (error.message || 'Something went wrong.');
      errorEl.style.display = 'block';
    } finally {
      submitBtn.textContent = 'Send reset link';
      submitBtn.disabled = false;
    }
  });
});
