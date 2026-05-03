const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Proxy /api requests to the Swerve Express server (port 3001)
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathFilter: '/api',
      // Graceful fallback when the Express backend is unreachable
      onError: (err, req, res) => {
        console.warn('[Proxy] Backend unavailable (port 3001):', err.message);
        res.writeHead(504, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable', message: 'Is the Express server running? Try: npm run server' }));
      },
    })
  );

  // NOTE: crossOriginIsolated (SharedArrayBuffer + WASM multi-threading)
  // only activates when the origin is "potentially trustworthy":
  //   • https://*                     (secure)
  //   • http://localhost[:port]        (localhost is always trustworthy)
  //   • http://127.0.0.1[:port]       (loopback)
  // Accessing via http://0.0.0.0:3000 or a LAN IP will show a console
  // warning and COOP/COEP will be ignored. Use http://localhost:3000
  // for local dev, or serve over HTTPS for mobile testing.
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });
};
