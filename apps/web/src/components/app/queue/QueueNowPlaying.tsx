import { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { motion, AnimatePresence } from 'framer-motion';
import { MusicNotesIcon } from '@phosphor-icons/react';

interface QueueNowPlayingProps {
  currentTrack: PlayrQueueItem | null;
}

export function QueueNowPlaying({ currentTrack }: QueueNowPlayingProps) {
  if (!currentTrack) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Now Playing</h3>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentTrack.uniqueId}
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            scale: 0.9,
            filter: 'blur(8px)',
            transition: { duration: 0.2 },
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="group flex items-center gap-3 p-2 rounded-md bg-white/5 border border-white/5 transition-colors hover:bg-white/10"
        >
          <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden bg-stone-800">
            {currentTrack.album?.cover?.url ? (
              <img
                src={currentTrack.album.cover.url}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <MusicNotesIcon className="text-white/20" size={20} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex items-end gap-0.5 h-3">
                <div className="w-1 h-3 bg-green-500 animate-music-bar-1" />
                <div className="w-1 h-2 bg-green-500 animate-music-bar-2" />
                <div className="w-1 h-3 bg-green-500 animate-music-bar-3" />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-green-500 truncate">{currentTrack.title}</div>
            <div className="text-xs text-white/50 truncate">
              {currentTrack.artists?.map((a: { name: string }) => a.name).join(', ')}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
