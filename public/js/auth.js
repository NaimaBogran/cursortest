// Authentication utilities for Meeting Tax
// Uses custom authentication (customAuth.ts)

// Store auth state in localStorage
const AUTH_KEY = 'meeting_tax_auth';

// Get current auth state
function getAuth() {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Set auth state
function setAuth(authData) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

// Clear auth state
function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

// Check if user is authenticated
function isAuthenticated() {
  const auth = getAuth();
  return auth && auth.token;
}

// Get session token
function getToken() {
  const auth = getAuth();
  return auth ? auth.token : null;
}

// Get current user from server (validates session)
async function getCurrentUser() {
  const token = getToken();
  if (!token) {
    return null;
  }
  
  try {
    const user = await ConvexApp.query('customAuth:validateSession', { token });
    if (!user) {
      // Session expired, clear local auth
      clearAuth();
    }
    return user;
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

// Sign up with email and password
async function signUp(email, password, name) {
  try {
    const result = await ConvexApp.mutation('customAuth:signUp', {
      email,
      password,
      name,
    });
    
    if (result && result.success) {
      setAuth({
        token: result.token,
        userId: result.userId,
      });
      return { success: true };
    }
    
    return { success: false, error: 'Sign up failed' };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message || 'Sign up failed' };
  }
}

// Sign in with email and password
async function signIn(email, password) {
  try {
    const result = await ConvexApp.mutation('customAuth:signIn', {
      email,
      password,
    });
    
    if (result && result.success) {
      setAuth({
        token: result.token,
        userId: result.userId,
      });
      return { success: true };
    }
    
    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message || 'Sign in failed' };
  }
}

// Sign out
async function signOut() {
  const token = getToken();
  if (token) {
    try {
      await ConvexApp.mutation('customAuth:signOut', { token });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  clearAuth();
  window.location.href = '/login';
}

// Require authentication (redirect if not logged in)
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Require specific role
async function requireRole(allowedRoles) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return false;
  }
  
  if (!allowedRoles.includes(user.role)) {
    alert('You do not have permission to access this page.');
    window.location.href = '/dashboard';
    return false;
  }
  
  return true;
}

// Export for use in other scripts
window.Auth = {
  getAuth,
  setAuth,
  clearAuth,
  isAuthenticated,
  getToken,
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  requireAuth,
  requireRole,
};
