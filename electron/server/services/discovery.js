const { DeviceDiscovery } = require('sonos');
const { setSpeaker, clearSpeakers } = require('../state');
const { getSpeakerInfo } = require('./sonosClient');
const Store = require('electron-store');

async function discoverSpeakers() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(); // resolve even if no speakers found
    }, 5000);

    const discovery = DeviceDiscovery({ timeout: 5000 });

    discovery.on('DeviceAvailable', async (device) => {
      try {
        const info = await getSpeakerInfo(device);
        setSpeaker(info.id, info);
      } catch (err) {
        console.error('Error getting speaker info:', err.message);
      }
    });

    discovery.on('timeout', () => {
      clearTimeout(timeout);
      // Also add any manual speakers from settings
      addManualSpeakers().then(resolve).catch(resolve);
    });
  });
}

async function addManualSpeakers() {
  const store = new Store();
  const overrides = store.get('speakerOverrides', []);
  const { Sonos } = require('sonos');

  for (const override of overrides) {
    try {
      const device = new Sonos(override.ip);
      const info = await getSpeakerInfo(device);
      if (override.name) info.name = override.name;
      setSpeaker(info.id, info);
    } catch (err) {
      console.error(`Manual speaker ${override.ip} unreachable:`, err.message);
    }
  }
}

module.exports = { discoverSpeakers };
