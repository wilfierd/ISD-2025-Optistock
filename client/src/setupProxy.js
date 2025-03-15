const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Enable CORS
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
  });
  
  // Set up proxy for API requests
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding
      },
    })
  );
};