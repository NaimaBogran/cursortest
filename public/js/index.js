// Index page script

document.addEventListener('DOMContentLoaded', function() {
  // If user is logged in, redirect to dashboard
  if (Auth.isAuthenticated()) {
    const heroActions = document.getElementById('hero-actions');
    if (heroActions) {
      heroActions.innerHTML = `
        <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
      `;
    }
  }
});
