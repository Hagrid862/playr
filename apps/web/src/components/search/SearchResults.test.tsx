import { customRenderWithRouter } from '@repo/testing/web';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchResults } from './SearchResults';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { useNavigate } from '@tanstack/react-router';

// Mock the stores and hooks
vi.mock('@/stores/player-store/player.store');
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('SearchResults', () => {
  const mockNavigate = vi.fn();
  const playTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    (usePlayerStore as any).mockReturnValue({ playTrack });
  });

  const mockData = {
    results: [
      { id: '1', type: 'artist', name: 'Top Artist', score: 0.9, visibility: 'public' },
      { id: '2', type: 'album', name: 'Other Album', score: 0.5, visibility: 'public' },
      {
        id: '3',
        type: 'track',
        name: 'Other Track',
        score: 0.4,
        visibility: 'public',
        authors: [],
      },
    ],
  };

  it('renders "No results found" when results array is empty', async () => {
    customRenderWithRouter(<SearchResults data={{ results: [] } as any} />);
    expect(await screen.findByTestId('search-results-empty')).toBeInTheDocument();
  });

  it('identifies and renders Best Match when score >= 0.65', async () => {
    customRenderWithRouter(<SearchResults data={mockData as any} />);

    expect(await screen.findByTestId('search-results-best-match')).toBeInTheDocument();
    // Best match name is in a large font
    const bestMatch = await screen.findByTestId('search-results-best-match');
    expect(bestMatch).toHaveTextContent('Top Artist');
    expect(await screen.findByTestId('search-results-remaining')).toBeInTheDocument();
  });

  it('renders all results in remaining section if no best match', async () => {
    const lowScoreData = {
      results: [
        { id: '1', type: 'artist', name: 'Artist A', score: 0.5, visibility: 'public' },
        { id: '2', type: 'album', name: 'Album B', score: 0.4, visibility: 'public' },
      ],
    };

    customRenderWithRouter(<SearchResults data={lowScoreData as any} />);

    expect(screen.queryByTestId('search-results-best-match')).not.toBeInTheDocument();
    expect(await screen.findByTestId('search-results-remaining')).toBeInTheDocument();

    // Use findByTestId because there are multiple Artist A (one for desktop, one for mobile)
    expect(await screen.findByTestId('search-result-grid-1')).toHaveTextContent('Artist A');
    expect(await screen.findByTestId('search-result-grid-2')).toHaveTextContent('Album B');
  });

  it('renders in grid view by default', async () => {
    customRenderWithRouter(<SearchResults data={mockData as any} />);

    // Remaining results should be in grid (for desktop)
    expect(await screen.findByTestId('search-result-grid-2')).toBeInTheDocument();
    expect(await screen.findByTestId('search-result-grid-3')).toBeInTheDocument();
  });

  it('renders in row view when viewType is "row"', async () => {
    customRenderWithRouter(<SearchResults data={mockData as any} viewType="row" />);

    // Remaining results should be in row (for desktop)
    // Both desktop and mobile use search-result-row-X when viewType is row
    const rows = await screen.findAllByTestId(/search-result-row-/);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('navigates to artist page when artist result is clicked', async () => {
    customRenderWithRouter(<SearchResults data={mockData as any} />);

    const bestMatchCard = await screen.findByTestId('search-result-best-match-card');
    fireEvent.click(bestMatchCard);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/library/artists/$id',
      params: { id: '1' },
    });
  });

  it('plays track when track result is clicked', async () => {
    const trackData = {
      results: [
        {
          id: 't1',
          type: 'track',
          name: 'Track A',
          score: 0.5,
          visibility: 'public',
          authors: [{ id: 'a1', name: 'Author X' }],
          duration: 180,
          albumId: 'al1',
        },
      ],
    };

    customRenderWithRouter(<SearchResults data={trackData as any} />);

    // Pick the grid item (desktop)
    const trackItem = await screen.findByTestId('search-result-grid-t1');
    fireEvent.click(trackItem);

    expect(playTrack).toHaveBeenCalled();
    const playedTrack = playTrack.mock.calls[0][0];
    expect(playedTrack.id).toBe('t1');
    expect(playedTrack.title).toBe('Track A');
  });

  it('navigates to album page when album result is clicked', async () => {
    const albumData = {
      results: [{ id: 'al1', type: 'album', name: 'Album A', score: 0.5, visibility: 'public' }],
    };
    customRenderWithRouter(<SearchResults data={albumData as any} />);

    const albumItem = await screen.findByTestId('search-result-grid-al1');
    fireEvent.click(albumItem);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/library/albums/$id',
      params: { id: 'al1' },
    });
  });

  it('navigates to genre page when genre result is clicked', async () => {
    const genreData = {
      results: [{ id: 'g1', type: 'genre', name: 'Rock', score: 0.5, visibility: 'public' }],
    };
    customRenderWithRouter(<SearchResults data={genreData as any} />);

    const genreItem = await screen.findByTestId('search-result-grid-g1');
    fireEvent.click(genreItem);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/library/genres/$genreId',
      params: { genreId: 'g1' },
    });
  });

  it('navigates to playlist page when playlist result is clicked', async () => {
    const playlistData = {
      results: [
        { id: 'p1', type: 'playlist', name: 'My Playlist', score: 0.5, visibility: 'public' },
      ],
    };
    customRenderWithRouter(<SearchResults data={playlistData as any} />);

    const playlistItem = await screen.findByTestId('search-result-grid-p1');
    fireEvent.click(playlistItem);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/app/playlists/$playlistId',
      params: { playlistId: 'p1' },
    });
  });

  it('renders explicit badge for explicit tracks', async () => {
    const explicitTrackData = {
      results: [
        {
          id: 't1',
          type: 'track',
          name: 'Explicit Track',
          score: 0.5,
          explicit: true,
          visibility: 'public',
          authors: [],
        },
      ],
    };
    customRenderWithRouter(<SearchResults data={explicitTrackData as any} />);

    const trackItem = await screen.findByTestId('search-result-grid-t1');
    expect(trackItem).toHaveTextContent('E');
  });

  it('formats duration correctly', async () => {
    const trackData = {
      results: [
        {
          id: 't1',
          type: 'track',
          name: 'Track A',
          score: 0.5,
          duration: 125, // 2:05
          visibility: 'public',
          authors: [],
        },
      ],
    };
    customRenderWithRouter(<SearchResults data={trackData as any} />);

    const trackItem = await screen.findByTestId('search-result-grid-t1');
    expect(trackItem).toHaveTextContent('2:05');
  });

  it('renders author names and links', async () => {
    const trackData = {
      results: [
        {
          id: 't1',
          type: 'track',
          name: 'Track A',
          score: 0.5,
          visibility: 'public',
          authors: [
            { id: 'a1', name: 'Author One' },
            { id: 'a2', name: 'Author Two' },
          ],
        },
      ],
    };
    customRenderWithRouter(<SearchResults data={trackData as any} />);

    const trackItem = await screen.findByTestId('search-result-grid-t1');
    expect(trackItem).toHaveTextContent('Author One');
    expect(trackItem).toHaveTextContent('Author Two');

    const authorLink = within(trackItem).getByText('Author One');
    expect(authorLink).toHaveAttribute('href', '/app/library/artists/a1');
  });

  it('stops propagation when author link is clicked', async () => {
    const trackData = {
      results: [
        {
          id: 't1',
          type: 'track',
          name: 'Track A',
          score: 0.9, // Best match
          visibility: 'public',
          authors: [{ id: 'a1', name: 'Author One' }],
          albumId: 'al1',
        },
      ],
    };
    customRenderWithRouter(<SearchResults data={trackData as any} />);

    const authorLink = await screen.findByText('Author One');
    fireEvent.click(authorLink);

    // playTrack should NOT be called because propagation was stopped
    // Wait, playTrack is called in handleItemClick.
    // If propagation is stopped, handleItemClick of the card should NOT be called.
    expect(playTrack).not.toHaveBeenCalled();
    // mockNavigate is NOT called by handleItemClick for tracks (it calls playTrack)
    // The link itself handles navigation via 'to' prop in Link component
  });
});
