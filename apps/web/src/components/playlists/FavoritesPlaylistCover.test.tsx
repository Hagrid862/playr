import { customRender } from '@repo/testing/web';
import { describe, expect, it } from 'vitest';
import { FavoritesPlaylistCover } from './FavoritesPlaylistCover';

describe('FavoritesPlaylistCover', () => {
  it('renders a filled star icon with correct gradient styles', () => {
    const { container } = customRender(<FavoritesPlaylistCover />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass(
      'bg-gradient-to-br',
      'from-emerald-600/90',
      'via-teal-700/90',
      'to-stone-900',
    );

    const starIcon = container.querySelector('svg');
    expect(starIcon).toBeInTheDocument();
    expect(starIcon).toHaveClass('size-2/5', 'text-white', 'drop-shadow-md');
  });
});
