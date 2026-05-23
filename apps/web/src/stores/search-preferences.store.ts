import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

export type SearchViewType = 'row' | 'grid';

interface SearchPreferencesState {
  viewType: SearchViewType;
  setViewType: (viewType: SearchViewType) => void;
}

export const useSearchPreferencesStore = create<SearchPreferencesState>()(
  persist(
    (set) => ({
      viewType: 'row',
      setViewType: (viewType) => set({ viewType }),
    }),
    {
      name: 'search-preferences-storage',
      storage: idbStorage,
    },
  ),
);
