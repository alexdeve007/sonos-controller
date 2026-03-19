const { Router } = require('express');
const { getGroups, getSpeaker } = require('../state');
const { joinGroup, leaveGroup } = require('../services/sonosClient');
const { discoverSpeakers } = require('../services/discovery');

const router = Router();

router.get('/groups', (req, res) => {
  const groups = getGroups();
  res.json(groups);
});

router.post('/group', async (req, res) => {
  const { speakerId, coordinatorId } = req.body;
  const speaker = getSpeaker(speakerId);
  const coordinator = getSpeaker(coordinatorId);

  if (!speaker || !coordinator) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  try {
    await joinGroup(speaker.ip, coordinator.ip);
    res.json({ success: true });
    // Refresh speaker state in background after group change
    setTimeout(() => discoverSpeakers().catch(() => {}), 1000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ungroup', async (req, res) => {
  const { speakerId } = req.body;
  const speaker = getSpeaker(speakerId);

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  try {
    await leaveGroup(speaker.ip);
    res.json({ success: true });
    // Refresh speaker state in background after ungroup
    setTimeout(() => discoverSpeakers().catch(() => {}), 1000);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
