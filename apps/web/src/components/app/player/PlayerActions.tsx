import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { listPlaybackDevices, setActivePlaybackDevice } from '@/lib/playback-sync';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';
import {
  CheckIcon,
  DotsThreeIcon,
  QueueIcon,
  QuotesIcon,
  SparkleIcon,
  SpeakerHighIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { StreamAudioQuality } from '@repo/contracts';
import { useState } from 'react';

export function PlayerActions() {
  const [isDevicePopoverOpen, setIsDevicePopoverOpen] = useState(false);
  const {
    volume,
    setVolume,
    isQueueOpen,
    setQueueOpen,
    sidebarView,
    setSidebarView,
    quality,
    setQuality,
    availableQualities,
    playbackDevices,
    activeDeviceId,
  } = usePlayerStore();

  const hasLossless = availableQualities.includes(StreamAudioQuality.lossless);

  return (
    <div
      className="flex h-14 items-center gap-0.5 px-2 py-2.5 bg-stone-900 border border-white/8 shadow-lg min-w-auto"
      style={{ borderRadius: '0.5rem 2rem 2rem 0.5rem' }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="More Player Actions"
            className="text-white/40 hover:text-white active:scale-95 h-9 w-9"
          >
            <DotsThreeIcon size={20} weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="w-48 bg-stone-900 border-white/10 text-white"
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 focus:bg-white/10 data-[state=open]:bg-white/10">
              <SpeakerHighIcon size={16} />
              <span>Audio Quality</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48 bg-stone-900 border-white/10 text-white">
                <DropdownMenuCheckboxItem
                  checked={quality === 'auto'}
                  onCheckedChange={() => setQuality('auto')}
                >
                  Auto
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={quality === StreamAudioQuality.lossless}
                  onCheckedChange={() => setQuality(StreamAudioQuality.lossless)}
                  disabled={!hasLossless}
                  className="text-amber-400 focus:text-amber-500 focus:bg-amber-500/10 data-disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    Lossless
                    <SparkleIcon size={14} weight="fill" />
                  </div>
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={quality === StreamAudioQuality.high}
                  onCheckedChange={() =>
                    availableQualities.includes(StreamAudioQuality.high) &&
                    setQuality(StreamAudioQuality.high)
                  }
                  disabled={!availableQualities.includes(StreamAudioQuality.high)}
                >
                  High
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={quality === StreamAudioQuality.standard}
                  onCheckedChange={() =>
                    availableQualities.includes(StreamAudioQuality.standard) &&
                    setQuality(StreamAudioQuality.standard)
                  }
                  disabled={!availableQualities.includes(StreamAudioQuality.standard)}
                >
                  Standard
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={quality === StreamAudioQuality.low}
                  onCheckedChange={() =>
                    availableQualities.includes(StreamAudioQuality.low) &&
                    setQuality(StreamAudioQuality.low)
                  }
                  disabled={!availableQualities.includes(StreamAudioQuality.low)}
                >
                  Low
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Favorite"
        className="text-white/40 hover:text-white active:scale-95 h-9 w-9"
      >
        <StarIcon size={20} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Lyrics"
        className={cn(
          'text-white/40 hover:text-white active:scale-95 h-9 w-9',
          isQueueOpen && sidebarView === 'lyrics' && 'text-white bg-white/10',
        )}
        onClick={() => {
          if (isQueueOpen && sidebarView === 'lyrics') {
            setQueueOpen(false);
          } else {
            setSidebarView('lyrics');
            setQueueOpen(true);
          }
        }}
      >
        <QuotesIcon size={20} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="Queue"
        className={cn(
          'text-white/40 hover:text-white active:scale-95 h-9 w-9',
          isQueueOpen && sidebarView === 'queue' && 'text-white bg-white/10',
        )}
        onClick={() => {
          if (isQueueOpen && sidebarView === 'queue') {
            setQueueOpen(false);
          } else {
            setSidebarView('queue');
            setQueueOpen(true);
          }
        }}
      >
        <QueueIcon size={20} />
      </Button>

      <Popover
        open={isDevicePopoverOpen}
        onOpenChange={(open) => {
          setIsDevicePopoverOpen(open);
          if (open) {
            void listPlaybackDevices();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Volume"
            className="text-white/40 hover:text-white active:scale-95 h-9 w-9 ml-1"
          >
            <SpeakerHighIcon size={20} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-72 bg-stone-900/95 backdrop-blur-xl border-white/10 p-3 mb-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
          sideOffset={16}
        >
          <div className="mb-2">
            <div className="text-xs font-medium text-white/70 mb-2">Play on</div>
            <div className="space-y-1">
              {playbackDevices.length === 0 ? (
                <div className="text-xs text-white/40 px-2 py-1">No devices connected</div>
              ) : (
                playbackDevices.map((device) => (
                  <button
                    key={device.id}
                    type="button"
                    className={cn(
                      'w-full flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors',
                      device.id === activeDeviceId
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/5',
                    )}
                    onClick={() => void setActivePlaybackDevice(device.id)}
                  >
                    <span className="truncate">
                      {device.isCurrentDevice ? 'Web player (this device)' : device.name}
                    </span>
                    {device.id === activeDeviceId ? <CheckIcon size={14} /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="h-px bg-white/10 my-2" />
          <div className="text-xs font-medium text-white/70 mb-2">Volume</div>
          <Slider
            value={volume * 100}
            min={0}
            max={100}
            onChange={(val) => setVolume(val / 100)}
            className="h-4"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
