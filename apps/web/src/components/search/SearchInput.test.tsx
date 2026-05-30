import { customRenderWithRouter } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchInput } from './SearchInput';
import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { useLibrarySearchSuggestions } from '@/hooks/api/search/useLibrarySearchSuggestions';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';
import { useNavigate, useSearch } from '@tanstack/react-router';

// Mock the hooks
vi.mock('@/hooks/api/search/useSearchSuggestions');
vi.mock('@/hooks/api/search/useLibrarySearchSuggestions');
vi.mock('@/stores/search-preferences.store');
vi.mock('./SearchScopeToggle', () => ({
  SearchScopeToggle: () => <div data-testid="mock-scope-toggle">Mock Scope Toggle</div>,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
    useSearch: vi.fn(),
  };
});

describe('SearchInput', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useSearch).mockReturnValue({});

    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    (useLibrarySearchSuggestions as any).mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    (useSearchPreferencesStore as any).mockReturnValue({
      searchScope: 'all',
      setSearchScope: vi.fn(),
    });
  });

  it('renders with placeholder', async () => {
    customRenderWithRouter(<SearchInput placeholder="Custom placeholder" />);
    expect(await screen.findByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('updates query value when typing', async () => {
    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'test query' } });
    expect(input).toHaveValue('test query');
  });

  it('shows clear button when query is present', async () => {
    customRenderWithRouter(<SearchInput initialValue="some text" />);
    expect(await screen.findByTestId('search-input-clear')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    customRenderWithRouter(<SearchInput initialValue="some text" />);
    const clearButton = await screen.findByTestId('search-input-clear');

    fireEvent.click(clearButton);

    expect(await screen.findByTestId('search-input-field')).toHaveValue('');
  });

  it('fetches suggestions after debounce when typing at least 3 chars', async () => {
    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    await waitFor(
      () => {
        expect(useSearchSuggestions).toHaveBeenCalledWith(
          expect.objectContaining({ query: 'abc' }),
          expect.objectContaining({ enabled: true }),
        );
      },
      { timeout: 2000 },
    );
  });

  it('shows dropdown results on desktop', async () => {
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    expect(await screen.findByTestId('search-input-dropdown')).toBeInTheDocument();
    expect(await screen.findByText('Artist A')).toBeInTheDocument();
  });

  it('shows inline results on mobile when resultsInline is true', async () => {
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput resultsInline />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    expect(await screen.findByTestId('search-input-inline-results')).toBeInTheDocument();
    expect(screen.queryByTestId('search-input-dropdown')).not.toBeInTheDocument();
    expect(await screen.findByText('Artist A')).toBeInTheDocument();
  });

  it('navigates to search page on Enter', async () => {
    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'my search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/search',
        search: expect.any(Function),
      }),
    );
  });

  it('calls onSearch callback if provided instead of navigating', async () => {
    const onSearch = vi.fn();
    customRenderWithRouter(<SearchInput onSearch={onSearch} />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'my search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledWith('my search');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls onEscape when Escape key is pressed', async () => {
    const onEscape = vi.fn();
    customRenderWithRouter(<SearchInput onEscape={onEscape} />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalled();
  });

  // ── Mobile states ──────────────────────────────────────────

  it('renders collapsed mobile button when mobile=true and mobileExpanded=false', async () => {
    const onMobileToggle = vi.fn();
    customRenderWithRouter(
      <SearchInput mobile mobileExpanded={false} onMobileToggle={onMobileToggle} />,
    );

    // Should show a button with "Open search" aria label
    const button = await screen.findByRole('button', { name: 'Open search' });
    expect(button).toBeInTheDocument();
    // Should NOT have the text input visible
    expect(screen.queryByTestId('search-input-field')).not.toBeInTheDocument();
  });

  it('calls onMobileToggle when collapsed mobile button is clicked', async () => {
    const onMobileToggle = vi.fn();
    customRenderWithRouter(
      <SearchInput mobile mobileExpanded={false} onMobileToggle={onMobileToggle} />,
    );

    const button = await screen.findByRole('button', { name: 'Open search' });
    fireEvent.click(button);

    expect(onMobileToggle).toHaveBeenCalled();
  });

  it('shows search icon inside input when mobile and expanded', async () => {
    customRenderWithRouter(<SearchInput mobile mobileExpanded />);

    // The input should be visible with the mobile-specific placeholder
    const input = await screen.findByTestId('search-input-field');
    expect(input).toBeInTheDocument();
    // Scope toggle is hidden on mobile expanded (effectiveHideScopeToggle = mobile && mobileExpanded)
    expect(screen.queryByTestId('mock-scope-toggle')).not.toBeInTheDocument();
  });

  it('calls onMobileToggle on Escape when mobile and no onEscape provided', async () => {
    const onMobileToggle = vi.fn();
    customRenderWithRouter(<SearchInput mobile mobileExpanded onMobileToggle={onMobileToggle} />);

    const input = await screen.findByTestId('search-input-field');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onMobileToggle).toHaveBeenCalled();
  });

  // ── hideScopeToggle ────────────────────────────────────────

  it('hides scope toggle when hideScopeToggle is true', async () => {
    customRenderWithRouter(<SearchInput hideScopeToggle />);

    const input = await screen.findByTestId('search-input-field');
    expect(input).toBeInTheDocument();
    expect(screen.queryByTestId('mock-scope-toggle')).not.toBeInTheDocument();
  });

  it('hides scope toggle on mobile expanded even when hideScopeToggle is false', async () => {
    // mobile + mobileExpanded forces hideScopeToggle regardless of the prop
    customRenderWithRouter(<SearchInput mobile mobileExpanded hideScopeToggle={false} />);

    await screen.findByTestId('search-input-field');
    // The component logic: effectiveHideScopeToggle = hideScopeToggle || (mobile && mobileExpanded)
    expect(screen.queryByTestId('mock-scope-toggle')).not.toBeInTheDocument();
  });

  // ── hideDropdown ───────────────────────────────────────────

  it('does not show dropdown when hideDropdown is true', async () => {
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput hideDropdown />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    // Dropdown should not appear
    expect(screen.queryByTestId('search-input-dropdown')).not.toBeInTheDocument();
    // Suggestions should be disabled
    expect(useSearchSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
  });

  // ── Suggestion interactions ────────────────────────────────

  it('navigates when a suggestion is clicked', async () => {
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    const suggestion = await screen.findByText('Artist A');
    fireEvent.click(suggestion);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/search',
        search: expect.any(Function),
      }),
    );

    const searchFn = mockNavigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.query).toBe('Artist A');
    expect(result.filters.visibility).toBeUndefined(); // 'all' scope
  });

  it('calls onSearch when a suggestion is clicked and onSearch is provided', async () => {
    const onSearch = vi.fn();
    const onSearchComplete = vi.fn();
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput onSearch={onSearch} onSearchComplete={onSearchComplete} />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    const suggestion = await screen.findByText('Artist A');
    fireEvent.click(suggestion);

    expect(onSearch).toHaveBeenCalledWith('Artist A');
    expect(onSearchComplete).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "See all results" footer and navigates on click', async () => {
    const mockResults = [{ id: '1', type: 'artist', name: 'Artist A' }];
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockResults } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'my search' } });

    const seeAll = await screen.findByText(/See all results for/);
    expect(seeAll).toBeInTheDocument();
    fireEvent.click(seeAll);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/app/search',
      }),
    );
  });

  // ── Dropdown states ────────────────────────────────────────

  it('shows "Keep typing" message when query is too short', async () => {
    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'ab' } });

    // Dropdown appears (isOpen=true and text present) but shows "Keep typing" since < 3 chars
    const dropdown = await screen.findByTestId('search-input-dropdown');
    expect(dropdown).toHaveTextContent(/Keep typing/);
  });

  it('shows loading spinner in dropdown', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    // The dropdown should contain a spinner
    await screen.findByTestId('search-input-dropdown');
    // Spinner renders with animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message in dropdown on failure', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: { message: 'Network failure' },
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'abc' } });

    expect(await screen.findByText('Search error')).toBeInTheDocument();
    expect(await screen.findByText('Network failure')).toBeInTheDocument();
  });

  it('shows "No results found" when suggestions are empty', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: [] } },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'xyz123' } });

    expect(await screen.findByText(/No results found for/)).toBeInTheDocument();
  });

  // ── Library scope ──────────────────────────────────────────

  it('uses library suggestions when searchScope is "library"', async () => {
    (useSearchPreferencesStore as any).mockReturnValue({
      searchScope: 'library',
      setSearchScope: vi.fn(),
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    // Placeholder should reflect library scope
    expect(input).toHaveAttribute('placeholder', 'Search in your library...');

    fireEvent.change(input, { target: { value: 'abc' } });

    await waitFor(() => {
      expect(useLibrarySearchSuggestions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: true }),
      );
    });
  });

  it('includes visibility=private filter when navigating in library scope', async () => {
    (useSearchPreferencesStore as any).mockReturnValue({
      searchScope: 'library',
      setSearchScope: vi.fn(),
    });

    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'my search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const searchFn = mockNavigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.visibility).toBe('private');
  });

  // ── onSearchComplete ──────────────────────────────────────

  it('calls onSearchComplete after search via Enter', async () => {
    const onSearchComplete = vi.fn();
    customRenderWithRouter(<SearchInput onSearchComplete={onSearchComplete} />);
    const input = await screen.findByTestId('search-input-field');

    fireEvent.change(input, { target: { value: 'test search' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearchComplete).toHaveBeenCalled();
  });

  // ── size variant ───────────────────────────────────────────

  it('renders with sm size variant', async () => {
    customRenderWithRouter(<SearchInput size="sm" />);
    const input = await screen.findByTestId('search-input-field');
    expect(input).toBeInTheDocument();
    // sm size applies h-8 class
    expect(input.className).toMatch(/h-8/);
  });

  // ── Search params sync ─────────────────────────────────────

  it('initialValue takes precedence and renders immediately', async () => {
    customRenderWithRouter(<SearchInput initialValue="init-val" />);
    const input = await screen.findByTestId('search-input-field');

    expect(input).toHaveValue('init-val');
  });

  // ── Spinner in input bar ───────────────────────────────────

  it('shows fetching spinner in input bar', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: true,
      error: null,
    });

    customRenderWithRouter(<SearchInput initialValue="searching" />);
    await screen.findByTestId('search-input-field');

    // The input bar should show a spinner (not the clear button)
    expect(screen.queryByTestId('search-input-clear')).not.toBeInTheDocument();
    // Spinner exists
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // ── Default placeholder ────────────────────────────────────

  it('shows default placeholder based on scope', async () => {
    customRenderWithRouter(<SearchInput />);
    const input = await screen.findByTestId('search-input-field');
    expect(input).toHaveAttribute('placeholder', 'Search on Playr...');
  });
});
