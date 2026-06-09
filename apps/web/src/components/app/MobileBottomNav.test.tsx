import { customRenderWithRouter } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MobileBottomNav } from './MobileBottomNav';
import { useLocation } from '@tanstack/react-router';

// Mock TanStack Router
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

describe('MobileBottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all navigation items', async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/app', search: {} } as any);
    customRenderWithRouter(<MobileBottomNav />);

    expect(await screen.findByTestId('nav-item-home')).toBeInTheDocument();
    expect(await screen.findByTestId('nav-item-new')).toBeInTheDocument();
    expect(await screen.findByTestId('nav-item-library')).toBeInTheDocument();
    expect(await screen.findByTestId('nav-item-playlists')).toBeInTheDocument();
    expect(await screen.findByTestId('nav-item-search')).toBeInTheDocument();
  });

  it('highlights "Home" as active when at /app', async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/app', search: {} } as any);
    customRenderWithRouter(<MobileBottomNav />);

    const homeItem = await screen.findByTestId('nav-item-home');
    expect(homeItem.className).toMatch(/text-primary/);

    const searchItem = await screen.findByTestId('nav-item-search');
    expect(searchItem.className).not.toMatch(/text-primary/);
  });

  it('highlights "Search" as active when at /app/search', async () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/app/search', search: {} } as any);
    customRenderWithRouter(<MobileBottomNav />);

    const searchItem = await screen.findByTestId('nav-item-search');
    expect(searchItem.className).toMatch(/text-primary/);
  });

  it('uses persistent links from sessionStorage', async () => {
    const lastVisitedNew = '/app/new/trending';
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'last_visited_new_route') return lastVisitedNew;
      return null;
    });

    vi.mocked(useLocation).mockReturnValue({ pathname: '/app', search: {} } as any);
    customRenderWithRouter(<MobileBottomNav />);

    const newItem = await screen.findByTestId('nav-item-new');
    expect(newItem).toHaveAttribute('href', lastVisitedNew);

    getItemSpy.mockRestore();
  });

  it('highlights "Library" as active when at sub-routes of /app/library', async () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: '/app/library/artists/123',
      search: {},
    } as any);
    customRenderWithRouter(<MobileBottomNav />);

    const libraryItem = await screen.findByTestId('nav-item-library');
    expect(libraryItem.className).toMatch(/text-primary/);
  });

  it('uses persistent library link from sessionStorage', async () => {
    const lastVisitedLibrary = '/app/library/artists/456';
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'last_visited_library_route') return lastVisitedLibrary;
      return null;
    });

    vi.mocked(useLocation).mockReturnValue({ pathname: '/app', search: {} } as any);
    customRenderWithRouter(<MobileBottomNav />);

    const libraryItem = await screen.findByTestId('nav-item-library');
    expect(libraryItem).toHaveAttribute('href', lastVisitedLibrary);

    getItemSpy.mockRestore();
  });
});
