import React, { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableThreadRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onClick?: () => void;
  className?: string;
  contentClassName?: string;
}

export function SwipeableThreadRow({
  children,
  onDelete,
  onClick,
  className = '',
  contentClassName = '',
}: SwipeableThreadRowProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const isSwipeRef = useRef(false);

  const handleStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    setIsDragging(true);
    isSwipeRef.current = false;
    setOffset(0);
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const delta = clientX - startXRef.current;
      if (Math.abs(delta) > 5) isSwipeRef.current = true;
      // Only allow leftward swipe
      const newOffset = Math.min(0, Math.max(delta, -120));
      setOffset(newOffset);
    },
    [isDragging]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(offset) > 80) {
      onDelete();
    }
    setOffset(0);
  }, [isDragging, offset, onDelete]);

  const handleClick = (e: React.MouseEvent) => {
    if (isSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.();
  };

  return (
    <div className={cn('relative overflow-hidden bg-card', className)}>
      <div className="absolute inset-y-0 right-0 left-0 bg-destructive flex items-center justify-end pr-4 select-none">
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>
      <div
        className={cn('relative transition-transform duration-200 ease-out', contentClassName)}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}
