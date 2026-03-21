import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkTrackActions } from './BulkTrackActions';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe('BulkTrackActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders Cancel link and Upload button', () => {
      render(<BulkTrackActions tracksCount={1} isLoading={false} hasInvalidTracks={false} />);

      expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '..');
      expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeInTheDocument();
    });

    it('shows singular label for one track', () => {
      render(<BulkTrackActions tracksCount={1} isLoading={false} hasInvalidTracks={false} />);

      expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeInTheDocument();
    });

    it('shows plural label for multiple tracks', () => {
      render(<BulkTrackActions tracksCount={3} isLoading={false} hasInvalidTracks={false} />);

      expect(screen.getByRole('button', { name: /Upload 3 tracks/i })).toBeInTheDocument();
    });

    it('shows Uploading when isLoading', () => {
      render(<BulkTrackActions tracksCount={1} isLoading hasInvalidTracks={false} />);

      expect(screen.getByRole('button', { name: /Uploading/i })).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables submit when hasInvalidTracks', () => {
      render(<BulkTrackActions tracksCount={1} isLoading={false} hasInvalidTracks />);

      expect(screen.getByRole('button', { name: /Upload 1 track/i })).toBeDisabled();
    });

    it('disables submit when isLoading', () => {
      render(<BulkTrackActions tracksCount={1} isLoading hasInvalidTracks={false} />);

      expect(screen.getByRole('button', { name: /Uploading/i })).toBeDisabled();
    });

    it('disables submit when tracksCount is 0', () => {
      render(<BulkTrackActions tracksCount={0} isLoading={false} hasInvalidTracks={false} />);

      expect(screen.getByRole('button', { name: /Upload 0 tracks/i })).toBeDisabled();
    });
  });
});
