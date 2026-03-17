import { useState, useCallback, useRef, useEffect } from 'react';

export default function VolumeSlider({ value, onChange, label }) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const throttleRef = useRef(null);
  const lastSentRef = useRef(value);
  const latestValue = useRef(value);

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
    latestValue.current = v;
    setIsDragging(true);

    // Throttle: send at most every 100ms while dragging
    if (!throttleRef.current) {
      sendVolume(v);
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        // Send the latest value if it changed during the throttle window
        sendVolume(latestValue.current);
      }, 100);
    }
  }, [sendVolume]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    sendVolume(latestValue.current);
  }, [sendVolume]);

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
