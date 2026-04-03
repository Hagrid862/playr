import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateAlbumModals } from './CreateAlbumModals';

describe('CreateAlbumModals', () => {
  const setIsFormatModalOpen = vi.fn();
  const setIsMultipleFilesModalOpen = vi.fn();

  const defaultProps = {
    isFormatModalOpen: false,
    setIsFormatModalOpen,
    isMultipleFilesModalOpen: false,
    setIsMultipleFilesModalOpen,
  };

  it('renders nothing when both modals are closed', () => {
    const { container } = customRender(<CreateAlbumModals {...defaultProps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Invalid File Format modal when isFormatModalOpen is true', () => {
    customRender(<CreateAlbumModals {...defaultProps} isFormatModalOpen={true} />);
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
  });

  it('renders Too Many Files modal when isMultipleFilesModalOpen is true', () => {
    customRender(<CreateAlbumModals {...defaultProps} isMultipleFilesModalOpen={true} />);
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
  });

  it('calls setIsFormatModalOpen when OK is clicked in format modal', async () => {
    const user = userEvent.setup();
    customRender(<CreateAlbumModals {...defaultProps} isFormatModalOpen={true} />);
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(setIsFormatModalOpen).toHaveBeenCalledWith(false);
  });

  it('calls setIsMultipleFilesModalOpen when OK is clicked in multiple files modal', async () => {
    const user = userEvent.setup();
    customRender(<CreateAlbumModals {...defaultProps} isMultipleFilesModalOpen={true} />);
    await user.click(screen.getByRole('button', { name: /^OK$/i }));
    expect(setIsMultipleFilesModalOpen).toHaveBeenCalledWith(false);
  });
});
