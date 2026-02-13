// Login page script

document.addEventListener('DOMContentLoaded', function() {
  // If already logged in, redirect to dashboard
  if (Auth.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }
  
  const form = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');

  // Show success message if redirected after password reset
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === 'success') {
    if (successMessage) {
      successMessage.textContent = 'Password reset successfully. You can sign in now.';
      successMessage.style.display = 'block';
    }
    window.history.replaceState({}, '', '/login');
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';

    try {
      const result = await Auth.signIn(email, password);
      
      if (result.success) {
        window.location.href = '/dashboard';
      } else {
        errorMessage.textContent = Helpers.cleanError(result.error || 'Sign in failed.');
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      errorMessage.textContent = Helpers.cleanError(error);
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
