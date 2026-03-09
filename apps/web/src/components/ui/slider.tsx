import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLDivElement>,
  'onChange' | 'value'
> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  showThumb?: boolean;
  onChange?: (value: number) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  showThumb = true,
  onChange,
  onPointerDown,
  onPointerUp,
  className,
  ...props
}: SliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

  const handleMove = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const nextValue = min + (x / rect.width) * (max - min);

      // Snap to step
      const steppedValue = Math.round(nextValue / step) * step;
      onChange?.(Math.min(max, Math.max(min, steppedValue)));
    },
    [min, max, step, onChange],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const steppedValue = Math.round(value / step) * step;
      let nextValue: number;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          nextValue = Math.max(min, steppedValue - step);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          nextValue = Math.min(max, steppedValue + step);
          break;
        case 'Home':
          nextValue = min;
          break;
        case 'End':
          nextValue = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      onChange?.(Math.min(max, Math.max(min, nextValue)));
    },
    [value, min, max, step, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
    onPointerDown?.();

    const onPointerMove = (e: PointerEvent) => {
      handleMove(e.clientX);
    };

    const onPointerUpLocal = () => {
      setIsDragging(false);
      onPointerUp?.();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpLocal);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUpLocal);
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      className={cn(
        'relative flex items-center w-full h-4 group cursor-pointer touch-none select-none',
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {/* Track Background */}
      <div
        className={cn(
          'absolute w-full h-1 bg-white/10 rounded-full overflow-hidden transition-all duration-300 ease-in-out origin-center',
          isDragging
            ? 'scale-y-[2] bg-white/30'
            : 'group-hover:scale-y-[1.5] group-hover:bg-white/25',
        )}
      >
        {/* Track Fill */}
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Thumb */}
      {showThumb && (
        <div
          className={cn(
            'absolute size-3 bg-white rounded-full shadow-lg transition-transform duration-75 ease-out',
            'scale-0 group-hover:scale-100',
            isDragging && 'scale-100 shadow-[0_0_8px_rgba(255,255,255,0.4)]',
          )}
          style={{ left: `calc(${percentage}% - 6px)` }}
        />
      )}
    </div>
  );
}
