import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkTrackCard } from './BulkTrackCard';

function createMockTrack(overrides: Record<string, unknown> = {}) {
  return {
    id: 'track-1',
    file: new File(['audio'], 'track1.mp3', { type: 'audio/mpeg' }),
    title: 'Track 1',
    trackNumber: 1,
    diskNumber: 1,
    explicit: false,
    ...overrides,
  };
}

describe('BulkTrackCard', () => {
  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnRemove.mockClear();
  });

  it('renders track info', () => {
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    expect(screen.getByText('track1.mp3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Track 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Disk No.')).toHaveValue(1);
    expect(screen.getByLabelText('Track No.')).toHaveValue(1);
    expect(screen.getByLabelText('Explicit Content')).toBeInTheDocument();
  });

  it('calls onUpdate when track title changes', () => {
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const titleInput = screen.getByLabelText('Track Title');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ title: 'New Title' });
  });

  it('calls onUpdate when disk number changes', () => {
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const diskInput = screen.getByLabelText('Disk No.');
    fireEvent.change(diskInput, { target: { value: '2' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ diskNumber: 2 });
  });

  it('calls onUpdate with 1 when disk number is invalid', async () => {
    const user = userEvent.setup();
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const diskInput = screen.getByLabelText('Disk No.');
    await user.clear(diskInput);
    fireEvent.change(diskInput, { target: { value: '' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ diskNumber: 1 });
  });

  it('calls onUpdate when track number changes', () => {
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const trackInput = screen.getByLabelText('Track No.');
    fireEvent.change(trackInput, { target: { value: '3' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ trackNumber: 3 });
  });

  it('calls onUpdate with 1 when track number is invalid', async () => {
    const user = userEvent.setup();
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const trackInput = screen.getByLabelText('Track No.');
    await user.clear(trackInput);
    fireEvent.change(trackInput, { target: { value: '0' } });

    expect(mockOnUpdate).toHaveBeenCalledWith({ trackNumber: 1 });
  });

  it('calls onUpdate when explicit checkbox is toggled', async () => {
    const user = userEvent.setup();
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Explicit Content' });
    await user.click(checkbox);

    expect(mockOnUpdate).toHaveBeenCalledWith({ explicit: true });
  });

  it('calls onUpdate with explicit false when unchecking', async () => {
    const user = userEvent.setup();
    const track = createMockTrack({ explicit: true });
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Explicit Content' });
    await user.click(checkbox);

    expect(mockOnUpdate).toHaveBeenCalledWith({ explicit: false });
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    await user.click(screen.getByRole('button', { name: 'Remove track' }));

    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('handles blur on text fields without error', () => {
    const track = createMockTrack();
    render(
      <BulkTrackCard track={track} onUpdate={mockOnUpdate} onRemove={mockOnRemove} />,
    );

    fireEvent.blur(screen.getByLabelText('Track Title'));
    fireEvent.blur(screen.getByLabelText('Disk No.'));
    fireEvent.blur(screen.getByLabelText('Track No.'));
  });
});
