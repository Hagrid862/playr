import { AlbumType } from '@repo/db';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EditAlbumMetadata } from './EditAlbumMetadata';

vi.mock('../create/LibraryAlbumArtistPicker', () => ({
  LibraryAlbumArtistPicker: ({
    label,
    nonePlaceholder,
  }: {
    label?: string;
    nonePlaceholder?: string;
  }) => (
    <div>
      <span data-testid="album-artist-picker-label">{label ?? 'Artists'}</span>
      <span data-testid="album-artist-none-placeholder">{nonePlaceholder}</span>
    </div>
  ),
}));

vi.mock('../create/LibraryAlbumGenrePicker', () => ({
  LibraryAlbumGenrePicker: () => <div>Genre picker</div>,
}));

vi.mock('@/components/form', () => ({
  SelectField: ({
    label,
    value,
    options,
    onChange,
    onBlur,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
          {options.map((opt: { value: string; label: string }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  ),
  DatePickerField: ({
    label,
    onChange,
    onBlur,
  }: {
    label: string;
    onChange: (v: Date | null) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>
        {label}
        <button onClick={() => onChange(new Date('2022-01-01'))} onBlur={onBlur}>
          Mock Date Picker
        </button>
        <button onClick={() => onChange(null)}>Clear Date</button>
      </label>
    </div>
  ),
}));

describe('EditAlbumMetadata', () => {
  const mockForm = {
    Field: ({
      children,
      name,
    }: {
      children: (field: {
        state: { value: string | string[] | null };
        handleChange: (v: string | Date | null) => void;
        handleBlur: () => void;
      }) => React.ReactNode;
      name: string;
    }) => {
      if (name === 'genreIds' || name === 'artistIds') {
        return children({
          state: { value: [] },
          handleChange: vi.fn(),
          handleBlur: vi.fn(),
        });
      }
      const value = name === 'type' ? AlbumType.album : null;
      return children({
        state: { value },
        handleChange: vi.fn(),
        handleBlur: vi.fn(),
      });
    },
  };

  it('renders correctly', () => {
    customRender(
      <EditAlbumMetadata
        form={mockForm}
        artists={[]}
        pendingArtists={[]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Album Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Release Date/i)).toBeInTheDocument();
    expect(screen.getByTestId('album-artist-none-placeholder')).toHaveTextContent(
      'No artists or create new',
    );
    expect(screen.getByText('Genre picker')).toBeInTheDocument();
  });

  it('handles type change', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: string | string[] | null };
          handleChange: (v: string | Date | null) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'genreIds' || name === 'artistIds') {
          return children({
            state: { value: [] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        if (name === 'type') {
          return children({
            state: { value: AlbumType.album },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    customRender(
      <EditAlbumMetadata
        form={localMockForm}
        artists={[]}
        pendingArtists={[]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );
    const select = screen.getByLabelText(/Album Type/i);
    await user.selectOptions(select, AlbumType.single);
    expect(handleChange).toHaveBeenCalledWith(AlbumType.single);
  });

  it('ignores type change for invalid values', async () => {
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: string | string[] | null };
          handleChange: (v: string | Date | null) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'genreIds' || name === 'artistIds') {
          return children({
            state: { value: [] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        if (name === 'type') {
          return children({
            state: { value: AlbumType.album },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    customRender(
      <EditAlbumMetadata
        form={localMockForm}
        artists={[]}
        pendingArtists={[]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );
    const select = screen.getByLabelText(/Album Type/i) as HTMLSelectElement;

    // Force a change event with invalid value directly since user.selectOptions only works with existing options
    fireEvent.change(select, { target: { value: 'invalid_type' } });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles clearing the release date', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: string | string[] | null };
          handleChange: (v: string | Date | null) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'genreIds' || name === 'artistIds') {
          return children({
            state: { value: [] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        if (name === 'releaseDate') {
          return children({
            state: { value: new Date().toISOString() },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        if (name === 'type') {
          return children({
            state: { value: AlbumType.album },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    customRender(
      <EditAlbumMetadata
        form={localMockForm}
        artists={[]}
        pendingArtists={[]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Clear Date'));
    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('sorts artist chips with pending drafts before library ids and removes on chip click', async () => {
    const user = userEvent.setup();
    const onRemoveArtistId = vi.fn();
    const localPending = 'local:pending:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const libId = 'artist-lib-1';
    const orphanId = 'not-in-lists';

    const formWithArtists = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: string | string[] | null };
          handleChange: (v: string | Date | null) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'artistIds') {
          return children({
            state: { value: [localPending, libId, orphanId] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        if (name === 'genreIds') {
          return children({
            state: { value: [] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        const value = name === 'type' ? AlbumType.album : null;
        return children({
          state: { value },
          handleChange: vi.fn(),
          handleBlur: vi.fn(),
        });
      },
    };

    customRender(
      <EditAlbumMetadata
        form={formWithArtists}
        artists={[{ id: libId, name: 'Library Artist' }]}
        pendingArtists={[{ id: localPending, name: 'Draft Face' }]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={onRemoveArtistId}
      />,
    );

    const chips = screen.getAllByRole('button', { name: /^remove /i });
    expect(chips.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remove Draft Face (new)',
      'Remove Library Artist',
      'Remove not-in-lists',
    ]);

    const pendingChip = screen.getByRole('button', { name: /remove draft face \(new\)/i });
    expect(pendingChip.className).toMatch(/emerald/);

    await user.click(screen.getByRole('button', { name: /remove library artist/i }));
    expect(onRemoveArtistId).toHaveBeenCalledWith(libId);
  });

  it('covers artist chip sort when a library id precedes a pending id in field order', () => {
    const localPending = 'local:pending:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const libId = 'artist-lib-2';

    const formTwo = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: string | string[] | null };
          handleChange: (v: string | Date | null) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'artistIds') {
          return children({
            state: { value: [libId, localPending] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        if (name === 'genreIds') {
          return children({
            state: { value: [] },
            handleChange: vi.fn(),
            handleBlur: vi.fn(),
          });
        }
        const value = name === 'type' ? AlbumType.album : null;
        return children({
          state: { value },
          handleChange: vi.fn(),
          handleBlur: vi.fn(),
        });
      },
    };

    customRender(
      <EditAlbumMetadata
        form={formTwo}
        artists={[{ id: libId, name: 'Lib Two' }]}
        pendingArtists={[{ id: localPending, name: 'Pending Two' }]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /remove pending two \(new\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove lib two/i })).toBeInTheDocument();
  });

  it('uses the shorter no-artists placeholder when the library lists artists', () => {
    customRender(
      <EditAlbumMetadata
        form={mockForm}
        artists={[{ id: 'a', name: 'Alpha' }]}
        pendingArtists={[]}
        isLoadingArtists={false}
        genres={[]}
        pendingGenres={[]}
        isLoadingGenres={false}
        onGenreSelect={vi.fn()}
        onArtistSelect={vi.fn()}
        onRemoveArtistId={vi.fn()}
      />,
    );
    expect(screen.getByTestId('album-artist-none-placeholder')).toHaveTextContent('No artists');
  });
});
