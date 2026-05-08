import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateLibraryGenreNameModal } from './CreateLibraryGenreNameModal';

vi.mock('@/components/ui/dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/dialog')>();
  const OriginalDialog = actual.Dialog;
  return {
    ...actual,
    Dialog: (props: ComponentProps<typeof OriginalDialog>) => (
      <div>
        <button
          type="button"
          data-testid="emit-dialog-open-true"
          aria-label="Emit dialog onOpenChange true"
          onClick={() => props.onOpenChange?.(true)}
        />
        <OriginalDialog {...props} />
      </div>
    ),
  };
});

describe('CreateLibraryGenreNameModal', () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();

  const existingRock = { id: 'g1', name: 'Rock', slug: 'rock' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms a unique name and closes', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[existingRock]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), 'Shoegaze');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    expect(onConfirm).toHaveBeenCalledWith('Shoegaze');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('blocks duplicate pending names', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={['Taken']}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), 'Taken');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/already added a genre with this name/i)).toBeInTheDocument();
  });

  it('blocks when genre match key collides with an existing library genre', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[existingRock]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), 'rock');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/pick it from the list instead/i)).toBeInTheDocument();
  });

  it('rejects names that contain no letters or numbers after normalization', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), '♪♪♪');
    await user.click(screen.getByRole('button', { name: /add genre/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/must contain at least one letter or number/i)).toBeInTheDocument();
  });

  it('clears fields when the dialog closes via props', async () => {
    const user = userEvent.setup();
    const { rerender } = customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), 'Draft');
    rerender(
      <CreateLibraryGenreNameModal
        open={false}
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );
    rerender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByLabelText(/genre name/i)).toHaveValue('');
  });

  it('closes from cancel', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not clear fields when dialog signals open via onOpenChange(true)', async () => {
    const user = userEvent.setup();
    customRender(
      <CreateLibraryGenreNameModal
        open
        onOpenChange={onOpenChange}
        pendingGenreNames={[]}
        existingGenres={[]}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/genre name/i), 'Draft');
    fireEvent.click(screen.getByTestId('emit-dialog-open-true'));

    expect(screen.getByLabelText(/genre name/i)).toHaveValue('Draft');
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
