import { useState, useCallback } from 'react';

export default function VolumeSlider({ value, onChange, label }) {
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  const displayValue = isDragging ? localValue : value;

  const handleChange = useCallback((e) => {
    const v = parseInt(e.target.value);
    setLocalValue(v);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    onChange(localValue);
  }, [localValue, onChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  return (
    <div className="flex items-center gap-2 w-full">
      {label && <span className="text-xs text-gray-500 w-6">{label}</span>}
      <input
        type="range"
        min="0"
        max="100"
        value={displayValue}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        className="flex-1 h-1.5 accent-indigo-500 cursor-pointer"
      />
      <span className="text-xs text-gray-500 w-8 text-right">{displayValue}</span>
    </div>
  );
}
