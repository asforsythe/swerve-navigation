const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy /api requests to the Swerve Express server (port 3001)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );

  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    next();
  });
};
