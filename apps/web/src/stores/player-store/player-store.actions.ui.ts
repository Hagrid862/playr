import type { StoreApi } from 'zustand';
import type { PlayerState } from './player-store.types';

export function createPlayerUiActions(
  set: StoreApi<PlayerState>['setState'],
): Pick<PlayerState, 'toggleQueue' | 'setQueueOpen' | 'setSidebarView' | 'setPlayerExpanded'> {
  return {
    toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
    setQueueOpen: (isOpen) => set({ isQueueOpen: isOpen }),
    setSidebarView: (view) => set({ sidebarView: view }),
    setPlayerExpanded: (expanded) => set({ isPlayerExpanded: expanded }),
  };
}
