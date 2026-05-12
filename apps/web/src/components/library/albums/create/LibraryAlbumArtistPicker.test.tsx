import { LibraryAlbumArtistPicker } from './LibraryAlbumArtistPicker';
import {
  LIBRARY_ALBUM_ARTIST_CREATE_VALUE,
  LIBRARY_ALBUM_ARTIST_NONE_VALUE,
} from './libraryAlbumArtistConstants';
import { TooltipProvider } from '@/components/ui/tooltip';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

type PickerProps = ComponentProps<typeof LibraryAlbumArtistPicker>;

function renderPicker(
  props: Omit<PickerProps, 'onSelect' | 'isLoading'> &
    Partial<Pick<PickerProps, 'isLoading'>> & { onSelect?: PickerProps['onSelect'] },
) {
  const { onSelect: onSelectProp, isLoading, ...rest } = props;
  const onSelect = onSelectProp ?? vi.fn();
  return customRender(
    <TooltipProvider>
      <LibraryAlbumArtistPicker {...rest} isLoading={isLoading ?? false} onSelect={onSelect} />
    </TooltipProvider>,
  );
}

describe('LibraryAlbumArtistPicker', () => {
  const artists = [
    { id: 'a1', name: 'Alpha' },
    { id: 'b1', name: 'Beta' },
    { id: 'c1', name: 'Gamma' },
  ];

  it('shows +N more in the trigger when more than two artists are selected', async () => {
    const user = userEvent.setup();
    renderPicker({
      selectedArtistIds: ['a1', 'b1', 'c1'],
      artists,
      pendingArtists: [],
    });

    const trigger = screen.getByRole('button', { name: /^artists$/i });
    expect(trigger).toHaveTextContent(/alpha, beta \+1 more/i);
    await user.click(trigger);
    expect(await screen.findByRole('listbox', { name: /artists/i })).toBeInTheDocument();
  });

  it('filters options when the search query is non-empty', async () => {
    const user = userEvent.setup();
    renderPicker({
      selectedArtistIds: [],
      artists,
      pendingArtists: [{ id: 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Zeta (new)' }],
    });

    await user.click(screen.getByRole('button', { name: /^artists$/i }));
    const search = await screen.findByRole('textbox', { name: /search artists/i });
    await user.type(search, 'alp');

    expect(screen.getByRole('option', { name: /^Alpha$/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Beta$/ })).not.toBeInTheDocument();
  });

  it('shows empty-search message when nothing matches the query', async () => {
    const user = userEvent.setup();
    renderPicker({
      selectedArtistIds: [],
      artists,
      pendingArtists: [],
    });

    await user.click(screen.getByRole('button', { name: /^artists$/i }));
    const search = await screen.findByRole('textbox', { name: /search artists/i });
    await user.type(search, 'zzz');

    expect(
      await screen.findByText(/No artists match “zzz”/),
    ).toBeInTheDocument();
  });

  it('closes the popover after choosing No artists', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderPicker({
      selectedArtistIds: ['a1'],
      artists,
      pendingArtists: [],
      onSelect,
    });

    const trigger = screen.getByRole('button', { name: /^artists$/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /^No artists$/ }));

    expect(onSelect).toHaveBeenCalledWith(LIBRARY_ALBUM_ARTIST_NONE_VALUE);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('invokes onSelect for create-new without forcing the popover closed on the sentinel path', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderPicker({
      selectedArtistIds: [],
      artists,
      pendingArtists: [],
      onSelect,
    });

    const trigger = screen.getByRole('button', { name: /^artists$/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: /create new artist/i }));

    expect(onSelect).toHaveBeenCalledWith(LIBRARY_ALBUM_ARTIST_CREATE_VALUE);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
