import { beforeEach, describe, expect, it } from 'vitest';
import { useSearchPreferencesStore } from './search-preferences.store';

describe('SearchPreferencesStore', () => {
  beforeEach(() => {
    useSearchPreferencesStore.getState().clearHistory();
    useSearchPreferencesStore.getState().setViewType('grid');
    useSearchPreferencesStore.getState().setSearchScope('all');
  });

  it('should have initial state', () => {
    const store = useSearchPreferencesStore.getState();
    expect(store.viewType).toBe('grid');
    expect(store.searchScope).toBe('all');
    expect(store.searchHistory).toEqual([]);
  });

  it('should update viewType', () => {
    useSearchPreferencesStore.getState().setViewType('row');
    expect(useSearchPreferencesStore.getState().viewType).toBe('row');
  });

  it('should update searchScope', () => {
    useSearchPreferencesStore.getState().setSearchScope('library');
    expect(useSearchPreferencesStore.getState().searchScope).toBe('library');
  });

  it('should add search to history', () => {
    const store = useSearchPreferencesStore.getState();
    store.addSearchToHistory('query1');
    expect(useSearchPreferencesStore.getState().searchHistory).toEqual(['query1']);
    
    store.addSearchToHistory('query2');
    expect(useSearchPreferencesStore.getState().searchHistory).toEqual(['query2', 'query1']);
  });

  it('should not add duplicate search queries to history', () => {
    const store = useSearchPreferencesStore.getState();
    store.addSearchToHistory('query1');
    store.addSearchToHistory('query1');
    expect(useSearchPreferencesStore.getState().searchHistory).toEqual(['query1']);
  });

  it('should maintain max 10 items in search history', () => {
    const store = useSearchPreferencesStore.getState();
    for (let i = 0; i < 15; i++) {
      store.addSearchToHistory(`query${i}`);
    }
    const searchHistory = useSearchPreferencesStore.getState().searchHistory;
    expect(searchHistory).toHaveLength(10);
    expect(searchHistory[0]).toBe('query14');
  });

  it('should clear history', () => {
    const store = useSearchPreferencesStore.getState();
    store.addSearchToHistory('query1');
    store.clearHistory();
    expect(useSearchPreferencesStore.getState().searchHistory).toEqual([]);
  });
});
