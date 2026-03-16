import { useState } from 'react';
import { useTuneIn } from '../../hooks/useTuneIn';
import { browseTuneIn } from '../../api';
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
  const { results: searchResults, loading: searchLoading } = useTuneIn(query);

  const results = query.length >= 2 ? searchResults : browseResults;
  const loading = query.length >= 2 ? searchLoading : browseLoading;

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
            <StationResult key={station.stationId || i} station={station} onPlay={onPlay} />
          ))}
      </div>
    </div>
  );
}
