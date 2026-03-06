import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTrackFormModals } from './CreateTrackFormModals';

describe('CreateTrackFormModals', () => {
  const mockSetIsFormatModalOpen = vi.fn();
  const mockSetIsMultipleFilesModalOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Too Many Files modal when isMultipleFilesModalOpen', () => {
    render(
      <CreateTrackFormModals
        isFormatModalOpen={false}
        setIsFormatModalOpen={mockSetIsFormatModalOpen}
        isMultipleFilesModalOpen
        setIsMultipleFilesModalOpen={mockSetIsMultipleFilesModalOpen}
      />,
    );

    expect(screen.getByText('Too Many Files')).toBeInTheDocument();
    expect(
      screen.getByText(/You can only upload one audio track at a time/),
    ).toBeInTheDocument();
  });

  it('renders Invalid File Format modal when isFormatModalOpen', () => {
    render(
      <CreateTrackFormModals
        isFormatModalOpen
        setIsFormatModalOpen={mockSetIsFormatModalOpen}
        isMultipleFilesModalOpen={false}
        setIsMultipleFilesModalOpen={mockSetIsMultipleFilesModalOpen}
      />,
    );

    expect(screen.getByText('Invalid File Format')).toBeInTheDocument();
    expect(
      screen.getByText(/The file you dropped is not a supported audio format/),
    ).toBeInTheDocument();
  });

  it('calls setIsMultipleFilesModalOpen(false) when OK clicked in multiple-files modal', async () => {
    const user = userEvent.setup();
    render(
      <CreateTrackFormModals
        isFormatModalOpen={false}
        setIsFormatModalOpen={mockSetIsFormatModalOpen}
        isMultipleFilesModalOpen
        setIsMultipleFilesModalOpen={mockSetIsMultipleFilesModalOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(mockSetIsMultipleFilesModalOpen).toHaveBeenCalledWith(false);
  });

  it('calls setIsFormatModalOpen(false) when OK clicked in format modal', async () => {
    const user = userEvent.setup();
    render(
      <CreateTrackFormModals
        isFormatModalOpen
        setIsFormatModalOpen={mockSetIsFormatModalOpen}
        isMultipleFilesModalOpen={false}
        setIsMultipleFilesModalOpen={mockSetIsMultipleFilesModalOpen}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    expect(mockSetIsFormatModalOpen).toHaveBeenCalledWith(false);
  });
});
