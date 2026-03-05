import { AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRightIcon, CaretDownIcon, CaretUpIcon, ImageIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import useMeasure from 'react-use-measure';

export interface SingleTrackCoverUpdateBannerProps {
  currentAlbumCoverUrl: string | null;
  trackCoverPreviewUrl: string;
  useTrackCover: boolean;
  onSelect: (use: boolean) => void;
}

export function SingleTrackCoverUpdateBanner({
  currentAlbumCoverUrl,
  trackCoverPreviewUrl,
  useTrackCover,
  onSelect,
}: SingleTrackCoverUpdateBannerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [ref, { height }] = useMeasure();

  const handleSelect = (use: boolean) => {
    onSelect(use);
    setIsMinimized(true);
  };

  return (
    <motion.div
      animate={{ height: height > 0 ? height : 'auto' }}
      className="relative overflow-hidden rounded-xl border border-primary/10 bg-background/40 shadow-sm backdrop-blur-md"
      transition={{
        type: 'spring',
        bounce: 0,
        stiffness: 100,
        damping: 20,
      }}
    >
      <div ref={ref}>
        <AnimatePresence mode="popLayout" initial={false}>
          {isMinimized ? (
            <motion.div
              key="minimized"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => setIsMinimized(false)}
              className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-primary/5"
            >
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  <strong className="font-medium text-foreground">Artwork selection:</strong>{' '}
                  {useTrackCover ? 'Using from file' : 'Keeping current'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <span className="text-[10px] font-medium uppercase tracking-wider">Expand</span>
                <CaretDownIcon size={14} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="p-6"
            >
              <div className="flex flex-col gap-8">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-start gap-5">
                    <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
                      <ImageIcon size={24} className="text-primary" weight="duotone" />
                    </div>
                    <div className="space-y-1">
                      <AlertTitle className="text-lg font-semibold tracking-tight text-foreground">
                        New artwork detected
                      </AlertTitle>
                      <AlertDescription className="max-w-[400px] text-sm leading-relaxed text-muted-foreground">
                        This file contains embedded artwork. Would you like to update the album to use it?
                      </AlertDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full bg-muted/50 text-muted-foreground/50 hover:bg-muted hover:text-primary"
                    onClick={() => setIsMinimized(true)}
                  >
                    <CaretUpIcon size={16} />
                  </Button>
                </div>

                <div className="flex flex-col items-center gap-8">
                  <div className="flex items-center justify-center gap-6 w-full max-w-md">
                    <div className="flex flex-1 flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelect(false)}
                        className={cn(
                          'group relative aspect-square w-full max-w-[160px] flex items-center justify-center overflow-hidden rounded-2xl border bg-muted/30 transition-all duration-300 hover:border-primary/30 hover:scale-101',
                          !useTrackCover && 'ring-2 ring-primary ring-offset-4 ring-offset-background shadow-xl shadow-primary/10 hover:scale-100 hover:border-muted'
                        )}
                      >
                        {currentAlbumCoverUrl ? (
                          <img
                            src={currentAlbumCoverUrl}
                            alt="Current album cover"
                            className="size-full object-cover transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <ImageIcon size={32} className="text-muted-foreground/30" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                              Empty
                            </span>
                          </div>
                        )}
                        {!useTrackCover && (
                          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                        )}
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        Current
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center justify-center">
                    <div className="h-px w-8" />
                    <ArrowRightIcon size={24} className="mx-2 text-muted-foreground/30" />
                    <div className="h-px w-8" />
                    </div>

                    <div className="flex flex-1 flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelect(true)}
                        className={cn(
                          'group relative aspect-square w-full max-w-[160px] flex items-center justify-center overflow-hidden rounded-2xl border bg-muted/30 transition-all duration-300 hover:border-primary/30 hover:scale-101',
                          useTrackCover && 'ring-2 ring-primary ring-offset-4 ring-offset-background shadow-xl shadow-primary/10 hover:scale-100 hover:border-muted'
                        )}
                      >
                        <img
                          src={trackCoverPreviewUrl}
                          alt="Track cover art"
                          className="size-full object-cover transition-transform duration-500"
                        />
                        {useTrackCover && (
                          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                        )}
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                        New
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
