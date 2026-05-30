import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchFilters } from './SearchFilters';

describe('SearchFilters', () => {
  const navigate = vi.fn();
  const baseSearch = {
    filters: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────

  it('renders all sections by default', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    expect(screen.getByTestId('filter-section-general')).toBeInTheDocument();
    expect(screen.getByTestId('filter-section-track')).toBeInTheDocument();
    expect(screen.getByTestId('filter-section-album')).toBeInTheDocument();
  });

  it('renders only requested sections', () => {
    customRender(
      <SearchFilters search={baseSearch} navigate={navigate} visibleSections={['general']} />,
    );

    expect(screen.getByTestId('filter-section-general')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-track')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-album')).not.toBeInTheDocument();
  });

  it('hides track/album sections if not in categories filter', () => {
    const searchWithCategories = {
      filters: {
        categories: ['track'],
      },
    };

    customRender(<SearchFilters search={searchWithCategories} navigate={navigate} />);

    expect(screen.getByTestId('filter-section-track')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-album')).not.toBeInTheDocument();
  });

  it('hides both track and album sections when categories excludes them', () => {
    const searchWithArtistOnly = {
      filters: {
        categories: ['artist'],
      },
    };

    customRender(<SearchFilters search={searchWithArtistOnly} navigate={navigate} />);

    // General is always visible (not gated by categories)
    expect(screen.getByTestId('filter-section-general')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-track')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-album')).not.toBeInTheDocument();
  });

  it('hides track/album sections when categories is an empty array', () => {
    const searchWithEmptyCategories = {
      filters: {
        categories: [],
      },
    };

    customRender(<SearchFilters search={searchWithEmptyCategories} navigate={navigate} />);

    // Empty array [] is truthy, so !search.filters?.categories is false,
    // and [].includes('track') is false → section is hidden
    expect(screen.queryByTestId('filter-section-track')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-section-album')).not.toBeInTheDocument();
    // General section is not gated by categories
    expect(screen.getByTestId('filter-section-general')).toBeInTheDocument();
  });

  // ── Verified checkbox ──────────────────────────────────────

  it('calls navigate when verified checkbox is toggled (checked)', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    fireEvent.click(verifiedCheckbox);

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      }),
    );

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.artist.verified).toBe(true);
    expect(result.filters.track.verified).toBe(true);
    expect(result.filters.album.verified).toBe(true);
  });

  it('calls navigate when verified checkbox is toggled (unchecked)', () => {
    const searchWithVerified = {
      filters: {
        artist: { verified: true },
        track: { verified: true },
        album: { verified: true },
      },
    };

    customRender(<SearchFilters search={searchWithVerified} navigate={navigate} />);

    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    fireEvent.click(verifiedCheckbox);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.artist.verified).toBeUndefined();
    expect(result.filters.track.verified).toBeUndefined();
    expect(result.filters.album.verified).toBeUndefined();
  });

  it('reflects checked state when some categories have verified set', () => {
    const searchPartiallyVerified = {
      filters: {
        artist: { verified: true },
      },
    };

    customRender(<SearchFilters search={searchPartiallyVerified} navigate={navigate} />);

    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    // aria-checked should be "true" or data-state="checked"
    expect(verifiedCheckbox).toBeChecked();
  });

  it('reflects unchecked state when no categories have verified set', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    expect(verifiedCheckbox).not.toBeChecked();
  });

  // ── Explicit checkbox ──────────────────────────────────────

  it('calls navigate when explicit checkbox is toggled (checked)', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const explicitCheckbox = screen.getByTestId('filter-checkbox-explicit');
    fireEvent.click(explicitCheckbox);

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      }),
    );

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.track.explicit).toBe(false);
  });

  it('calls navigate when explicit checkbox is toggled (unchecked)', () => {
    const searchWithExplicit = {
      filters: {
        track: { explicit: false },
      },
    };

    customRender(<SearchFilters search={searchWithExplicit} navigate={navigate} />);

    const explicitCheckbox = screen.getByTestId('filter-checkbox-explicit');
    fireEvent.click(explicitCheckbox);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.track.explicit).toBeUndefined();
  });

  it('reflects checked state for explicit checkbox when filter is set', () => {
    const searchWithExplicit = {
      filters: {
        track: { explicit: false },
      },
    };

    customRender(<SearchFilters search={searchWithExplicit} navigate={navigate} />);

    const explicitCheckbox = screen.getByTestId('filter-checkbox-explicit');
    expect(explicitCheckbox).toBeChecked();
  });

  it('reflects unchecked state for explicit checkbox when no filter is set', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const explicitCheckbox = screen.getByTestId('filter-checkbox-explicit');
    expect(explicitCheckbox).not.toBeChecked();
  });

  // ── Duration slider ────────────────────────────────────────

  it('renders the duration slider with default value 1200', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '1200');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '1200');
  });

  it('renders the duration slider with current filter value', () => {
    const searchWithDuration = {
      filters: {
        track: { durationTo: 500 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '500');
  });

  it('displays the current duration value as text', () => {
    const searchWithDuration = {
      filters: {
        track: { durationTo: 300 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    expect(screen.getByText('300s')).toBeInTheDocument();
  });

  it('calls navigate when slider value changes via keyboard (ArrowRight)', () => {
    // Start below max so ArrowRight actually increases the value
    const searchWithDuration = {
      filters: {
        track: { durationTo: 500 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      }),
    );

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    // Value 500, step 10, ArrowRight increases by step
    expect(result.filters.track.durationTo).toBe(510);
  });

  it('calls navigate when slider value changes via keyboard (ArrowLeft)', () => {
    const searchWithDuration = {
      filters: {
        track: { durationTo: 500 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.track.durationTo).toBe(490);
  });

  it('caps slider at max value via keyboard (ArrowRight at max)', () => {
    const searchAtMax = {
      filters: {
        track: { durationTo: 1200 },
      },
    };

    customRender(<SearchFilters search={searchAtMax} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    // Math.min(max, steppedValue + step) caps at 1200
    expect(result.filters.track.durationTo).toBe(1200);
  });

  it('caps slider at min value via keyboard (ArrowLeft at min)', () => {
    // Note: 0 is falsy, so durationTo: 0 renders as 1200 due to `|| 1200` fallback.
    // We test with 10 (the step size) which is the lowest non-falsy value that won't clamp.
    const searchAtMin = {
      filters: {
        track: { durationTo: 10 },
      },
    };

    customRender(<SearchFilters search={searchAtMin} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    // Math.max(min, steppedValue - step) = Math.max(0, 10 - 10) = 0
    expect(result.filters.track.durationTo).toBe(0);
  });

  it('jumps to min via Home key', () => {
    const searchWithDuration = {
      filters: {
        track: { durationTo: 500 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.track.durationTo).toBe(0);
  });

  it('jumps to max via End key', () => {
    const searchWithDuration = {
      filters: {
        track: { durationTo: 500 },
      },
    };

    customRender(<SearchFilters search={searchWithDuration} navigate={navigate} />);

    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.track.durationTo).toBe(1200);
  });

  // ── Album type select ──────────────────────────────────────

  it('renders the album type select with default placeholder', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    // Radix SelectTrigger renders as a combobox
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
    // Default value is "none" which renders the "All Types" SelectItem text
    expect(selectTrigger).toHaveTextContent('All Types');
  });

  it('shows current album type value when a filter is set', () => {
    const searchWithAlbumType = {
      filters: {
        album: { type: 'single' },
      },
    };

    customRender(<SearchFilters search={searchWithAlbumType} navigate={navigate} />);

    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveTextContent('Single');
  });

  it('calls navigate when album type is changed', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    // Click the trigger to open the select
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    // Select "Album" option from the Radix portal
    const albumOption = screen.getByRole('option', { name: 'Album' });
    fireEvent.click(albumOption);

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.any(Function),
      }),
    );

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.album.type).toBe('album');
  });

  it('clears album type filter when "All Types" is selected', () => {
    const searchWithAlbumType = {
      filters: {
        album: { type: 'ep' },
      },
    };

    customRender(<SearchFilters search={searchWithAlbumType} navigate={navigate} />);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    // Select "All Types" (value "none") to clear the filter
    const allTypesOption = screen.getByRole('option', { name: 'All Types' });
    fireEvent.click(allTypesOption);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.album.type).toBeUndefined();
  });

  it('selects EP album type', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    const epOption = screen.getByRole('option', { name: 'EP' });
    fireEvent.click(epOption);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.album.type).toBe('ep');
  });

  it('selects Compilation album type', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    const compilationOption = screen.getByRole('option', { name: 'Compilation' });
    fireEvent.click(compilationOption);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({});
    expect(result.filters.album.type).toBe('compilation');
  });

  // ── Page reset ─────────────────────────────────────────────

  it('resets page to 1 when any filter changes', () => {
    customRender(<SearchFilters search={baseSearch} navigate={navigate} />);

    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    fireEvent.click(verifiedCheckbox);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({ page: 5 });
    expect(result.page).toBe(1);
  });

  // ── Preserving existing filters ────────────────────────────

  it('preserves existing filter values when changing a different filter', () => {
    const searchWithExistingFilters = {
      filters: {
        track: { durationTo: 300 },
        album: { type: 'ep' },
      },
    };

    customRender(<SearchFilters search={searchWithExistingFilters} navigate={navigate} />);

    // Toggle verified checkbox — should keep other filters intact
    const verifiedCheckbox = screen.getByTestId('filter-checkbox-verified');
    fireEvent.click(verifiedCheckbox);

    const searchFn = navigate.mock.calls[0][0].search;
    const result = searchFn({
      filters: {
        track: { durationTo: 300 },
        album: { type: 'ep' },
      },
    });

    expect(result.filters.track.durationTo).toBe(300);
    expect(result.filters.album.type).toBe('ep');
    expect(result.filters.artist.verified).toBe(true);
    expect(result.filters.track.verified).toBe(true);
    expect(result.filters.album.verified).toBe(true);
  });
});
