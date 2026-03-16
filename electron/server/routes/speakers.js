const { Router } = require('express');
const { getAllSpeakers } = require('../state');
const { discoverSpeakers } = require('../services/discovery');

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

module.exports = router;
