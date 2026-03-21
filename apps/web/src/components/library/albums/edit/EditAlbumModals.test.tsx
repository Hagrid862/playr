import { customRender } from '@repo/testing';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditAlbumModals } from './EditAlbumModals';

describe('EditAlbumModals', () => {
  const setIsFormatModalOpen = vi.fn();
  const setIsMultipleFilesModalOpen = vi.fn();

  const defaultProps = {
    isFormatModalOpen: false,
    setIsFormatModalOpen,
    isMultipleFilesModalOpen: false,
    setIsMultipleFilesModalOpen,
  };

  it('renders nothing when closed', () => {
    const { container } = customRender(<EditAlbumModals {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Invalid File Format modal', () => {
    customRender(<EditAlbumModals {...defaultProps} isFormatModalOpen={true} />);
    expect(screen.getByText(/Invalid File Format/i)).toBeInTheDocument();
  });

  it('renders Too Many Files modal', () => {
    customRender(<EditAlbumModals {...defaultProps} isMultipleFilesModalOpen={true} />);
    expect(screen.getByText(/Too Many Files/i)).toBeInTheDocument();
  });

  it('calls setIsFormatModalOpen when close is clicked', async () => {
    const user = userEvent.setup();
    customRender(<EditAlbumModals {...defaultProps} isFormatModalOpen={true} />);
    const dialog = screen.getByRole('dialog');
    // Using getAllByRole and picking the first one (the X button usually)
    const closeButtons = within(dialog).getAllByRole('button', { name: /Close/i });
    await user.click(closeButtons[0]);
    expect(setIsFormatModalOpen).toHaveBeenCalledWith(false);
  });
});
