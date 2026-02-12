// Signup page script

document.addEventListener('DOMContentLoaded', function() {
  // If already logged in, redirect to dashboard
  if (Auth.isAuthenticated()) {
    window.location.href = '/dashboard';
    return;
  }
  
  const form = document.getElementById('signup-form');
  const errorMessage = document.getElementById('error-message');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;
    
    errorMessage.style.display = 'none';
    
    try {
      const result = await Auth.signUp(email, password, name);
      
      if (result.success) {
        window.location.href = '/dashboard';
      } else {
        errorMessage.textContent = result.error || 'Sign up failed. Please try again.';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      errorMessage.textContent = 'An error occurred. Please try again.';
      errorMessage.style.display = 'block';
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});
