import { useMediaQuery } from '@/hooks/use-media-query';
import {
  emitCurrentTimeSync,
  firePlaybackCommand,
  isPlaybackSyncConnected,
} from '@/lib/playback/sync/playback-sync';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { PlayerActions } from './player/PlayerActions';
import { PlayerControls } from './player/PlayerControls';
import { PlayerMobile } from './player/PlayerMobile';
import { PlayerTrackInfo } from './player/PlayerTrackInfo';
import { usePlayerAudio } from './player/use-player-audio';

const MOBILE_BREAKPOINT = '(max-width: 767px)';
const LARGE_BREAKPOINT = '(min-width: 1200px)';

export function AppPlayer() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const isLargeScreen = useMediaQuery(LARGE_BREAKPOINT);
  const { currentTrack, playbackVersion } = usePlayerStore();
  const {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleTrackEnd,
    handleStreamError,
    getAudioUrl,
    formatTime,
    formatTimeLeft,
    isMp3FormatFallback,
  } = usePlayerAudio();

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekCommit = (time: number) => {
    if (!isPlaybackSyncConnected() || !currentTrack || playbackVersion === 0) {
      return;
    }

    firePlaybackCommand(emitCurrentTimeSync(time), 'emitCurrentTimeSync');
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <audio
        ref={audioRef}
        src={getAudioUrl()}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnd}
        onError={handleStreamError}
      />

      {!isLargeScreen ? (
        <PlayerMobile formatTime={formatTime} formatTimeLeft={formatTimeLeft} compact={isMobile} />
      ) : (
        <div className="flex w-full h-full items-center justify-center px-6 gap-2">
          {/* Island 1: Controls (Left) */}
          <PlayerControls />

          {/* Island 2: Track Info & Progress (Center) */}
          <PlayerTrackInfo
            formatTime={formatTime}
            formatTimeLeft={formatTimeLeft}
            onSeek={handleSeek}
            onSeekCommit={handleSeekCommit}
            showMp3StreamBadge={isMp3FormatFallback}
          />

          {/* Island 3: Actions (Right) */}
          <PlayerActions />
        </div>
      )}
    </div>
  );
}
