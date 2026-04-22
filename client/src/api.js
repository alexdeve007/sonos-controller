const BASE = `http://${window.location.hostname}:3000`;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export function getSpeakers() {
  return request('/api/speakers');
}

export function getGroups() {
  return request('/api/groups');
}

export function discover() {
  return request('/api/discover', { method: 'POST' });
}

export function play({ targetId, type, stationId, url, title, logo, description }) {
  return request('/api/play', {
    method: 'POST',
    body: JSON.stringify({ targetId, type, stationId, url, title, logo, description }),
  });
}

export function stop(targetId) {
  return request('/api/stop', {
    method: 'POST',
    body: JSON.stringify({ targetId }),
  });
}

export function setVolume(targetId, volume, targetType = 'speaker') {
  return request('/api/volume', {
    method: 'POST',
    body: JSON.stringify({ targetId, targetType, volume }),
  });
}

export function setMute(targetId, muted) {
  return request('/api/mute', {
    method: 'POST',
    body: JSON.stringify({ targetId, muted }),
  });
}

export function groupSpeaker(speakerId, coordinatorId) {
  return request('/api/group', {
    method: 'POST',
    body: JSON.stringify({ speakerId, coordinatorId }),
  });
}

export function ungroupSpeaker(speakerId) {
  return request('/api/ungroup', {
    method: 'POST',
    body: JSON.stringify({ speakerId }),
  });
}

export function searchTuneIn(query) {
  return request(`/api/tunein/search?q=${encodeURIComponent(query)}`);
}

export function getRecentStations() {
  return request('/api/tunein/recent');
}

export function browseTuneIn(category) {
  return request(`/api/tunein/browse?category=${encodeURIComponent(category)}`);
}

export function addSpeakerByIp(ip) {
  return request('/api/speakers/add', {
    method: 'POST',
    body: JSON.stringify({ ip }),
  });
}

export function getRecentUrls() {
  return request('/api/recent-urls');
}

export function deleteRecentUrl(url) {
  return request('/api/recent-urls', {
    method: 'DELETE',
    body: JSON.stringify({ url }),
  });
}
