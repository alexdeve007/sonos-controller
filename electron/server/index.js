const express = require('express');
const path = require('path');
const speakersRouter = require('./routes/speakers');
const groupsRouter = require('./routes/groups');
const playbackRouter = require('./routes/playback');
const tuneinRouter = require('./routes/tunein');
const { discoverSpeakers } = require('./services/discovery');
const Store = require('electron-store');
const os = require('os');

let server = null;
const app = express();

app.use(express.json());

// CORS for dev (Vite runs on 5173) and mobile access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/api', speakersRouter);
app.use('/api', groupsRouter);
app.use('/api', playbackRouter);
app.use('/api', tuneinRouter);

// Serve built client files for mobile/remote access
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return 'localhost';
}

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(3000, '0.0.0.0', async () => {
      const ip = getLocalIp();
      console.log(`Express server running on http://127.0.0.1:3000`);
      console.log(`Mobile access: http://${ip}:3000`);
      const store = new Store();
      if (store.get('autoDiscover', true)) {
        try {
          await discoverSpeakers();
        } catch (err) {
          console.error('Initial discovery failed:', err.message);
        }
      }
      resolve();
    });
  });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startServer, stopServer };
