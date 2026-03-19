import { useState, useCallback, useRef, useEffect } from 'react';

export default function VolumeSlider({ value, onChange, label }) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const debounceRef = useRef(null);
  const lastSentRef = useRef(value);

  // Sync external value when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
      lastSentRef.current = value;
    }
  }, [value, isDragging]);

  const displayValue = isDragging ? localValue : value;

  const sendVolume = useCallback((vol) => {
    if (vol !== lastSentRef.current) {
      lastSentRef.current = vol;
      onChange(vol);
    }
  }, [onChange]);

  const handleChange = useCallback((e) => {
    const v = parseInt(e.target.value);
    setLocalValue(v);
    setIsDragging(true);

    // Debounce: wait 250ms of no movement before sending
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      sendVolume(v);
    }, 250);
  }, [sendVolume]);

  const handleEnd = useCallback(() => {
    // Send final value immediately on release
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    sendVolume(localValue);
    // Small delay before allowing external sync to avoid flicker
    setTimeout(() => setIsDragging(false), 300);
  }, [sendVolume, localValue]);

  return (
    <div className="flex items-center gap-2 w-full">
      {label && <span className="text-xs text-gray-500 w-6">{label}</span>}
      <input
        type="range"
        min="0"
        max="100"
        value={displayValue}
        onChange={handleChange}
        onMouseUp={handleEnd}
        onTouchEnd={handleEnd}
        className="flex-1 h-1.5 accent-indigo-500 cursor-pointer touch-none"
      />
      <span className="text-xs text-gray-500 w-8 text-right">{displayValue}</span>
    </div>
  );
}
