import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';
import type { SearchQuery } from '@repo/contracts';

export type SearchViewType = 'row' | 'grid';
export type SearchScope = 'all' | 'library';

interface SearchPreferencesState {
  viewType: SearchViewType;
  setViewType: (viewType: SearchViewType) => void;
  searchScope: SearchScope;
  setSearchScope: (searchScope: SearchScope) => void;
  isFiltersOpen: boolean;
  toggleFilters: () => void;
  searchHistory: string[];
  addSearchToHistory: (query: string) => void;
  clearHistory: () => void;
  lastSearch: SearchQuery | null;
  setLastSearch: (search: SearchQuery | null) => void;
}

export const createSearchPreferencesStore: StateCreator<SearchPreferencesState> = (set) => ({
  viewType: 'grid',
  setViewType: (viewType) => set({ viewType }),
  searchScope: 'all',
  setSearchScope: (searchScope) => set({ searchScope }),
  isFiltersOpen: false,
  toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
  searchHistory: [],
  // TODO: Replace this frontend-only search history with a server-side implementation later.
  addSearchToHistory: (query) =>
    set((state) => {
      const trimmed = query.trim();
      if (!trimmed) return state;

      return {
        searchHistory: [trimmed, ...state.searchHistory.filter((q) => q !== trimmed)].slice(0, 10),
      };
    }),
  clearHistory: () => set({ searchHistory: [] }),
  lastSearch: null,
  setLastSearch: (lastSearch) => set({ lastSearch }),
});

export const useSearchPreferencesStore = create<SearchPreferencesState>()(
  persist(createSearchPreferencesStore, {
    name: 'search-preferences-storage',
    storage: idbStorage,
  }),
);
