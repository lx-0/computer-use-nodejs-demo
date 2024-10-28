import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useState } from 'react';

interface SplitterProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

const Splitter: React.FC<SplitterProps> = ({
  leftPane,
  rightPane,
  initialLeftWidth = 400,
  minLeftWidth = 200,
  maxLeftWidth = 800,
}) => {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const newLeftWidth = e.clientX;
        if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
          setLeftWidth(newLeftWidth);
        }
      }
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Disable text selection on the body when dragging
      document.body.style.userSelect = 'none';
    } else {
      // Re-enable text selection when not dragging
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-full w-full">
      <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-hidden">
        {leftPane}
      </div>
      <div
        className={cn(
          'w-1 bg-gray-200 cursor-col-resize hover:bg-gray-300 active:bg-gray-400',
          isDragging && 'bg-gray-400'
        )}
        onMouseDown={handleMouseDown}
      />
      <div className="flex-grow w-0 min-w-0 overflow-hidden">{rightPane}</div>
    </div>
  );
};

export default Splitter;
