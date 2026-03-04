import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BulkAlbumProcessingOverlay } from './BulkAlbumProcessingOverlay';

describe('BulkAlbumProcessingOverlay', () => {
  it('renders with provided message', () => {
    render(<BulkAlbumProcessingOverlay message="Scanning metadata..." />);

    expect(screen.getByText('Scanning metadata...')).toBeInTheDocument();
    expect(screen.getByText('Extracting metadata and cover art from your files...')).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(<BulkAlbumProcessingOverlay message="Processing..." />);

    const overlay = document.querySelector('[aria-live="polite"][aria-busy="true"]');
    expect(overlay).toBeInTheDocument();
  });
});
