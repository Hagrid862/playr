import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LibraryAlbumFromFilesProcessingOverlay } from './LibraryAlbumFromFilesProcessingOverlay';

describe('LibraryAlbumFromFilesProcessingOverlay', () => {
  describe('rendering', () => {
    it('renders message and helper text', () => {
      customRender(<LibraryAlbumFromFilesProcessingOverlay message="Scanning metadata..." />);

      expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
      expect(
        screen.getByText('Extracting metadata and cover art from your files...'),
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('exposes live region with busy state', () => {
      customRender(<LibraryAlbumFromFilesProcessingOverlay message="Processing..." />);

      const overlay = document.querySelector('[aria-live="polite"][aria-busy="true"]');
      expect(overlay).toBeInTheDocument();
    });
  });
});
