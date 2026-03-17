const { Router } = require('express');
const { getSpeaker, getAllSpeakers, updateSpeakerField } = require('../state');
const { playStream, stopPlayback, setVolume, setMuted } = require('../services/sonosClient');
const { resolveStreamUrl } = require('../services/tuneInClient');
const Store = require('electron-store');

const router = Router();

router.post('/play', async (req, res) => {
  const { targetId, type, stationId, url, title } = req.body;
  const speaker = getSpeaker(targetId);

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  try {
    let streamUrl = url;

    if (type === 'tunein' && stationId) {
      streamUrl = await resolveStreamUrl(stationId);
      if (!streamUrl) {
        return res.status(400).json({ error: 'Could not resolve TuneIn stream URL' });
      }
    }

    if (!streamUrl) {
      return res.status(400).json({ error: 'No stream URL provided' });
    }

    await playStream(speaker.ip, streamUrl);

    // Save to recent stations/URLs
    const store = new Store();
    if (type === 'tunein' && stationId) {
      const recent = store.get('recentStations', []);
      const entry = {
        stationId,
        name: title || stationId,
        logo: req.body.logo || null,
        description: req.body.description || null,
        playedAt: Date.now(),
      };
      const filtered = recent.filter((r) => r.stationId !== stationId);
      filtered.unshift(entry);
      store.set('recentStations', filtered.slice(0, 20));
    }
    if (type === 'url' && streamUrl) {
      const recent = store.get('recentUrls', []);
      const entry = { url: streamUrl, title: title || streamUrl };
      const filtered = recent.filter((r) => r.url !== streamUrl);
      filtered.unshift(entry);
      store.set('recentUrls', filtered.slice(0, 5));
    }

    // Update state optimistically
    updateSpeakerField(targetId, 'playbackState', 'PLAYING');
    updateSpeakerField(targetId, 'currentStream', {
      title: title || stationId || streamUrl,
      url: streamUrl,
    });

    res.json({ success: true, streamUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop', async (req, res) => {
  const { targetId } = req.body;
  const speaker = getSpeaker(targetId);

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  try {
    await stopPlayback(speaker.ip);
    updateSpeakerField(targetId, 'playbackState', 'STOPPED');
    updateSpeakerField(targetId, 'currentStream', null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/volume', async (req, res) => {
  const { targetId, targetType, volume } = req.body;

  if (targetType === 'group') {
    // Adjust all members in parallel
    const speakers = getAllSpeakers().filter(
      (s) => s.groupId === targetId || s.id === targetId
    );

    try {
      await Promise.all(speakers.map((s) => {
        updateSpeakerField(s.id, 'volume', volume);
        return setVolume(s.ip, volume);
      }));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const speaker = getSpeaker(targetId);
    if (!speaker) {
      return res.status(404).json({ error: 'Speaker not found' });
    }

    try {
      await setVolume(speaker.ip, volume);
      updateSpeakerField(targetId, 'volume', volume);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

router.post('/mute', async (req, res) => {
  const { targetId, muted } = req.body;
  const speaker = getSpeaker(targetId);

  if (!speaker) {
    return res.status(404).json({ error: 'Speaker not found' });
  }

  try {
    await setMuted(speaker.ip, muted);
    updateSpeakerField(targetId, 'muted', muted);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
