import { useState, useEffect } from 'react';
import * as api from '../../api';

// Known station logos — matched by URL substring
const KNOWN_LOGOS = [
  { match: 'radiofrance.fr/fip', logo: '/logos/fip.svg', name: 'FIP' },
  { match: 'fip-', logo: '/logos/fip.svg', name: 'FIP' },
  { match: 'fip.', logo: '/logos/fip.svg', name: 'FIP' },
];

function getStationLogo(url) {
  const lower = (url || '').toLowerCase();
  const known = KNOWN_LOGOS.find((k) => lower.includes(k.match));
  return known?.logo || null;
}

export default function UrlTab({ onPlay }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [recentUrls, setRecentUrls] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const loadRecent = async () => {
    try {
      const data = await api.getRecentUrls();
      setRecentUrls(data || []);
    } catch {
      setRecentUrls([]);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handlePlay = () => {
    if (!url.trim()) return;
    onPlay({ url: url.trim(), title: title.trim() || url.trim() });
    setUrl('');
    setTitle('');
    // Server saves the recent URL on play, refresh after a moment
    setTimeout(loadRecent, 500);
  };

  const handleQuickPlay = (recent) => {
    onPlay({ url: recent.url, title: recent.title });
    setTimeout(loadRecent, 500);
  };

  const handleDelete = async (recentUrl) => {
    try {
      await api.deleteRecentUrl(recentUrl);
      setRecentUrls(recentUrls.filter((r) => r.url !== recentUrl));
      if (recentUrls.length <= 1) setEditMode(false);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Stream URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/stream.mp3"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Station"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      <button
        onClick={handlePlay}
        disabled={!url.trim()}
        className="w-full py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Play
      </button>

      {recentUrls.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Recent URLs</p>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-xs text-indigo-500 hover:text-indigo-700"
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentUrls.map((recent, i) => (
              <button
                key={i}
                onClick={() => editMode ? handleDelete(recent.url) : handleQuickPlay(recent)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full truncate max-w-[200px] transition-colors ${
                  editMode
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={recent.url}
              >
                {!editMode && (recent.logo || getStationLogo(recent.url)) && (
                  <img
                    src={recent.logo || getStationLogo(recent.url)}
                    alt=""
                    className="w-5 h-5 rounded shrink-0"
                  />
                )}
                {editMode ? `✕ ${recent.title}` : recent.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
