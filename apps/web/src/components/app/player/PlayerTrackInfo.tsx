import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';
import { MusicNotesIcon, SparkleIcon } from '@phosphor-icons/react';
import { useState } from 'react';

interface PlayerTrackInfoProps {
  formatTime: (time: number) => string;
  formatTimeLeft: (time: number, total: number) => string;
  onSeek: (time: number) => void;
}

export function PlayerTrackInfo({ formatTime, formatTimeLeft, onSeek }: PlayerTrackInfoProps) {
  const { currentTrack, currentTime, duration, setCurrentTime, quality, availableQualities } =
    usePlayerStore();
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const isLossless =
    quality === 'lossless' || (quality === 'auto' && availableQualities.includes('lossless'));

  const trackTitle = currentTrack?.title || 'No track selected';
  const trackArtist = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const coverUrl = currentTrack?.album?.cover?.url;

  return (
    <div
      className={cn(
        'flex-1 max-w-[600px] border border-white/8 bg-stone-900 flex items-stretch relative overflow-hidden shadow-xl h-14',
      )}
      style={{ borderRadius: '0.5rem' }}
    >
      {/* Floating Rounded Square Artwork */}
      <div className="p-1.5 shrink-0">
        <div className="h-full aspect-square bg-stone-800 rounded flex items-center justify-center overflow-hidden shadow-inner">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <MusicNotesIcon size={20} className="text-stone-600" />
          )}
        </div>
      </div>

      {/* Right Content Area: Stacked Rows */}
      <div className="flex-1 flex flex-col justify-center min-w-0 pr-3 pl-0 py-1.5 relative">
        {/* Top Row: Title & Artist / Time Reveal */}
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <div className="text-white font-semibold flex items-center gap-2 truncate text-[14px] leading-tight">
            <span className="truncate">{trackTitle}</span>
            {isLossless && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="shrink-0 flex items-center justify-center text-emerald-500 cursor-default">
                      <SparkleIcon weight="fill" size={14} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-stone-800 text-stone-200 border-stone-700 text-xs font-medium"
                  >
                    Playing in Lossless Quality
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div
            className={cn(
              'text-white/50 text-[12px] truncate font-medium transition-all duration-300',
              isHoveringSlider || isDraggingSlider
                ? 'opacity-0 translate-y-1'
                : 'opacity-100 translate-y-0',
            )}
          >
            {trackArtist}
          </div>

          {/* Hover-reveal times */}
          <div
            className={cn(
              'absolute left-0 right-3 top-[26px] flex items-center justify-between text-[11px] text-white/40 tabular-nums transition-all duration-300 pointer-events-none',
              isHoveringSlider || isDraggingSlider
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-1',
            )}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTimeLeft(currentTime, duration)}</span>
          </div>
        </div>

        {/* Bottom Row: Progress Slider */}
        <Slider
          value={currentTime}
          max={duration || 100}
          showThumb={false}
          onMouseEnter={() => setIsHoveringSlider(true)}
          onMouseLeave={() => setIsHoveringSlider(false)}
          onPointerDown={() => setIsDraggingSlider(true)}
          onPointerUp={() => setIsDraggingSlider(false)}
          onChange={(newTime) => {
            onSeek(newTime);
            setCurrentTime(newTime);
          }}
          className="mt-auto w-full"
        />
      </div>
    </div>
  );
}
