import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoverArtGroup } from '@/lib/types/library';
import { describe, expect, it, vi } from 'vitest';
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
    coverFile: new File(['y'], 'cover2.jpg', { type: 'image/jpeg' }),
    previewUrl: 'blob:url2',
  },
];

function getOnSelectCover() {
  return vi.fn();
}

describe('CoverSelectionBanner', () => {
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
        screen.getByText(/Cover art found in 2 tracks\. Use one of these as the album cover\?/),
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
          /Cover art found in 2 tracks\. Replace the current album cover with one of these/,
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
          /Cover art found in 1 track\. Replace the current album cover with one of these/,
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
        screen.getByText(/Cover art found in 1 track\. Use one of these as the album cover\?/),
      ).toBeInTheDocument();
    });

    it('shows unique image count when coverGroups deduplicates', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1', 'track-2'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3', 'track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(/Cover art found in 2 tracks \(1 unique image\)\./),
      ).toBeInTheDocument();
    });

    it('shows plural unique images when multiple distinct covers remain', () => {
      const onSelectCover = getOnSelectCover();
      const thirdTrack = {
        trackId: 'track-3',
        trackName: 'track3.mp3',
        coverFile: new File(['z'], 'cover3.jpg', { type: 'image/jpeg' }),
        previewUrl: 'blob:url3',
      };
      const tracksWithCovers = [...defaultTracksWithCovers, thirdTrack];
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3'],
        },
        {
          digest: 'b',
          representativeTrackId: 'track-2',
          trackIds: ['track-2'],
          previewUrl: 'blob:url2',
          trackFileNames: ['track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={tracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(/Cover art found in 3 tracks \(2 unique images\)\./),
      ).toBeInTheDocument();
    });

    it('uses singular track wording when one file row reports multiple cover groups', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'g1',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3'],
        },
        {
          digest: 'g2',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url2',
          trackFileNames: ['track1.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(/Cover art found in 1 track \(2 unique images\)\./),
      ).toBeInTheDocument();
    });

    it('shows helper subtitle for keeping custom image when album already has cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          albumHasCover
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );
      expect(screen.getByText('Custom image — not from these tracks')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it("calls onSelectCover with null when Don't use embedded is clicked", async () => {
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

      await user.click(screen.getByRole('button', { name: /Don't use embedded/i }));

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

    it('calls onSelectCover with representative id when a deduplicated group is clicked', async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1', 'track-2'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3', 'track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(screen.getByRole('button', { name: '2 tracks' }));
      expect(onSelectCover).toHaveBeenCalledWith('track-1');
    });

    it('marks deduplicated group as selected when a non-representative track id is active', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1', 'track-2'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3', 'track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId="track-2"
          onSelectCover={onSelectCover}
        />,
      );

      expect(screen.getByRole('button', { name: '2 tracks' }).className).toContain(
        'border-primary',
      );
    });

    it('marks group selected when selection matches representative but not trackIds membership', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'edge',
          representativeTrackId: 'track-1',
          trackIds: ['track-2'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId="track-1"
          onSelectCover={onSelectCover}
        />,
      );

      expect(screen.getByRole('button', { name: 'track2.mp3' }).className).toContain(
        'border-primary',
      );
    });

    it('uses Track fallback label when group has no file names', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'noname',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url1',
          trackFileNames: [],
        },
      ];
      customRender(
        <CoverSelectionBanner
          albumHasCover={false}
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(screen.getByRole('button', { name: 'Track' })).toBeInTheDocument();
    });
  });

  describe('prominent variant', () => {
    it('renders minimal copy and vertical image options', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(screen.getByText('From your files')).toBeInTheDocument();
      expect(screen.queryByText('Cover art detected')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Use embedded cover from track1.mp3' }),
      ).toBeInTheDocument();
    });

    it("calls onSelectCover with null when Don't use embedded tile is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          selectedCoverTrackId="track-1"
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(screen.getByRole('button', { name: /Don't use embedded/i }));
      expect(onSelectCover).toHaveBeenCalledWith(null);
    });

    it('selects representative when a deduplicated prominent option is clicked', async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1', 'track-2'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3', 'track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /Use embedded cover shared by 2 files/i }),
      );
      expect(onSelectCover).toHaveBeenCalledWith('track-1');
    });

    it('maps per-track covers when no coverGroups are provided (multi-track)', async () => {
      const user = userEvent.setup();
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Use embedded cover from track1.mp3' }));
      expect(onSelectCover).toHaveBeenCalledWith('track-1');
    });

    it('uses track fallback in aria-label when single-file group has no file names', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'empty-names',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url1',
          trackFileNames: [],
        },
      ];
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={[defaultTracksWithCovers[0]]}
          coverGroups={coverGroups}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByRole('button', { name: /Use embedded cover from track$/i }),
      ).toBeInTheDocument();
    });

    it('shows custom-image guidance and labels when album already has cover', () => {
      const onSelectCover = getOnSelectCover();
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover
          tracksWithCovers={defaultTracksWithCovers}
          selectedCoverTrackId={null}
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByText(/Your custom image stays until you tap an embedded image below/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: /Don't use embedded — keeps your custom image/i,
        }),
      ).toBeInTheDocument();
      expect(screen.getByText('Custom image')).toBeInTheDocument();
    });

    it('highlights selected embedded tile and leaves others unselected in prominent variant', () => {
      const onSelectCover = getOnSelectCover();
      const coverGroups: CoverArtGroup[] = [
        {
          digest: 'a',
          representativeTrackId: 'track-1',
          trackIds: ['track-1'],
          previewUrl: 'blob:url1',
          trackFileNames: ['track1.mp3'],
        },
        {
          digest: 'b',
          representativeTrackId: 'track-2',
          trackIds: ['track-2'],
          previewUrl: 'blob:url2',
          trackFileNames: ['track2.mp3'],
        },
      ];
      customRender(
        <CoverSelectionBanner
          variant="prominent"
          albumHasCover={false}
          tracksWithCovers={defaultTracksWithCovers}
          coverGroups={coverGroups}
          selectedCoverTrackId="track-2"
          onSelectCover={onSelectCover}
        />,
      );

      expect(
        screen.getByRole('button', { name: /Use embedded cover from track2\.mp3/i }).className,
      ).toContain('border-primary');
      expect(
        screen.getByRole('button', { name: /Use embedded cover from track1\.mp3/i }).className,
      ).toContain('border-transparent');
    });
  });
});
