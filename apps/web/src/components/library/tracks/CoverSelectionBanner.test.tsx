import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CoverSelectionBanner } from './CoverSelectionBanner';

describe('CoverSelectionBanner', () => {
  const mockOnSelectCover = vi.fn();

  const defaultTracksWithCovers = [
    {
      trackId: 'track-1',
      trackName: 'track1.mp3',
      coverFile: new File(['x'], 'cover.jpg', { type: 'image/jpeg' }),
      previewUrl: 'blob:url1',
    },
    {
      trackId: 'track-2',
      trackName: 'track2.mp3',
      coverFile: new File(['x'], 'cover2.jpg', { type: 'image/jpeg' }),
      previewUrl: 'blob:url2',
    },
  ];

  beforeEach(() => {
    mockOnSelectCover.mockClear();
  });

  it('renders when album has no cover', () => {
    render(
      <CoverSelectionBanner
        albumHasCover={false}
        tracksWithCovers={defaultTracksWithCovers}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    expect(screen.getByText('Cover art detected')).toBeInTheDocument();
    expect(
      screen.getByText(/Cover art found in 2 tracks. Would you like to use it as the album cover\?/),
    ).toBeInTheDocument();
  });

  it('renders when album has cover', () => {
    render(
      <CoverSelectionBanner
        albumHasCover={true}
        tracksWithCovers={defaultTracksWithCovers}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    expect(
      screen.getByText(/Cover art found in 2 tracks. Would you like to replace the current album cover\?/),
    ).toBeInTheDocument();
  });

  it('renders singular replace message when album has cover and one track', () => {
    render(
      <CoverSelectionBanner
        albumHasCover={true}
        tracksWithCovers={[defaultTracksWithCovers[0]]}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    expect(
      screen.getByText(/Cover art found in 1 track. Would you like to replace the current album cover\?/),
    ).toBeInTheDocument();
  });

  it('calls onSelectCover with null when Don\'t use is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CoverSelectionBanner
        albumHasCover={false}
        tracksWithCovers={defaultTracksWithCovers}
        selectedCoverTrackId="track-1"
        onSelectCover={mockOnSelectCover}
      />,
    );

    await user.click(screen.getByRole('button', { name: "Don't use" }));

    expect(mockOnSelectCover).toHaveBeenCalledWith(null);
  });

  it('calls onSelectCover with trackId when track cover is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CoverSelectionBanner
        albumHasCover={false}
        tracksWithCovers={defaultTracksWithCovers}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'track1.mp3' }));

    expect(mockOnSelectCover).toHaveBeenCalledWith('track-1');
  });

  it('calls onSelectCover with trackId when second track cover is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CoverSelectionBanner
        albumHasCover={false}
        tracksWithCovers={defaultTracksWithCovers}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'track2.mp3' }));

    expect(mockOnSelectCover).toHaveBeenCalledWith('track-2');
  });

  it('renders singular message when one track has cover', () => {
    render(
      <CoverSelectionBanner
        albumHasCover={false}
        tracksWithCovers={[defaultTracksWithCovers[0]]}
        selectedCoverTrackId={null}
        onSelectCover={mockOnSelectCover}
      />,
    );

    expect(
      screen.getByText(/Cover art found in 1 track. Would you like to use it as the album cover\?/),
    ).toBeInTheDocument();
  });
});
