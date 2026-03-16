const express = require('express');
const speakersRouter = require('./routes/speakers');
const groupsRouter = require('./routes/groups');
const playbackRouter = require('./routes/playback');
const tuneinRouter = require('./routes/tunein');
const { discoverSpeakers } = require('./services/discovery');
const Store = require('electron-store');

let server = null;
const app = express();

app.use(express.json());

// CORS for dev (Vite runs on 5173)
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

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(3000, '127.0.0.1', async () => {
      console.log('Express server running on http://127.0.0.1:3000');
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
