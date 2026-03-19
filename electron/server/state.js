// In-memory speaker and group state cache

const state = {
  speakers: new Map(), // id -> speaker object
  lastDiscovery: null,
};

function setSpeaker(id, data) {
  state.speakers.set(id, { ...data, id, lastSeen: Date.now() });
}

function getSpeaker(id) {
  return state.speakers.get(id) || null;
}

function getAllSpeakers() {
  return Array.from(state.speakers.values());
}

function removeSpeaker(id) {
  state.speakers.delete(id);
}

function clearSpeakers() {
  state.speakers.clear();
}

function getGroups() {
  const speakers = getAllSpeakers();

  // Filter out subs and bonded satellites
  const filtered = speakers.filter((s) => {
    const model = (s.model || '').toLowerCase();
    if (model.includes('sub')) return false;
    if (!s.groupId) return false;
    return true;
  });
  // Remove stereo pair secondaries: pure stereo pair = 2 same-name speakers alone in a group
  const visibleSpeakers = filtered.filter((s) => {
    if (s.isCoordinator) return true;
    const sameNameSameGroup = filtered.filter(
      (other) => other.name === s.name && other.groupId === s.groupId
    );
    const totalInGroup = filtered.filter((other) => other.groupId === s.groupId);
    if (sameNameSameGroup.length === 2 && totalInGroup.length === 2) return false;
    return true;
  });

  const groupMap = new Map();

  for (const speaker of visibleSpeakers) {
    const gid = speaker.groupId || speaker.id;
    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        groupId: gid,
        coordinator: null,
        members: [],
      });
    }
    const group = groupMap.get(gid);
    if (speaker.isCoordinator) {
      group.coordinator = speaker;
    }
    group.members.push(speaker);
  }

  return Array.from(groupMap.values()).map((g) => {
    // Fallback coordinator to first member if none found
    if (!g.coordinator && g.members.length > 0) {
      g.coordinator = g.members[0];
    }
    return {
      ...g,
      name: g.coordinator
        ? g.members.length > 1
          ? g.coordinator.name + ` + ${g.members.length - 1} more`
          : g.coordinator.name
        : 'Unknown Group',
    };
  });
}

function updateSpeakerField(id, field, value) {
  const speaker = state.speakers.get(id);
  if (speaker) {
    speaker[field] = value;
  }
}

module.exports = {
  setSpeaker,
  getSpeaker,
  getAllSpeakers,
  removeSpeaker,
  clearSpeakers,
  getGroups,
  updateSpeakerField,
};
