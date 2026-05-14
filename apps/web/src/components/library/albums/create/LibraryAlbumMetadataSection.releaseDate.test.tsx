import { LibraryAlbumMetadataSection } from '@/components/library/albums/create/LibraryAlbumMetadataSection';
import type { LibraryAlbumFromFilesFormData } from '@/components/library/albums/create/useLibraryAlbumFromFilesForm';
import { TooltipProvider } from '@/components/ui/tooltip';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
    selected,
  }: {
    onSelect?: (date: Date | undefined) => void;
    selected?: Date;
  }) => (
    <div>
      <button
        type="button"
        aria-label="Pick January 10"
        onClick={() => onSelect?.(new Date(2020, 0, 10))}
      >
        day
      </button>
      <button type="button" aria-label="Clear selected date" onClick={() => onSelect?.(undefined)}>
        clear
      </button>
      <span data-testid="calendar-selected">{selected ? 'has' : 'none'}</span>
    </div>
  ),
}));

const baseForm: LibraryAlbumFromFilesFormData = {
  name: 'Test album',
  description: '',
  type: 'album',
  artistIds: ['a1'],
  genreIds: [],
  /** Null so the trigger shows “Pick a date” (formatted dates change the accessible name). */
  releaseDate: null,
};

describe('LibraryAlbumMetadataSection (release date branch)', () => {
  const onUpdate = vi.fn();
  const onArtistSelectionChange = vi.fn();
  const onRemoveArtistId = vi.fn();
  const onManualCoverFile = vi.fn();
  const onRemoveCover = vi.fn();
  const onGenreSelectionChange = vi.fn();
  const onRemoveGenreId = vi.fn();

  const testGenre = {
    id: 'g1',
    name: 'Rock',
    slug: 'rock',
    description: null,
    kind: 'system' as const,
    libraryId: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const genrePropsFor = () => ({
    genres: [testGenre],
    pendingGenres: [] as { id: string; name: string }[],
    isLoadingGenres: false,
    onGenreSelectionChange,
    onRemoveGenreId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSection(
    overrides: Partial<ComponentProps<typeof LibraryAlbumMetadataSection>> = {},
  ) {
    return customRender(
      <TooltipProvider>
        <LibraryAlbumMetadataSection
          formData={baseForm}
          artists={[{ id: 'a1', name: 'Alpha' }]}
          pendingArtists={[]}
          isLoadingArtists={false}
          coverPreviewUrl={null}
          onUpdate={onUpdate}
          onArtistSelectionChange={onArtistSelectionChange}
          onRemoveArtistId={onRemoveArtistId}
          onManualCoverFile={onManualCoverFile}
          onRemoveCover={onRemoveCover}
          {...genrePropsFor()}
          {...overrides}
        />
      </TooltipProvider>,
    );
  }

  it('maps undefined calendar selection to null releaseDate', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /pick a date/i }));
    await user.click(screen.getByRole('button', { name: /clear selected date/i }));

    expect(onUpdate).toHaveBeenCalledWith('releaseDate', null);
  });
});
