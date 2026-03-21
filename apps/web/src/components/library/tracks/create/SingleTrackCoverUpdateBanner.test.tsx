import { customRender } from '@repo/testing';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useMeasure from 'react-use-measure';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleTrackCoverUpdateBanner } from './SingleTrackCoverUpdateBanner';

vi.mock('react-use-measure', () => ({
  default: vi.fn(() => [vi.fn(), { height: 100 }]),
}));

describe('SingleTrackCoverUpdateBanner', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders New artwork detected and cover options', () => {
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('New artwork detected')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This file contains embedded artwork. Would you like to update the album to use it\?/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders properly when height is 0 and currentAlbumCoverUrl is valid', () => {
    vi.mocked(useMeasure).mockReturnValueOnce([
      vi.fn(),
      { height: 0, width: 0, x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0 },
      vi.fn(), // forceRefresh - 3rd element
    ] as ReturnType<typeof useMeasure>);
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl="http://example.com/cover.jpg"
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );
    expect(screen.getByAltText('Current album cover')).toHaveAttribute(
      'src',
      'http://example.com/cover.jpg',
    );
    expect(screen.getByText('New artwork detected')).toBeInTheDocument();
  });

  it('calls onSelect(true) when New cover is clicked', async () => {
    const user = userEvent.setup();
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[2]);

    expect(mockOnSelect).toHaveBeenCalledWith(true);
  });

  it('calls onSelect(false) when Current cover is clicked', async () => {
    const user = userEvent.setup();
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );

    const currentSection = screen.getByText('Current').closest('div');
    const currentButton = currentSection?.querySelector('button');
    if (currentButton) {
      await user.click(currentButton as HTMLButtonElement);
    }

    expect(mockOnSelect).toHaveBeenCalledWith(false);
  });

  it('minimizes when caret up is clicked', async () => {
    const user = userEvent.setup();
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    const minimizeButton = buttons[0];
    await user.click(minimizeButton);

    expect(screen.getByText('Artwork selection:')).toBeInTheDocument();
    expect(screen.getByText('Keeping current')).toBeInTheDocument();
  });

  it('shows Using from file when minimized and useTrackCover is true', async () => {
    const user = userEvent.setup();
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);

    expect(screen.getByText('Using from file')).toBeInTheDocument();
  });

  it('expands when minimized bar is clicked', async () => {
    const user = userEvent.setup();
    customRender(
      <SingleTrackCoverUpdateBanner
        currentAlbumCoverUrl={null}
        trackCoverPreviewUrl="blob:track-cover"
        useTrackCover={false}
        onSelect={mockOnSelect}
      />,
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(screen.getByText('Keeping current')).toBeInTheDocument();

    await user.click(screen.getByText('Expand'));
    expect(screen.getByText('New artwork detected')).toBeInTheDocument();
  });
});
