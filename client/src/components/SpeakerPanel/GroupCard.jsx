import VolumeSlider from './VolumeSlider';
import { useSpeakerContext } from '../../context/SpeakerContext';
import * as api from '../../api';

export default function GroupCard({ group }) {
  const { addToast } = useSpeakerContext();

  if (group.members.length <= 1) return null;

  const coordinator = group.coordinator;
  const isPlaying = coordinator?.playbackState === 'PLAYING';

  const handleGroupVolume = async (vol) => {
    try {
      await api.setVolume(group.groupId, vol, 'group');
    } catch (err) {
      addToast('Group volume update failed', 'error');
    }
  };

  const avgVolume = Math.round(
    group.members.reduce((sum, m) => sum + (m.volume || 0), 0) / group.members.length
  );

  return (
    <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 mb-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-purple-800 truncate" title={group.name}>
          {group.coordinator ? group.coordinator.name : 'Group'} + {group.members.length - 1} more
        </h3>
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-gray-300'}`} />
      </div>

      {isPlaying && coordinator?.currentStream && (
        <p className="text-xs text-purple-600 mb-2 truncate">
          ♫ {coordinator.currentStream.title}
        </p>
      )}

      <div className="mb-2">
        <VolumeSlider value={avgVolume} onChange={handleGroupVolume} label="All" />
      </div>

      <div className="space-y-1 pl-2 border-l-2 border-purple-200">
        {group.members.map((member) => (
          <div key={member.id} className="flex items-center gap-2">
            <span className="text-xs text-purple-700 min-w-[80px] max-w-[100px] truncate" title={member.name}>
              {member.name}
              {member.isCoordinator && ' ★'}
            </span>
            <VolumeSlider
              value={member.volume}
              onChange={async (vol) => {
                try {
                  await api.setVolume(member.id, vol);
                } catch (err) {
                  addToast(`Volume failed for ${member.name}`, 'error');
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
