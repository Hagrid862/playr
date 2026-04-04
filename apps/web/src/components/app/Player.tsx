import { useIsMobile } from '@/hooks/use-mobile';
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

export function AppPlayer() {
  const isMobile = useIsMobile();
  const { currentTrack, playbackVersion } = usePlayerStore();
  const {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleTrackEnd,
    getAudioUrl,
    formatTime,
    formatTimeLeft,
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
      />

      {isMobile ? (
        <PlayerMobile />
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
          />

          {/* Island 3: Actions (Right) */}
          <PlayerActions />
        </div>
      )}
    </div>
  );
}
