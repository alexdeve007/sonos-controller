import { useState, useEffect } from 'react';

export default function UrlTab({ onPlay }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [recentUrls, setRecentUrls] = useState([]);

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
          <p className="text-xs font-medium text-gray-500 mb-2">Recent URLs</p>
          <div className="flex flex-wrap gap-1">
            {recentUrls.map((recent, i) => (
              <button
                key={i}
                onClick={() => handleQuickPlay(recent)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 truncate max-w-[200px]"
                title={recent.url}
              >
                {recent.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
