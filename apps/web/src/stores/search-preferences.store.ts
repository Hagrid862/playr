import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { idbStorage } from './idb-storage';

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
    set((state) => ({
      searchHistory: [query, ...state.searchHistory.filter((q) => q !== query)].slice(0, 10),
    })),
  clearHistory: () => set({ searchHistory: [] }),
});

export const useSearchPreferencesStore = create<SearchPreferencesState>()(
  persist(createSearchPreferencesStore, {
    name: 'search-preferences-storage',
    storage: idbStorage,
  }),
);
