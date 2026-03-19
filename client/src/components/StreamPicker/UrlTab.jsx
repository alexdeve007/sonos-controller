import { useState, useEffect, useRef } from 'react';

export default function UrlTab({ onPlay }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [recentUrls, setRecentUrls] = useState([]);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentUrls') || '[]');
      setRecentUrls(stored);
    } catch {
      setRecentUrls([]);
    }
  }, []);

  const handlePlay = () => {
    if (!url.trim()) return;

    // Save to recent
    const entry = { url: url.trim(), title: title.trim() || url.trim() };
    const updated = [entry, ...recentUrls.filter((r) => r.url !== url.trim())].slice(0, 5);
    setRecentUrls(updated);
    localStorage.setItem('recentUrls', JSON.stringify(updated));

    onPlay({ url: url.trim(), title: title.trim() || url.trim() });
    setUrl('');
    setTitle('');
  };

  const handleQuickPlay = (recent) => {
    onPlay({ url: recent.url, title: recent.title });
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
          <div className="flex flex-wrap gap-1.5">
            {recentUrls.map((recent, i) => (
              <button
                key={i}
                onClick={() => {
                  if (editMode) {
                    const updated = recentUrls.filter((r) => r.url !== recent.url);
                    setRecentUrls(updated);
                    localStorage.setItem('recentUrls', JSON.stringify(updated));
                    if (updated.length === 0) setEditMode(false);
                  } else {
                    handleQuickPlay(recent);
                  }
                }}
                className={`px-3 py-1.5 text-xs rounded-full truncate max-w-[200px] transition-colors ${
                  editMode
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={recent.url}
              >
                {editMode ? `✕ ${recent.title}` : recent.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
