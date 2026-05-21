import { customRender } from '@repo/testing/web';
import { describe, expect, it } from 'vitest';
import { AlbumFavoriteStarGlyph } from './AlbumFavoriteStarGlyph';

describe('AlbumFavoriteStarGlyph', () => {
  it('renders regular outline star when allInFavorites is false', () => {
    const { container } = customRender(<AlbumFavoriteStarGlyph allInFavorites={false} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Default size is 24
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    // Outline star check (regular weight is default, not fill)
    expect(svg).not.toHaveClass('text-emerald-400');
  });

  it('renders outline star with menuSize is true', () => {
    const { container } = customRender(
      <AlbumFavoriteStarGlyph allInFavorites={false} menuSize={true} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    // Menu size is 16
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('renders filled star with diagonal slash when allInFavorites is true', () => {
    const { container } = customRender(<AlbumFavoriteStarGlyph allInFavorites={true} />);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveStyle({ width: '24px', height: '24px' });

    const svg = span?.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveClass('text-emerald-400');

    // Slash element
    const slash = span?.querySelector('span');
    expect(slash).toBeInTheDocument();
    expect(slash).toHaveClass('rotate-45');
  });

  it('renders filled star with menuSize is true when allInFavorites is true', () => {
    const { container } = customRender(
      <AlbumFavoriteStarGlyph allInFavorites={true} menuSize={true} />,
    );
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span).toHaveStyle({ width: '16px', height: '16px' });

    const svg = span?.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '16');
  });
});
