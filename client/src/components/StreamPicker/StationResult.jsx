export default function StationResult({ station, onPlay }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      {station.logo ? (
        <img
          src={station.logo}
          alt={station.name}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
          onError={(e) => (e.target.style.display = 'none')}
        />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{station.name}</p>
        {station.description && (
          <p className="text-xs text-gray-500 truncate">{station.description}</p>
        )}
      </div>
      <button
        onClick={() => onPlay(station)}
        className="flex-shrink-0 px-3 py-1.5 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors"
      >
        Play
      </button>
    </div>
  );
}
