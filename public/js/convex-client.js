// Convex Client Initialization
// This file sets up the Convex client for use across all pages

// Your Convex deployment URL (from server env, localStorage, or fallback)
const DEFAULT_CONVEX_URL = 'https://frugal-dog-686.convex.cloud';
const CONVEX_URL = (typeof window !== 'undefined' && window.__CONVEX_URL) || localStorage.getItem('CONVEX_URL') || DEFAULT_CONVEX_URL;

let convexClient = null;
let initPromise = null;

// Initialize Convex client
function initConvex(url) {
  if (!url) {
    console.error('Convex URL not set');
    return null;
  }
  
  // Check if Convex library is loaded (lowercase 'convex')
  if (typeof convex === 'undefined') {
    console.error('Convex library not loaded');
    return null;
  }
  
  try {
    convexClient = new convex.ConvexClient(url);
    console.log('Convex client initialized with URL:', url);
    return convexClient;
  } catch (error) {
    console.error('Failed to initialize Convex client:', error);
    return null;
  }
}

// Wait for Convex library to load then initialize
function waitForConvex() {
  if (initPromise) return initPromise;
  
  initPromise = new Promise((resolve) => {
    // Check if already available (lowercase 'convex')
    if (typeof convex !== 'undefined') {
      const client = initConvex(CONVEX_URL);
      resolve(client);
      return;
    }
    
    // Wait for it to load
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (typeof convex !== 'undefined') {
        clearInterval(checkInterval);
        const client = initConvex(CONVEX_URL);
        resolve(client);
      } else if (attempts > 50) {
        clearInterval(checkInterval);
        console.error('Convex library failed to load after 5 seconds');
        resolve(null);
      }
    }, 100);
  });
  
  return initPromise;
}

// Get Convex client instance
function getConvex() {
  if (!convexClient) {
    // Try to initialize synchronously (lowercase 'convex')
    if (typeof convex !== 'undefined') {
      convexClient = initConvex(CONVEX_URL);
    }
  }
  return convexClient;
}

// Set Convex URL (for initial setup)
function setConvexUrl(url) {
  localStorage.setItem('CONVEX_URL', url);
  convexClient = initConvex(url);
}

// Query helper
async function convexQuery(functionName, args = {}) {
  let client = getConvex();
  if (!client) {
    // Wait for initialization
    client = await waitForConvex();
  }
  if (!client) {
    throw new Error('Convex client not initialized. Please refresh the page.');
  }
  return await client.query(functionName, args);
}

// Mutation helper
async function convexMutation(functionName, args = {}) {
  let client = getConvex();
  if (!client) {
    // Wait for initialization
    client = await waitForConvex();
  }
  if (!client) {
    throw new Error('Convex client not initialized. Please refresh the page.');
  }
  return await client.mutation(functionName, args);
}

// Action helper
async function convexAction(functionName, args = {}) {
  let client = getConvex();
  if (!client) {
    // Wait for initialization
    client = await waitForConvex();
  }
  if (!client) {
    throw new Error('Convex client not initialized. Please refresh the page.');
  }
  return await client.action(functionName, args);
}

// Subscribe to query updates (real-time)
function convexSubscribe(functionName, args, callback) {
  const client = getConvex();
  if (!client) {
    console.error('Convex client not initialized');
    return () => {};
  }
  return client.onUpdate(functionName, args, callback);
}

// Set auth token for authenticated requests
function setConvexAuth(token) {
  const client = getConvex();
  if (client && token) {
    client.setAuth(async () => token);
  }
}

// Clear auth
function clearConvexAuth() {
  const client = getConvex();
  if (client) {
    client.clearAuth();
  }
}

// Auto-initialize when script loads (lowercase 'convex')
if (typeof convex !== 'undefined') {
  initConvex(CONVEX_URL);
} else {
  // Start waiting for Convex library
  waitForConvex();
}

// Export for use in other scripts
window.ConvexApp = {
  getConvex,
  setConvexUrl,
  query: convexQuery,
  mutation: convexMutation,
  action: convexAction,
  subscribe: convexSubscribe,
  setAuth: setConvexAuth,
  clearAuth: clearConvexAuth,
  waitForConvex,
};

console.log('ConvexApp loaded, URL:', CONVEX_URL);
