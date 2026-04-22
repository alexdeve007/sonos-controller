// Standalone server — runs Express + Sonos control without Electron
// Use this for headless / always-on operation via launchd
// Start: node server-standalone.js

const { startServer } = require('./electron/server/index');

startServer()
  .then(() => {
    console.log('[standalone] Server started successfully');
  })
  .catch((err) => {
    console.error('[standalone] Failed to start server:', err);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('[standalone] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[standalone] Shutting down...');
  process.exit(0);
});
