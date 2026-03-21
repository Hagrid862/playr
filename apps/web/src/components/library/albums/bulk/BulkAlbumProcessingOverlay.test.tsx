import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BulkAlbumProcessingOverlay } from './BulkAlbumProcessingOverlay';

describe('BulkAlbumProcessingOverlay', () => {
  describe('rendering', () => {
    it('renders message and helper text', () => {
      render(<BulkAlbumProcessingOverlay message="Scanning metadata..." />);

      expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
      expect(
        screen.getByText('Extracting metadata and cover art from your files...'),
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('exposes live region with busy state', () => {
      render(<BulkAlbumProcessingOverlay message="Processing..." />);

      const overlay = document.querySelector('[aria-live="polite"][aria-busy="true"]');
      expect(overlay).toBeInTheDocument();
    });
  });
});
