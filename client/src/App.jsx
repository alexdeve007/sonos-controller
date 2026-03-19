import { useState } from 'react';
import { SpeakerProvider, useSpeakerContext } from './context/SpeakerContext';
import { useSpeakers } from './hooks/useSpeakers';
import SpeakerCard from './components/SpeakerPanel/SpeakerCard';
import GroupCard from './components/SpeakerPanel/GroupCard';
import TuneInTab from './components/StreamPicker/TuneInTab';
import UrlTab from './components/StreamPicker/UrlTab';
import Toast from './components/Toast';
import PullToRefresh from './components/PullToRefresh';
import * as api from './api';

function AppContent() {
  const { state, dispatch, addToast } = useSpeakerContext();
  const [activeTab, setActiveTab] = useState('tunein');
  const [discovering, setDiscovering] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [addingIp, setAddingIp] = useState(false);
  // Mobile view: 'speakers' or 'music'
  const [mobileView, setMobileView] = useState('speakers');

  const { refreshNow } = useSpeakers(3000);

  const selectedSpeaker = state.speakers.find((s) => s.id === state.selectedSpeakerId);

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      await api.discover();
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
        logo: station.logo || null,
        description: station.description || null,
      });
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
    } catch (err) {
      addToast(`Failed to play: ${err.message}`, 'error');
    }
  };

  const speakerPanel = (
    <PullToRefresh onRefresh={handleDiscover} className="overflow-y-auto p-3 space-y-2 flex-1">
      {state.speakers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="text-sm text-gray-400 mb-2">No speakers found</p>
          <p className="text-xs text-gray-400 mb-4">
            Make sure your Sonos speakers are on the same network and click Discover.
          </p>
          <div className="w-full max-w-xs">
            <p className="text-xs text-gray-500 mb-2 font-medium">Or add by IP address:</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!manualIp.trim()) return;
                setAddingIp(true);
                try {
                  await api.addSpeakerByIp(manualIp.trim());
                  addToast(`Added speaker at ${manualIp}`);
                  setManualIp('');
                } catch (err) {
                  addToast(err.message, 'error');
                } finally {
                  setAddingIp(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="192.168.1.x"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={addingIp}
                className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {addingIp ? '...' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {state.groups
            .filter((g) => g.members.length > 1)
            .map((group) => (
              <GroupCard key={group.groupId} group={group} allSpeakers={state.speakers} />
            ))}
          {state.speakers.map((speaker) => (
            <SpeakerCard
              key={speaker.id}
              speaker={speaker}
              allSpeakers={state.speakers}
            />
          ))}
        </>
      )}
    </PullToRefresh>
  );

  const musicPanel = (
    <div className="overflow-y-auto p-4 flex flex-col flex-1">
      {selectedSpeaker ? (
        <>
          <div className="mb-3">
            <p className="text-xs text-gray-500">
              Playing to: <span className="font-medium text-gray-700">{selectedSpeaker.name}</span>
            </p>
          </div>

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
            <p className="text-sm text-gray-400">Select a speaker first</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm shrink-0">
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

      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="w-2/5 border-r border-gray-200 flex flex-col">
          {speakerPanel}
        </div>
        <div className="flex-1 flex flex-col">
          {musicPanel}
        </div>
      </div>

      {/* Mobile: tabbed layout */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        {/* Top tab bar */}
        <nav className="flex border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setMobileView('speakers')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
              mobileView === 'speakers'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Speakers
          </button>
          <button
            onClick={() => setMobileView('music')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
              mobileView === 'music'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Music
          </button>
        </nav>

        {/* Now-playing banner on speakers tab */}
        {mobileView === 'speakers' && selectedSpeaker && (
          <div
            className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0 cursor-pointer"
            onClick={() => setMobileView('music')}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-indigo-500 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </span>
              <span className="text-xs text-indigo-700 truncate">
                {selectedSpeaker.currentTrack || 'Ready'} &middot; {selectedSpeaker.name}
              </span>
            </div>
            <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col safe-bottom">
          {mobileView === 'speakers' ? speakerPanel : musicPanel}
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
