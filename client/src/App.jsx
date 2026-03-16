import { useState } from 'react';
import { SpeakerProvider, useSpeakerContext } from './context/SpeakerContext';
import { useSpeakers } from './hooks/useSpeakers';
import SpeakerCard from './components/SpeakerPanel/SpeakerCard';
import GroupCard from './components/SpeakerPanel/GroupCard';
import TuneInTab from './components/StreamPicker/TuneInTab';
import UrlTab from './components/StreamPicker/UrlTab';
import Toast from './components/Toast';
import * as api from './api';

function AppContent() {
  const { state, dispatch, addToast } = useSpeakerContext();
  const [activeTab, setActiveTab] = useState('tunein');
  const [discovering, setDiscovering] = useState(false);

  useSpeakers(3000);

  const selectedSpeaker = state.speakers.find((s) => s.id === state.selectedSpeakerId);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      await api.discover();
      addToast('Speaker discovery complete');
    } catch (err) {
      addToast('Discovery failed: ' + err.message, 'error');
    } finally {
      setDiscovering(false);
    }
  };

  const handlePlayStation = async (station) => {
    if (!selectedSpeaker) {
      addToast('Select a speaker first', 'error');
      return;
    }
    try {
      await api.play({
        targetId: selectedSpeaker.id,
        type: 'tunein',
        stationId: station.stationId,
        title: station.name,
      });
      addToast(`Now playing ${station.name} on ${selectedSpeaker.name}`);
    } catch (err) {
      addToast(`Failed to play: ${err.message}`, 'error');
    }
  };

  const handlePlayUrl = async ({ url, title }) => {
    if (!selectedSpeaker) {
      addToast('Select a speaker first', 'error');
      return;
    }
    try {
      await api.play({
        targetId: selectedSpeaker.id,
        type: 'url',
        url,
        title,
      });
      addToast(`Now playing ${title} on ${selectedSpeaker.name}`);
    } catch (err) {
      addToast(`Failed to play: ${err.message}`, 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Sonos Controller</h1>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <svg
            className={`w-4 h-4 ${discovering ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {discovering ? 'Discovering...' : 'Discover'}
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Speaker Panel — left */}
        <div className="w-2/5 border-r border-gray-200 overflow-y-auto p-3 space-y-2">
          {state.speakers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm text-gray-400 mb-2">No speakers found</p>
              <p className="text-xs text-gray-400">
                Make sure your Sonos speakers are on the same network and click Discover.
              </p>
            </div>
          ) : (
            <>
              {/* Show group cards for multi-speaker groups */}
              {state.groups
                .filter((g) => g.members.length > 1)
                .map((group) => (
                  <GroupCard key={group.groupId} group={group} />
                ))}

              {/* Individual speaker cards */}
              {state.speakers.map((speaker) => (
                <SpeakerCard
                  key={speaker.id}
                  speaker={speaker}
                  allSpeakers={state.speakers}
                />
              ))}
            </>
          )}
        </div>

        {/* Stream Picker — right */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {selectedSpeaker ? (
            <>
              <div className="mb-3">
                <p className="text-xs text-gray-500">
                  Playing to: <span className="font-medium text-gray-700">{selectedSpeaker.name}</span>
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActiveTab('tunein')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeTab === 'tunein'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  TuneIn
                </button>
                <button
                  onClick={() => setActiveTab('url')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeTab === 'url'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  URL
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeTab === 'tunein' ? (
                  <TuneInTab onPlay={handlePlayStation} />
                ) : (
                  <UrlTab onPlay={handlePlayUrl} />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                <p className="text-sm text-gray-400">Select a speaker to choose what to play</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <SpeakerProvider>
      <AppContent />
    </SpeakerProvider>
  );
}
