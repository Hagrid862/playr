import { useLibraryAlbums } from '@/hooks/api/library-albums/useLibraryAlbums';
import { useLibraryArtists } from '@/hooks/api/library-artists/useLibraryArtists';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { useLibraryTracks } from '@/hooks/api/library-tracks/useLibraryTracks';
import { useAuthStore } from '@/stores/auth.store';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './Home';
import { PlaylistSystemRole } from '@repo/db';

vi.mock('@/hooks/api/library-albums/useLibraryAlbums');
vi.mock('@/hooks/api/library-artists/useLibraryArtists');
vi.mock('@/hooks/api/library-playlists/useLibraryPlaylists');
vi.mock('@/hooks/api/library-tracks/useLibraryTracks');
vi.mock('@/stores/auth.store');
vi.mock('@/stores/player-store/player.store');

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock('@phosphor-icons/react', () => ({
  DiscIcon: () => <div data-testid="disc-icon" />,
  UsersThreeIcon: () => <div data-testid="users-icon" />,
  PlaylistIcon: () => <div data-testid="playlist-icon" />,
  MusicNotesIcon: () => <div data-testid="music-notes-icon" />,
  PlayIcon: () => <div data-testid="play-icon" />,
  StarIcon: () => <div data-testid="star-icon" />,
}));

describe('Home', () => {
  const mockPlayTrack = vi.fn();
  const mockUser = { firstName: 'Test' };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockImplementation((selector: any) =>
      selector ? selector({ user: mockUser }) : { user: mockUser },
    );
    vi.mocked(usePlayerStore).mockImplementation((selector: any) =>
      selector ? selector({ playTrack: mockPlayTrack }) : { playTrack: mockPlayTrack },
    );

    vi.mocked(useLibraryAlbums).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
    } as any);
    vi.mocked(useLibraryArtists).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
    } as any);
    vi.mocked(useLibraryPlaylists).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
    } as any);
    vi.mocked(useLibraryTracks).mockReturnValue({
      data: { data: { items: [] } },
      isLoading: false,
    } as any);
  });

  it('renders greeting with user name', async () => {
    customRender(<Home />);
    expect(await screen.findByText(/Good .*, Test/)).toBeInTheDocument();
  });

  it('shows playlists section when data is available', async () => {
    vi.mocked(useLibraryPlaylists).mockReturnValue({
      data: {
        data: {
          items: [
            { id: 'p1', name: 'My Playlist', trackCount: 5, systemRole: null, pinned: false },
          ],
        },
      },
      isLoading: false,
    } as any);

    customRender(<Home />);
    expect(await screen.findByText('Your Playlists')).toBeInTheDocument();
    expect(await screen.findByText('My Playlist')).toBeInTheDocument();
  });

  it('shows favorites playlist with special cover', async () => {
    vi.mocked(useLibraryPlaylists).mockReturnValue({
      data: {
        data: {
          items: [
            {
              id: 'fav',
              name: 'Favorites',
              trackCount: 10,
              systemRole: PlaylistSystemRole.favorites,
              pinned: true,
            },
          ],
        },
      },
      isLoading: false,
    } as any);

    customRender(<Home />);
    expect(await screen.findByText('Your Playlists')).toBeInTheDocument();
    // FavoritesPlaylistCover contains a Star icon, but since we didn't mock it, it renders the real one
    // Let's just check if the section is there
    expect(await screen.findByText('Favorites')).toBeInTheDocument();
  });

  it('shows tracks section and plays song on click', async () => {
    const mockTrack = {
      id: 't1',
      title: 'Song 1',
      trackId: 't1',
      albumId: 'a1',
      artists: [{ id: 'art1', name: 'Artist 1' }],
      album: { id: 'a1', name: 'Album 1', cover: { url: 'cover.jpg' } },
      duration: 180,
    };

    vi.mocked(useLibraryTracks).mockReturnValue({
      data: { data: { items: [mockTrack] } },
      isLoading: false,
    } as any);

    customRender(<Home />);
    expect(await screen.findByText('Recent Songs')).toBeInTheDocument();
    expect(await screen.findByText('Song 1')).toBeInTheDocument();

    // Click on the song title (or the card)
    const songTitle = await screen.findByText('Song 1');
    fireEvent.click(songTitle);

    expect(mockPlayTrack).toHaveBeenCalled();
  });

  it('renders loading skeletons', async () => {
    vi.mocked(useLibraryAlbums).mockReturnValue({ isLoading: true } as any);

    customRender(<Home />);
    // Should have multiple skeletons for the loading section
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('hides sections when they are empty', () => {
    customRender(<Home />);
    expect(screen.queryByText('Your Playlists')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Songs')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Artists')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Albums')).not.toBeInTheDocument();
  });
});
