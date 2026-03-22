import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CoverSelectionBanner } from './CoverSelectionBanner';

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

function getOnSelectCover() {
  return vi.fn();
}

describe('CoverSelectionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('copy', () => {
    it('renders when album has no cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(screen.getByText('Cover art detected')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Cover art found in 2 tracks. Would you like to use it as the album cover\?/,
        ),
      ).toBeInTheDocument();
    });

    it('renders replace copy when album has cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(
          /Cover art found in 2 tracks. Would you like to replace the current album cover\?/,
        ),
      ).toBeInTheDocument();
    });

    it('uses singular replace message for one track when album has cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(
          /Cover art found in 1 track. Would you like to replace the current album cover\?/,
        ),
      ).toBeInTheDocument();
    });

    it('uses singular message for one track when album has no cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(
          /Cover art found in 1 track. Would you like to use it as the album cover\?/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it("calls onSelectCover with null when Don't use is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId="track-1"
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(screen.getByRole('button', { name: "Don't use" }));

      expect(onSelectCover).toHaveBeenCalledWith(null);
    });

    it('calls onSelectCover with trackId when a track cover is clicked', async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'track1.mp3' }));
      expect(onSelectCover).toHaveBeenCalledWith('track-1');

      await user.click(screen.getByRole('button', { name: 'track2.mp3' }));
      expect(onSelectCover).toHaveBeenCalledWith('track-2');
    });
  });
});
