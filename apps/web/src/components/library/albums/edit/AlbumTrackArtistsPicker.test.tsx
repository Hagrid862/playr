import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumTrackArtistsPicker, applyAlbumArtistToggle, nextAlbumArtistIds } from './AlbumTrackArtistsPicker';

describe('nextAlbumArtistIds', () => {
  it('returns null when turning on an id that is already selected', () => {
    expect(nextAlbumArtistIds(['a1', 'a2'], 'a1', true)).toBeNull();
  });

  it('returns filtered list when turning off', () => {
    expect(nextAlbumArtistIds(['a1', 'a2'], 'a1', false)).toEqual(['a2']);
  });
});

describe('applyAlbumArtistToggle', () => {
  it('does not call onChange when the selection is unchanged', () => {
    const onChange = vi.fn();
    applyAlbumArtistToggle(['a1'], 'a1', true, onChange);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange when the selection changes', () => {
    const onChange = vi.fn();
    applyAlbumArtistToggle([], 'a1', true, onChange);
    expect(onChange).toHaveBeenCalledWith(['a1']);
  });
});

describe('AlbumTrackArtistsPicker', () => {
  const artists = [
    { id: 'a1', label: 'Alpha' },
    { id: 'a2', label: 'Beta' },
  ];
  const onChange = vi.fn();
  const onRequestCreateNew = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles artist selection', async () => {
    const user = userEvent.setup();
    customRender(
      <AlbumTrackArtistsPicker artists={artists} value={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /select artists/i }));
    const checks = screen.getAllByRole('checkbox');
    await user.click(checks[0]!);

    expect(onChange).toHaveBeenCalledWith(['a1']);
  });

  it('shows a plural summary when multiple artists are selected', () => {
    customRender(
      <AlbumTrackArtistsPicker artists={artists} value={['a1', 'a2']} onChange={onChange} />,
    );

    expect(screen.getByRole('button', { name: /2 artists/i })).toBeInTheDocument();
  });

  it('removes an artist when unchecked', async () => {
    const user = userEvent.setup();
    customRender(
      <AlbumTrackArtistsPicker artists={artists} value={['a1']} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /1 artist/i }));
    const checks = screen.getAllByRole('checkbox');
    await user.click(checks[0]!);

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('calls onRequestCreateNew from create row', async () => {
    const user = userEvent.setup();
    customRender(
      <AlbumTrackArtistsPicker
        artists={artists}
        value={[]}
        onChange={onChange}
        allowCreateNew
        onRequestCreateNew={onRequestCreateNew}
      />,
    );

    await user.click(screen.getByRole('button', { name: /select artists/i }));
    await user.click(screen.getByRole('button', { name: /create new artist/i }));

    expect(onRequestCreateNew).toHaveBeenCalled();
  });

  it('shows empty-state copy when no artists and create is disabled', () => {
    customRender(<AlbumTrackArtistsPicker artists={[]} value={[]} onChange={onChange} />);

    expect(screen.getByText(/no library artists loaded yet/i)).toBeInTheDocument();
  });

  it('renders validation error', () => {
    customRender(
      <AlbumTrackArtistsPicker
        artists={artists}
        value={[]}
        onChange={onChange}
        error="Pick at least one"
      />,
    );

    expect(screen.getByText('Pick at least one')).toBeInTheDocument();
  });
});
