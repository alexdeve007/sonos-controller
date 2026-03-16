import { useSpeakerContext } from '../../context/SpeakerContext';
import VolumeSlider from './VolumeSlider';
import * as api from '../../api';

export default function SpeakerCard({ speaker, allSpeakers }) {
  const { state, dispatch, addToast } = useSpeakerContext();
  const isSelected = state.selectedSpeakerId === speaker.id;
  const isPlaying = speaker.playbackState === 'PLAYING';

  const handleSelect = () => {
    dispatch({ type: 'SELECT_SPEAKER', payload: speaker.id });
  };

  const handleStop = async (e) => {
    e.stopPropagation();
    try {
      await api.stop(speaker.id);
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: speaker.id, data: { playbackState: 'STOPPED', currentStream: null } },
      });
      addToast(`Stopped ${speaker.name}`);
    } catch (err) {
      addToast(`Failed to stop ${speaker.name}`, 'error');
    }
  };

  const handleVolumeChange = async (vol) => {
    try {
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: speaker.id, data: { volume: vol } },
      });
      await api.setVolume(speaker.id, vol);
    } catch (err) {
      addToast(`Volume update failed for ${speaker.name}`, 'error');
    }
  };

  const handleMuteToggle = async (e) => {
    e.stopPropagation();
    try {
      const newMuted = !speaker.muted;
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: speaker.id, data: { muted: newMuted } },
      });
      await api.setMute(speaker.id, newMuted);
    } catch (err) {
      addToast(`Mute toggle failed`, 'error');
    }
  };

  const handleUngroup = async (e) => {
    e.stopPropagation();
    try {
      await api.ungroupSpeaker(speaker.id);
      addToast(`${speaker.name} removed from group`);
    } catch (err) {
      addToast(`Failed to ungroup ${speaker.name}`, 'error');
    }
  };

  const handleGroup = async (e, coordinatorId) => {
    e.stopPropagation();
    try {
      await api.groupSpeaker(speaker.id, coordinatorId);
      addToast(`${speaker.name} added to group`);
    } catch (err) {
      addToast(`Failed to group ${speaker.name}`, 'error');
    }
  };

  const otherSpeakers = allSpeakers.filter((s) => s.id !== speaker.id && s.isCoordinator);

  return (
    <div
      onClick={handleSelect}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{speaker.name}</h3>
          <span className="text-xs text-gray-400">{speaker.model}</span>
          {speaker.groupId && !speaker.isCoordinator && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              Grouped
            </span>
          )}
          {speaker.isCoordinator && speaker.groupId && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
              Coordinator
            </span>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>

      <p className="text-xs text-gray-500 mb-2 truncate">
        {isPlaying && speaker.currentStream
          ? `♫ ${speaker.currentStream.title}`
          : 'Stopped'}
      </p>

      <div className="flex items-center gap-1 mb-2">
        <button
          onClick={handleMuteToggle}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
          title={speaker.muted ? 'Unmute' : 'Mute'}
        >
          {speaker.muted ? (
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
        <VolumeSlider value={speaker.volume} onChange={handleVolumeChange} />
      </div>

      <div className="flex gap-1">
        {isPlaying && (
          <button
            onClick={handleStop}
            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            Stop
          </button>
        )}
        {!speaker.isCoordinator && speaker.groupId && (
          <button
            onClick={handleUngroup}
            className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
          >
            Leave Group
          </button>
        )}
        {otherSpeakers.length > 0 && speaker.isCoordinator && (
          <div className="relative group/dropdown">
            <button className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100">
              Add to Group
            </button>
            <div className="hidden group-hover/dropdown:block absolute left-0 top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-[140px]">
              {allSpeakers
                .filter((s) => s.id !== speaker.id)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={(e) => handleGroup(e, speaker.id)}
                    className="block w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50"
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
