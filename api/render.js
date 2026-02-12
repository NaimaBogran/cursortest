const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const page = req.query.page || 'index';
  
  // Map routes to view files
  const pageMap = {
    '': 'index',
    'index': 'index',
    'login': 'login',
    'signup': 'signup',
    'profile': 'profile',
    'dashboard': 'dashboard',
    'meetings': 'meetings',
    'meeting': 'meeting-detail',
    'rates': 'rates',
    'calendar': 'calendar',
    'admin/users': 'admin/users',
  };

  const viewName = pageMap[page] || 'index';
  const viewPath = path.join(process.cwd(), 'views', `${viewName}.ejs`);

  // Check if view exists
  if (!fs.existsSync(viewPath)) {
    res.status(404).send('Page not found');
    return;
  }

  try {
    const html = await ejs.renderFile(viewPath, {
      page: viewName,
      // Pass Convex URL from environment
      convexUrl: process.env.CONVEX_URL || '',
    }, {
      views: [path.join(process.cwd(), 'views')],
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Render error:', error);
    res.status(500).send('Error rendering page');
  }
};
