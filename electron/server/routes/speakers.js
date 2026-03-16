const { Router } = require('express');
const { Sonos } = require('sonos');
const Store = require('electron-store');
const { getAllSpeakers, setSpeaker } = require('../state');
const { discoverSpeakers } = require('../services/discovery');
const { getSpeakerInfo } = require('../services/sonosClient');

const router = Router();

router.get('/speakers', (req, res) => {
  const speakers = getAllSpeakers();
  res.json(speakers);
});

router.post('/discover', async (req, res) => {
  try {
    await discoverSpeakers();
    const speakers = getAllSpeakers();
    res.json({ success: true, speakers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually add a speaker by IP address
router.post('/speakers/add', async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP address is required' });

  try {
    const device = new Sonos(ip);
    const info = await getSpeakerInfo(device);
    setSpeaker(info.id, info);

    // Save to persistent overrides
    const store = new Store();
    const overrides = store.get('speakerOverrides', []);
    if (!overrides.some((o) => o.ip === ip)) {
      overrides.push({ ip });
      store.set('speakerOverrides', overrides);
    }

    res.json({ success: true, speaker: info });
  } catch (err) {
    res.status(400).json({ error: `Could not reach Sonos at ${ip}: ${err.message}` });
  }
});

module.exports = router;
