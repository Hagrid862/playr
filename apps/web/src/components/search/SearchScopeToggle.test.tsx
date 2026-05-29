import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchScopeToggle } from './SearchScopeToggle';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';

// Mock the store
vi.mock('@/stores/search-preferences.store', () => ({
  useSearchPreferencesStore: vi.fn(),
}));

describe('SearchScopeToggle', () => {
  const setSearchScope = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSearchPreferencesStore as any).mockReturnValue({
      setSearchScope,
    });
  });

  it('forces search scope to "library" on mount', () => {
    customRender(<SearchScopeToggle />);
    expect(setSearchScope).toHaveBeenCalledWith('library');
  });

  it('renders both scope buttons', () => {
    customRender(<SearchScopeToggle />);
    expect(screen.getByTestId('scope-toggle-all')).toBeInTheDocument();
    expect(screen.getByTestId('scope-toggle-library')).toBeInTheDocument();
  });

  it('shows library scope as active (secondary variant)', () => {
    customRender(<SearchScopeToggle />);
    const libraryButton = screen.getByTestId('scope-toggle-library');
    expect(libraryButton.className).toMatch(/bg-secondary/);
    expect(libraryButton).not.toBeDisabled();
    expect(libraryButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows all scope as inactive (ghost variant)', () => {
    customRender(<SearchScopeToggle />);
    const allButton = screen.getByTestId('scope-toggle-all');
    // ghost variant typically doesn't have bg-secondary or bg-background
    expect(allButton.className).not.toMatch(/bg-secondary/);
    expect(allButton.className).toMatch(/opacity-50/);
    expect(allButton.className).toMatch(/cursor-not-allowed/);
  });
});
