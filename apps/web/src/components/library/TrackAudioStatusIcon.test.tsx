import {
  TRACK_AUDIO_FAILED_TOOLTIP,
  TRACK_AUDIO_PROCESSING_TOOLTIP,
} from '@/lib/display-constants';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TrackAudioStatusIcon } from './TrackAudioStatusIcon';

describe('TrackAudioStatusIcon', () => {
  it('renders nothing when neither processing nor failed', () => {
    customRender(<TrackAudioStatusIcon />);
    expect(screen.queryByLabelText('Processing')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Processing failed')).not.toBeInTheDocument();
  });

  it('renders processing indicator with tooltip message on hover', async () => {
    const user = userEvent.setup();
    customRender(<TrackAudioStatusIcon isProcessing />);

    expect(screen.getByLabelText('Processing')).toBeInTheDocument();
    await user.hover(screen.getByLabelText('Processing'));
    const tooltips = await screen.findAllByText(TRACK_AUDIO_PROCESSING_TOOLTIP);
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('renders failed indicator with tooltip message on hover', async () => {
    const user = userEvent.setup();
    customRender(<TrackAudioStatusIcon isFailed />);

    expect(screen.getByLabelText('Processing failed')).toBeInTheDocument();
    await user.hover(screen.getByLabelText('Processing failed'));
    const tooltips = await screen.findAllByText(TRACK_AUDIO_FAILED_TOOLTIP);
    expect(tooltips.length).toBeGreaterThan(0);
  });

  it('shows processing when both processing and failed are true', () => {
    customRender(<TrackAudioStatusIcon isProcessing isFailed />);

    expect(screen.getByLabelText('Processing')).toBeInTheDocument();
    expect(screen.queryByLabelText('Processing failed')).not.toBeInTheDocument();
  });
});
