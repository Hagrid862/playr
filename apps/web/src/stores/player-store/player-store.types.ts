import type {
  ListPlaybackDeviceEntry,
  PlaybackState,
  PlaybackTrack,
  QueueItem,
  StreamAudioQuality,
} from '@repo/contracts';

export interface PlayerState {
  currentTrack: PlaybackTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  quality: StreamAudioQuality | 'auto';
  availableQualities: (StreamAudioQuality | 'auto')[];
  queue: QueueItem[];
  originalQueue: QueueItem[];
  /**
   * Track ids that appeared before the clicked row in the last list/album `playTrack(..., remainder)` session.
   * Used so shuffle can include those tracks in the pool (they live in `history` until shuffle).
   */
  listHeadTrackIds: string[];
  history: QueueItem[];
  repeatMode: 'off' | 'all' | 'one';
  isShuffled: boolean;

  playbackVersion: number;
  /** Incremented on play/pause, skip, and seek so open History can refetch. */
  listenHistoryRefreshToken: number;
  playbackFavorited: 'favorited' | 'disliked' | 'not-set';
  playbackInLibrary: boolean;
  activeDeviceId: string | null;
  localPlaybackDeviceId: string;
  playbackDevices: ListPlaybackDeviceEntry[];

  applyPlaybackStateFromServer: (state: PlaybackState) => void;
  /** Clears track/queue/history and pauses; keeps volume/quality and local device id. */
  clearSessionPlayback: () => void;
  /** Full player reset for logout (including persisted volume/quality/currentTrack/repeatMode). */
  resetForLogout: () => void;
  setLocalPlaybackDeviceId: (deviceId: string) => void;
  setPlaybackDevices: (devices: ListPlaybackDeviceEntry[]) => void;

  playTrack: (track: PlaybackTrack, albumRemainder?: PlaybackTrack[]) => void;
  playQueueItem: (queueId: string) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setQuality: (quality: StreamAudioQuality | 'auto') => void;
  setAvailableQualities: (qualities: (StreamAudioQuality | 'auto')[]) => void;
  setQueue: (queue: PlaybackTrack[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  toggleRepeatMode: () => void;
  toggleShuffle: () => void;
  addToQueue: (track: PlaybackTrack) => void;
  playNext: (track: PlaybackTrack) => void;
  removeFromQueue: (uniqueId: string) => void;
  reorderQueue: (newQueue: QueueItem[]) => void;
  addToHistory: (item: QueueItem) => void;

  isQueueOpen: boolean;
  sidebarView: 'queue' | 'lyrics';
  toggleQueue: () => void;
  setQueueOpen: (isOpen: boolean) => void;
  setSidebarView: (view: 'queue' | 'lyrics') => void;
}
