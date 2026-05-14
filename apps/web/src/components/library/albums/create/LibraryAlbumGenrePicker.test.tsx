import { LibraryAlbumGenrePicker } from '@/components/library/albums/create/LibraryAlbumGenrePicker';
import {
  LIBRARY_ALBUM_GENRE_CREATE_VALUE,
  LIBRARY_ALBUM_GENRE_NONE_VALUE,
} from '@/components/library/albums/create/libraryAlbumGenreConstants';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const base = {
  description: null as string | null,
  libraryId: null as string | null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null as Date | null,
};

const systemRock = {
  ...base,
  id: 'sys-rock',
  name: 'Rock',
  slug: 'rock',
  kind: 'system' as const,
};

const systemJazz = {
  ...base,
  id: 'sys-jazz',
  name: 'Jazz',
  slug: 'jazz',
  kind: 'system' as const,
};

const customTag = {
  ...base,
  id: 'cust-1',
  name: 'My Tag',
  slug: 'my-tag',
  kind: 'custom' as const,
};

describe('LibraryAlbumGenrePicker', () => {
  it('shows placeholder when nothing is selected', () => {
    const onSelect = vi.fn();
    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={[]}
        genres={[systemRock]}
        pendingGenres={[]}
        isLoading={false}
        nonePlaceholder="Pick genres"
        onSelect={onSelect}
      />,
    );

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toHaveTextContent(
      /Pick genres/i,
    );
  });

  it('shows loading text while genres load', () => {
    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={[]}
        genres={[]}
        pendingGenres={[]}
        isLoading
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toHaveTextContent(
      /loading/i,
    );
  });

  it('summarizes two selected genres in the trigger', () => {
    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={['sys-rock', 'sys-jazz']}
        genres={[systemRock, systemJazz]}
        pendingGenres={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    const trigger = screen.getByRole('button', { name: /genres \(optional\)/i });
    expect(trigger).toHaveTextContent('Rock, Jazz');
  });

  it('summarizes three or more genres with a +N more suffix', () => {
    const blues = {
      ...base,
      id: 'sys-blues',
      name: 'Blues',
      slug: 'blues',
      kind: 'system' as const,
    };
    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={['sys-rock', 'sys-jazz', 'sys-blues']}
        genres={[systemRock, systemJazz, blues]}
        pendingGenres={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toHaveTextContent(
      /\+1 more/,
    );
  });

  it('falls back to placeholder when selected ids cannot be resolved', () => {
    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={['missing-id']}
        genres={[systemRock]}
        pendingGenres={[]}
        isLoading={false}
        nonePlaceholder="None"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /genres \(optional\)/i })).toHaveTextContent(/None/i);
  });

  it('shows no-match copy when search filters everything out', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={[]}
        genres={[systemRock]}
        pendingGenres={[]}
        isLoading={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.type(screen.getByLabelText(/search genres/i), 'zzznomatch');

    expect(screen.getByText(/no genres match/i)).toBeInTheDocument();
  });

  it('invokes onSelect for create, none, and a library genre', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={[]}
        genres={[systemRock, customTag]}
        pendingGenres={[{ id: 'pend-1', name: 'Fresh' }]}
        isLoading={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));

    await user.click(screen.getByRole('option', { name: /create new genre/i }));
    expect(onSelect).toHaveBeenLastCalledWith(LIBRARY_ALBUM_GENRE_CREATE_VALUE);

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(screen.getByRole('option', { name: /^no genres$/i }));
    expect(onSelect).toHaveBeenLastCalledWith(LIBRARY_ALBUM_GENRE_NONE_VALUE);

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));
    await user.click(screen.getByRole('option', { name: /^Rock$/i }));
    expect(onSelect).toHaveBeenLastCalledWith('sys-rock');
  });

  it('lists both system and custom sections when both match search', async () => {
    const user = userEvent.setup();

    customRender(
      <LibraryAlbumGenrePicker
        selectedGenreIds={[]}
        genres={[systemRock, customTag]}
        pendingGenres={[]}
        isLoading={false}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /genres \(optional\)/i }));

    expect(screen.getByText('System genres')).toBeInTheDocument();
    expect(screen.getByText('Custom genres')).toBeInTheDocument();
  });
});
