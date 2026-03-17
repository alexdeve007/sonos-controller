import VolumeSlider from './VolumeSlider';
import Equalizer from '../Equalizer';
import { useSpeakerContext } from '../../context/SpeakerContext';
import * as api from '../../api';

export default function GroupCard({ group }) {
  const { state, dispatch, addToast, refreshNow } = useSpeakerContext();

  if (group.members.length <= 1) return null;

  const coordinator = group.coordinator;
  const isPlaying = coordinator?.playbackState === 'PLAYING';
  const isSelected = state.selectedSpeakerId === coordinator?.id;

  // Detect stereo pair: 2 members with same room name
  const isStereopair =
    group.members.length === 2 &&
    group.members[0].name === group.members[1].name;

  // For stereo pairs, show as a single speaker card
  const displayName = isStereopair
    ? group.members[0].name
    : `${coordinator?.name || 'Group'} + ${group.members.length - 1}`;

  // Use coordinator's volume for stereo pairs
  const displayVolume = isStereopair
    ? coordinator?.volume || 0
    : Math.round(group.members.reduce((sum, m) => sum + (m.volume || 0), 0) / group.members.length);

  const handleSelect = () => {
    if (coordinator) {
      dispatch({ type: 'SELECT_SPEAKER', payload: coordinator.id });
    }
  };

  const handleGroupVolume = async (vol) => {
    try {
      if (isStereopair) {
        // For stereo pairs, set volume on coordinator
        dispatch({
          type: 'UPDATE_SPEAKER',
          payload: { id: coordinator.id, data: { volume: vol } },
        });
        await api.setVolume(coordinator.id, vol);
      } else {
        await api.setVolume(group.groupId, vol, 'group');
      }
    } catch (err) {
      addToast('Volume update failed', 'error');
    }
  };

  const handleStop = async (e) => {
    e.stopPropagation();
    if (!coordinator) return;
    try {
      await api.stop(coordinator.id);
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: coordinator.id, data: { playbackState: 'STOPPED', currentStream: null } },
      });
      refreshNow();
    } catch (err) {
      addToast('Failed to stop', 'error');
    }
  };

  const handleMuteToggle = async (e) => {
    e.stopPropagation();
    if (!coordinator) return;
    try {
      const newMuted = !coordinator.muted;
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: coordinator.id, data: { muted: newMuted } },
      });
      await api.setMute(coordinator.id, newMuted);
    } catch (err) {
      addToast('Mute toggle failed', 'error');
    }
  };

  const handleUngroup = async (e, memberId) => {
    e.stopPropagation();
    try {
      await api.ungroupSpeaker(memberId);
      refreshNow();
    } catch (err) {
      addToast('Failed to ungroup', 'error');
    }
  };

  return (
    <div
      onClick={handleSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : isStereopair
            ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            : 'border-purple-200 bg-purple-50 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className={`font-semibold text-sm truncate ${isStereopair ? '' : 'text-purple-800'}`}>
            {displayName}
          </h3>
          {isStereopair && (
            <span className="text-xs text-gray-400 shrink-0">{coordinator?.model}</span>
          )}
          {!isStereopair && (
            <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded shrink-0">
              Group
            </span>
          )}
        </div>
        {isPlaying ? <Equalizer /> : <div className="w-2 h-2 rounded-full shrink-0 bg-gray-300" />}
      </div>

      {coordinator?.currentStream && (
        <p className={`text-xs mb-2 truncate ${isStereopair ? 'text-gray-500' : 'text-purple-600'}`}>
          {isPlaying ? `♫ ${coordinator.currentStream.title}` : 'Stopped'}
        </p>
      )}
      {!coordinator?.currentStream && (
        <p className={`text-xs mb-2 ${isStereopair ? 'text-gray-500' : 'text-purple-600'}`}>Stopped</p>
      )}

      {/* Main volume */}
      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={handleMuteToggle}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          {coordinator?.muted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
        <VolumeSlider
          value={displayVolume}
          onChange={handleGroupVolume}
          label={!isStereopair ? 'All' : undefined}
        />
      </div>

      {/* Per-member volume (only for non-stereo groups) */}
      {!isStereopair && (
        <div className="space-y-1 pl-2 border-l-2 border-purple-200">
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2">
              <span className="text-xs text-purple-700 min-w-[60px] max-w-[80px] truncate" title={member.name}>
                {member.name}
                {member.isCoordinator && ' ★'}
              </span>
              <VolumeSlider
                value={member.volume}
                onChange={async (vol) => {
                  try {
                    dispatch({
                      type: 'UPDATE_SPEAKER',
                      payload: { id: member.id, data: { volume: vol } },
                    });
                    await api.setVolume(member.id, vol);
                  } catch (err) {
                    addToast(`Volume failed for ${member.name}`, 'error');
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1 flex-wrap mt-2">
        {isPlaying && (
          <button
            onClick={handleStop}
            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            Stop
          </button>
        )}
        {!isStereopair && group.members
          .filter((m) => !m.isCoordinator)
          .map((m) => (
            <button
              key={m.id}
              onClick={(e) => handleUngroup(e, m.id)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Remove {m.name}
            </button>
          ))}
      </div>
    </div>
  );
}
