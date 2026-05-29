import { customRenderWithRouter } from '@repo/testing/web';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CompactSearch } from './CompactSearch';
import { useSearchSuggestions } from '@/hooks/api/search/useSearchSuggestions';
import { useLibrarySearchSuggestions } from '@/hooks/api/search/useLibrarySearchSuggestions';
import { useSearchPreferencesStore } from '@/stores/search-preferences.store';

// Mock the hooks
vi.mock('@/hooks/api/search/useSearchSuggestions');
vi.mock('@/hooks/api/search/useLibrarySearchSuggestions');
vi.mock('@/stores/search-preferences.store');

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CompactSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });
  });

  it('renders in compact mode by default', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    const container = await screen.findByTestId('compact-search');
    expect(container).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
  });

  it('expands when hovered', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    const container = await screen.findByTestId('compact-search');
    
    fireEvent.mouseEnter(container);
    
    expect(await screen.findByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('expands and focuses input when icon is clicked', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    expect(icon).toBeInTheDocument();
    
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    expect(input).toBeInTheDocument();
    
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it('updates query when typing', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(input).toHaveValue('test query');
  });

  it('shows placeholder based on category', async () => {
    customRenderWithRouter(<CompactSearch category="artist" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    expect(await screen.findByPlaceholderText('Search artists...')).toBeInTheDocument();
  });

  it('fetches suggestions when query is at least 3 characters', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    await waitFor(() => {
      expect(useSearchSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'abc' }),
        expect.objectContaining({ enabled: true })
      );
    }, { timeout: 2000 });
  });

  it('displays suggestions in dropdown', async () => {
    const mockSuggestions = [
      { id: '1', type: 'artist', name: 'Artist 1', coverURL: 'artist1.jpg' },
      { id: '2', type: 'album', name: 'Album 1', coverURL: 'album1.jpg' },
    ];
    
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockSuggestions } },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(await screen.findByText('Artist 1')).toBeInTheDocument();
    expect(await screen.findByText('Album 1')).toBeInTheDocument();
  });

  it('navigates to search page on Enter press', async () => {
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'some query' } });
    
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
        to: '/app/search',
        search: expect.any(Function)
      }));
    });
    
    // Test the search function result
    const searchFn = mockNavigate.mock.calls[0][0].search;
    const searchParams = searchFn({});
    expect(searchParams.query).toBe('some query');
    expect(searchParams.filters.categories).toBeUndefined(); // 'all' category
  });

  it('navigates to search page with category filter', async () => {
    customRenderWithRouter(<CompactSearch category="playlist" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search playlists...');
    fireEvent.change(input, { target: { value: 'some query' } });
    
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({
        to: '/app/search',
        search: expect.any(Function)
      }));
    });
    
    const searchFn = mockNavigate.mock.calls[0][0].search;
    const searchParams = searchFn({});
    expect(searchParams.filters.categories).toEqual(['playlist']);
  });

  it('calls onResultSelect when a suggestion is clicked', async () => {
    const onResultSelect = vi.fn();
    const mockSuggestions = [
      { id: '1', type: 'artist', name: 'Artist 1' },
    ];
    
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockSuggestions } },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    
    customRenderWithRouter(<CompactSearch category="all" onResultSelect={onResultSelect} />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    const suggestion = await screen.findByText('Artist 1');
    fireEvent.click(suggestion);
    
    expect(onResultSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('uses library suggestions when searchScope is "library"', async () => {
    (useSearchPreferencesStore as any).mockReturnValue({
      searchScope: 'library',
    });
    
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    await waitFor(() => {
      expect(useLibrarySearchSuggestions).toHaveBeenCalled();
      expect(useSearchSuggestions).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled: false })
      );
    });
  });

  it('shows spinner when loading suggestions', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: true,
      error: null,
    });
    
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    // There should be two spinners: one in the input bar and one in the dropdown
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    (useSearchSuggestions as any).mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: { message: 'Failed to fetch' },
    });
    
    customRenderWithRouter(<CompactSearch category="all" />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    expect(await screen.findByText('Search error')).toBeInTheDocument();
    expect(await screen.findByText('Failed to fetch')).toBeInTheDocument();
  });

  it('does not show dropdown when hideDropdown is true', async () => {
    const mockSuggestions = [
      { id: '1', type: 'artist', name: 'Artist 1' },
    ];
    
    (useSearchSuggestions as any).mockReturnValue({
      data: { data: { results: mockSuggestions } },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    
    customRenderWithRouter(<CompactSearch category="all" hideDropdown={true} />);
    
    const icon = await screen.findByTestId('compact-search-icon');
    fireEvent.click(icon);
    
    const input = await screen.findByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    // Dropdown should not be visible
    expect(screen.queryByText('Artist 1')).not.toBeInTheDocument();
    expect(useSearchSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
});
