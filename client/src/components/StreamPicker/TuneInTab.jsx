import { useState, useEffect } from 'react';
import { useTuneIn } from '../../hooks/useTuneIn';
import { browseTuneIn, getRecentStations } from '../../api';
import StationResult from './StationResult';

const CATEGORIES = [
  { id: 'top', label: 'Top Stations' },
  { id: 'music', label: 'Music' },
  { id: 'news', label: 'News' },
  { id: 'sports', label: 'Sports' },
  { id: 'talk', label: 'Talk' },
];

export default function TuneInTab({ onPlay }) {
  const [query, setQuery] = useState('');
  const [browseResults, setBrowseResults] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [recentStations, setRecentStations] = useState([]);
  const { results: searchResults, loading: searchLoading } = useTuneIn(query);

  const results = query.length >= 2 ? searchResults : browseResults;
  const loading = query.length >= 2 ? searchLoading : browseLoading;

  // Load recent stations on mount
  useEffect(() => {
    getRecentStations()
      .then(setRecentStations)
      .catch(() => {});
  }, []);

  // Refresh recents after playing a station
  const handlePlay = (station) => {
    onPlay(station);
    // Refresh recents after a short delay
    setTimeout(() => {
      getRecentStations()
        .then(setRecentStations)
        .catch(() => {});
    }, 1000);
  };

  const handleBrowse = async (category) => {
    setQuery('');
    setBrowseLoading(true);
    try {
      const data = await browseTuneIn(category);
      setBrowseResults(data);
    } catch {
      setBrowseResults([]);
    } finally {
      setBrowseLoading(false);
    }
  };

  const showingResults = query.length >= 2 || browseResults.length > 0;

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search TuneIn stations..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
      />

      <div className="flex gap-1 mt-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleBrowse(cat.id)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-1">
        {/* Recent stations — shown when not searching/browsing */}
        {!showingResults && !loading && recentStations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              Recently Played
            </p>
            <div className="space-y-0.5">
              {recentStations.map((station, i) => (
                <button
                  key={station.stationId || i}
                  onClick={() => handlePlay(station)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-indigo-50 transition-colors text-left"
                >
                  {station.logo ? (
                    <img
                      src={station.logo}
                      alt={station.name}
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{station.name}</p>
                    {station.description && (
                      <p className="text-xs text-gray-400 truncate">{station.description}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        {!loading && results.length === 0 && query.length >= 2 && (
          <p className="text-sm text-gray-400 text-center py-8">No stations found</p>
        )}
        {!loading &&
          results.map((station, i) => (
            <StationResult key={station.stationId || i} station={station} onPlay={handlePlay} />
          ))}
      </div>
    </div>
  );
}
