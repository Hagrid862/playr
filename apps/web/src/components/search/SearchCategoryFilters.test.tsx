import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchCategoryFilters } from './SearchCategoryFilters';
import { type SearchCategory } from '@repo/contracts';

describe('SearchCategoryFilters', () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all categories when not locked', () => {
    customRender(<SearchCategoryFilters selectedCategories={[]} onToggle={onToggle} />);

    const categories: SearchCategory[] = ['artist', 'album', 'track', 'playlist', 'genre'];
    categories.forEach((cat) => {
      expect(screen.getByTestId(`category-filter-${cat}`)).toBeInTheDocument();
    });
  });

  it('renders only the locked category when provided', () => {
    customRender(
      <SearchCategoryFilters
        selectedCategories={['artist']}
        onToggle={onToggle}
        lockedCategory="artist"
      />,
    );

    expect(screen.getByTestId('category-filter-artist')).toBeInTheDocument();
    expect(screen.queryByTestId('category-filter-album')).not.toBeInTheDocument();
    expect(screen.queryByTestId('category-filter-track')).not.toBeInTheDocument();
  });

  it('highlights selected categories', () => {
    customRender(
      <SearchCategoryFilters selectedCategories={['artist', 'track']} onToggle={onToggle} />,
    );

    const artistButton = screen.getByTestId('category-filter-artist');
    const trackButton = screen.getByTestId('category-filter-track');
    const albumButton = screen.getByTestId('category-filter-album');

    // Check for variant-related classes or just text content if variant is hard to check directly
    // Usually buttons with 'secondary' variant have different classes than 'outline'
    expect(artistButton.className).toMatch(/bg-secondary/);
    expect(trackButton.className).toMatch(/bg-secondary/);
    expect(albumButton.className).toMatch(/bg-background/);
  });

  it('calls onToggle when a category is clicked', () => {
    customRender(<SearchCategoryFilters selectedCategories={[]} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('category-filter-album'));

    expect(onToggle).toHaveBeenCalledWith('album');
  });

  it('disables buttons when category is locked', () => {
    customRender(
      <SearchCategoryFilters
        selectedCategories={['artist']}
        onToggle={onToggle}
        lockedCategory="artist"
      />,
    );

    const artistButton = screen.getByTestId('category-filter-artist');
    expect(artistButton).toBeDisabled();

    fireEvent.click(artistButton);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('applies custom className to the container', () => {
    customRender(
      <SearchCategoryFilters
        selectedCategories={[]}
        onToggle={onToggle}
        className="my-custom-class"
      />,
    );

    const container = screen.getByTestId('search-category-filters');
    expect(container.className).toMatch(/my-custom-class/);
  });

  it('calls onToggle when an already selected category is clicked (deselection)', () => {
    customRender(<SearchCategoryFilters selectedCategories={['album']} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('category-filter-album'));

    expect(onToggle).toHaveBeenCalledWith('album');
  });

  it('displays pluralized category names', () => {
    customRender(<SearchCategoryFilters selectedCategories={[]} onToggle={onToggle} />);

    expect(screen.getByText('artists')).toBeInTheDocument();
    expect(screen.getByText('albums')).toBeInTheDocument();
    expect(screen.getByText('tracks')).toBeInTheDocument();
    expect(screen.getByText('playlists')).toBeInTheDocument();
    expect(screen.getByText('genres')).toBeInTheDocument();
  });

  it('renders locked category with secondary variant', () => {
    customRender(
      <SearchCategoryFilters
        selectedCategories={['track']}
        onToggle={onToggle}
        lockedCategory="track"
      />,
    );

    const trackButton = screen.getByTestId('category-filter-track');
    // Locked category with matching selectedCategories should show secondary variant
    expect(trackButton.className).toMatch(/bg-secondary/);
  });
});
