// Navigation management for Meeting Tax

document.addEventListener('DOMContentLoaded', async function() {
  await updateNavigation();
});

async function updateNavigation() {
  const navLinks = document.getElementById('nav-links');
  const navUser = document.getElementById('nav-user');
  
  if (!navLinks || !navUser) return;
  
  const isLoggedIn = Auth.isAuthenticated();
  
  if (isLoggedIn) {
    const user = await Auth.getCurrentUser();
    
    if (user) {
      // Build navigation based on role
      let links = `
        <a href="/dashboard" class="${isCurrentPage('dashboard') ? 'active' : ''}">Dashboard</a>
        <a href="/meetings" class="${isCurrentPage('meetings') ? 'active' : ''}">Meetings</a>
        <a href="/calendar" class="${isCurrentPage('calendar') ? 'active' : ''}">Calendar</a>
      `;
      
      // Admin-only links
      if (user.role === 'Admin') {
        links += `
          <a href="/rates" class="${isCurrentPage('rates') ? 'active' : ''}">Rates</a>
          <a href="/admin/users" class="${isCurrentPage('admin/users') ? 'active' : ''}">Users</a>
        `;
      }
      
      navLinks.innerHTML = links;
      
      // User info
      navUser.innerHTML = `
        <div class="user-info">
          <div class="user-name">${user.name || user.email}</div>
          <div class="user-role">${user.role}</div>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="Auth.signOut()">Sign Out</button>
      `;
    } else {
      // User not found in database, redirect to profile setup
      if (!isCurrentPage('profile') && !isCurrentPage('login') && !isCurrentPage('signup')) {
        window.location.href = '/profile';
      }
    }
  } else {
    // Not logged in
    navLinks.innerHTML = '';
    navUser.innerHTML = `
      <a href="/login" class="btn btn-secondary btn-sm">Sign In</a>
      <a href="/signup" class="btn btn-primary btn-sm">Sign Up</a>
    `;
    
    // Update hero actions if on index page
    const heroActions = document.getElementById('hero-actions');
    if (heroActions) {
      heroActions.innerHTML = `
        <a href="/login" class="btn btn-primary">Sign In</a>
        <a href="/signup" class="btn btn-secondary">Get Started</a>
      `;
    }
  }
}

function isCurrentPage(page) {
  const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
  return path === page || (path === '' && page === 'index');
}

// Helper function to format currency
function formatCurrency(cents) {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Helper function to format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Helper function to format duration
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Export helpers
window.Helpers = {
  formatCurrency,
  formatDate,
  formatDuration,
};
