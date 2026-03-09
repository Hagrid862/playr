import { create } from 'zustand';

interface GlobalDragState {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  reset: () => void;
}

export const useGlobalDragStore = create<GlobalDragState>((set) => ({
  isDragging: false,
  setIsDragging: (isDragging: boolean) => set({ isDragging }),
  reset: () => set({ isDragging: false }),
}));
