import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

export type SearchViewType = 'row' | 'grid';
export type SearchScope = 'all' | 'library';

interface SearchPreferencesState {
  viewType: SearchViewType;
  setViewType: (viewType: SearchViewType) => void;
  searchScope: SearchScope;
  setSearchScope: (searchScope: SearchScope) => void;
  lastQuery: string | null;
  setLastQuery: (query: string | null) => void;
}

export const useSearchPreferencesStore = create<SearchPreferencesState>()(
  persist(
    (set) => ({
      viewType: 'grid',
      setViewType: (viewType) => set({ viewType }),
      searchScope: 'all',
      setSearchScope: (searchScope) => set({ searchScope }),
      lastQuery: null,
      setLastQuery: (lastQuery) => set({ lastQuery }),
    }),
    {
      name: 'search-preferences-storage',
      storage: idbStorage,
    },
  ),
);
