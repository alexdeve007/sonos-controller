const { Router } = require('express');
const Store = require('electron-store');
const { searchStations, browseCategory } = require('../services/tuneInClient');

const router = Router();

router.get('/tunein/recent', (req, res) => {
  const store = new Store();
  const recent = store.get('recentStations', []);
  res.json(recent);
});

router.get('/tunein/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await searchStations(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tunein/browse', async (req, res) => {
  const { category } = req.query;
  if (!category) {
    return res.status(400).json({ error: 'Query parameter "category" is required' });
  }

  try {
    const results = await browseCategory(category);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
