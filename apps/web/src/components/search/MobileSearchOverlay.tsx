import { SearchInput } from '@/components/search/SearchInput';
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
          className="absolute inset-0 z-50 bg-stone-950 flex flex-col md:hidden"
          aria-label="Search overlay"
        >
          {/* Search input bar */}
          <motion.div
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="px-3 py-2 border-b border-white/10 shrink-0"
          >
            <SearchInput
              resultsInline
              hideScopeToggle
              autoFocus
              onEscape={onClose}
              onSearchComplete={onClose}
              placeholder="Search something..."
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
