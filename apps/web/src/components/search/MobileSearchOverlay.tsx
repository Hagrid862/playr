import { SearchInput } from '@/components/search/SearchInput';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useCallback } from 'react';

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when overlay is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] bg-stone-950 flex flex-col md:hidden"
          aria-label="Search overlay"
        >
          {/* Header: back arrow + search input in one row */}
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="flex items-start gap-2 px-3 pt-3 pb-2 shrink-0"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close search"
              className="shrink-0 mt-1"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <SearchInput
                resultsInline
                hideScopeToggle
                autoFocus
                onEscape={onClose}
                onSearchComplete={onClose}
                placeholder="Search something..."
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
