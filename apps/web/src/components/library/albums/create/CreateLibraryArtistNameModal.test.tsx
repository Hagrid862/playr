import { checkLibraryArtistNameAvailability } from '@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability';
import { customRender } from '@repo/testing/web';
import { GetLibraryArtistNameAvailabilityResponseSchema } from '@repo/contracts';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryArtistNameModal } from './CreateLibraryArtistNameModal';

/** Lets "Add artist" stay clickable when empty so `handleConfirm` runs its trimmed-name guard (production uses `disabled`). */
vi.mock('@/components/ui/button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/button')>();
  return {
    ...actual,
    Button: ({ disabled: _disabled, onClick, children, ...rest }: ComponentProps<'button'>) => {
      const isAddOrChecking = children === 'Add artist' || children === 'Checking…';
      const isChecking = children === 'Checking…';
      return (
        <button type="button" {...rest} disabled={isAddOrChecking ? isChecking : false} onClick={onClick}>
          {children}
        </button>
      );
    },
  };
});

const availability = (available: boolean) =>
  GetLibraryArtistNameAvailabilityResponseSchema.parse({
    success: true,
    data: { available },
    error: null,
    meta: { timestamp: 't', requestId: 'r', path: '/p' },
  });

vi.mock('@/hooks/api/library-artists/requests/checkLibraryArtistNameAvailability', () => ({
  checkLibraryArtistNameAvailability: vi.fn(),
}));

describe('CreateLibraryArtistNameModal', () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkLibraryArtistNameAvailability).mockResolvedValue(availability(true));
  });

  it('confirms a unique name and closes', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), 'New Artist');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    expect(onConfirm).toHaveBeenCalledWith('New Artist');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('blocks duplicate pending names', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={['Taken']}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), 'Taken');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/already added an artist with this name/i)).toBeInTheDocument();
  });

  it('shows server conflict when availability is false', async () => {
    vi.mocked(checkLibraryArtistNameAvailability).mockResolvedValueOnce(availability(false));
    const user = userEvent.setup();

    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), 'Existing');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/already exists in your library/i)).toBeInTheDocument();
  });

  it('handles availability check errors', async () => {
    vi.mocked(checkLibraryArtistNameAvailability).mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();

    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), 'Err');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/could not verify name/i)).toBeInTheDocument();
  });

  it('does nothing when confirming empty name', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /add artist/i });
    await user.click(addBtn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clears the artist name when the dialog closes', async () => {
    const user = userEvent.setup();
    const { rerender } = customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), 'Draft');
    rerender(
      <CreateLibraryArtistNameModal
        open={false}
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );
    rerender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByLabelText(/artist name/i)).toHaveValue('');
  });

  it('returns before availability check when Add is invoked with an empty trimmed name', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: /add artist/i })).not.toBeDisabled();
    await user.click(screen.getByRole('button', { name: /add artist/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(checkLibraryArtistNameAvailability).not.toHaveBeenCalled();
  });

  it('does nothing when name is only whitespace', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/artist name/i), '   ');
    await user.click(screen.getByRole('button', { name: /add artist/i }));

    expect(checkLibraryArtistNameAvailability).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('closes from the cancel button', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryArtistNameModal
        open
        onOpenChange={onOpenChange}
        pendingArtistNames={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
