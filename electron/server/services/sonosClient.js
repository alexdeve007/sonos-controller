const { Sonos } = require('sonos');

async function getSpeakerInfo(device) {
  const desc = await device.deviceDescription();
  const state = await device.getCurrentState().catch(() => 'stopped');
  const volume = await device.getVolume().catch(() => 0);
  const muted = await device.getMuted().catch(() => false);
  const track = await device.currentTrack().catch(() => null);

  // Determine group info
  const speakerId = desc.UDN?.replace('uuid:', '') || '';
  let groupId = null;
  let isCoordinator = true;
  try {
    const groups = await device.getAllGroups();
    for (const group of groups) {
      const members = group.ZoneGroupMember;
      const memberList = Array.isArray(members) ? members : [members];
      const isMember = memberList.some((m) => m.UUID === speakerId);
      if (isMember) {
        groupId = group.ID || (group.$ && group.$.ID) || null;
        const coordinatorId = group.Coordinator || (group.$ && group.$.Coordinator) || '';
        isCoordinator = coordinatorId === speakerId;
        break;
      }
    }
  } catch (err) {
    // Group info not available
  }

  // Detect generation (heuristic based on model)
  const modelNumber = desc.modelNumber || '';
  const s2Models = ['S14', 'S15', 'S17', 'S18', 'S21', 'S22', 'S23', 'S24', 'S27', 'S33', 'S38'];
  const generation = s2Models.some((m) => modelNumber.startsWith(m)) ? 's2' : 's1';

  return {
    id: desc.UDN?.replace('uuid:', '') || desc.serialNum || device.host,
    name: desc.roomName || desc.friendlyName || 'Unknown Speaker',
    ip: device.host,
    model: desc.modelName || 'Unknown',
    generation,
    groupId,
    isCoordinator,
    volume: typeof volume === 'number' ? volume : parseInt(volume) || 0,
    muted: !!muted,
    playbackState: normalizeState(state),
    currentStream: track && track.uri
      ? {
          title: track.title && track.title !== '' ? track.title :
                 track.artist && track.artist !== '' ? track.artist :
                 track.uri.startsWith('x-rincon:') ? '(Grouped)' :
                 track.uri.replace(/^x-rincon-mp3radio:\/\//, '').split('/').pop() || 'Unknown',
          url: track.uri,
        }
      : null,
  };
}

function normalizeState(state) {
  if (!state) return 'STOPPED';
  const s = String(state).toLowerCase();
  if (s.includes('play')) return 'PLAYING';
  if (s.includes('pause')) return 'PAUSED';
  if (s.includes('transit')) return 'TRANSITIONING';
  return 'STOPPED';
}

async function getDevice(ip) {
  return new Sonos(ip);
}

async function playStream(ip, streamUrl, metadata) {
  const device = new Sonos(ip);

  let uri = streamUrl;

  // Sonos S1 doesn't support HTTPS — try to downgrade to HTTP
  if (/^https:\/\//i.test(uri)) {
    uri = uri.replace(/^https:\/\//i, 'http://');
  }

  // For HTTP audio streams, use x-rincon-mp3radio:// protocol
  if (/^http:\/\//i.test(uri)) {
    uri = uri.replace(/^http:\/\//i, 'x-rincon-mp3radio://');
  }

  try {
    await device.setAVTransportURI({ uri, metadata: metadata || '' });
    await device.play();
  } catch (err) {
    // If x-rincon-mp3radio fails, try raw HTTP URI as fallback
    if (err.message && err.message.includes('upnp')) {
      const fallbackUri = streamUrl.replace(/^https:\/\//i, 'http://');
      await device.setAVTransportURI({ uri: fallbackUri, metadata: metadata || '' });
      await device.play();
    } else {
      throw err;
    }
  }
}

async function stopPlayback(ip) {
  const device = new Sonos(ip);
  await device.stop();
}

async function setVolume(ip, volume) {
  const device = new Sonos(ip);
  await device.setVolume(volume);
}

async function setMuted(ip, muted) {
  const device = new Sonos(ip);
  await device.setMuted(muted);
}

async function joinGroup(memberIp, coordinatorIp) {
  const member = new Sonos(memberIp);
  const coordinator = new Sonos(coordinatorIp);
  const desc = await coordinator.deviceDescription();
  const coordinatorId = desc.UDN?.replace('uuid:', '') || '';
  await member.setAVTransportURI({
    uri: `x-rincon:${coordinatorId}`,
    metadata: '',
  });
}

async function leaveGroup(ip) {
  const device = new Sonos(ip);
  await device.leaveGroup();
}

module.exports = {
  getSpeakerInfo,
  getDevice,
  playStream,
  stopPlayback,
  setVolume,
  setMuted,
  joinGroup,
  leaveGroup,
};
