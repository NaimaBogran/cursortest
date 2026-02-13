const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Convex URL for templates (use CONVEX_URL env in production, e.g. on Vercel)
const CONVEX_URL = process.env.CONVEX_URL || 'https://frugal-dog-686.convex.cloud';

// Routes
app.get('/', (req, res) => {
  res.render('index', { convexUrl: CONVEX_URL });
});

app.get('/login', (req, res) => {
  res.render('login', { convexUrl: CONVEX_URL });
});

app.get('/signup', (req, res) => {
  res.render('signup', { convexUrl: CONVEX_URL });
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { convexUrl: CONVEX_URL });
});

app.get('/reset-password', (req, res) => {
  res.render('reset-password', { convexUrl: CONVEX_URL });
});

app.get('/profile', (req, res) => {
  res.render('profile', { convexUrl: CONVEX_URL });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { convexUrl: CONVEX_URL });
});

app.get('/meetings', (req, res) => {
  res.render('meetings', { convexUrl: CONVEX_URL });
});

app.get('/meeting', (req, res) => {
  res.render('meeting-detail', { convexUrl: CONVEX_URL });
});

app.get('/rates', (req, res) => {
  res.render('rates', { convexUrl: CONVEX_URL });
});

app.get('/calendar', (req, res) => {
  res.render('calendar', { convexUrl: CONVEX_URL });
});

app.get('/admin/users', (req, res) => {
  res.render('admin/users', { convexUrl: CONVEX_URL });
});

app.listen(PORT, () => {
  console.log(`Meeting Tax running at http://localhost:${PORT}`);
  console.log(`Convex URL: ${CONVEX_URL}`);
});
