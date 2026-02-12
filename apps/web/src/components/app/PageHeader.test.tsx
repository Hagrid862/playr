import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

const mockBack = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    history: {
      back: mockBack,
    },
  }),
}));

describe('PageHeader', () => {
  it('renders title and description correctly', () => {
    render(<PageHeader title="Test Title" description="Test Description" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(<PageHeader title="Test Title" actions={<button>Action Button</button>} />);

    expect(screen.getByRole('button', { name: /Action Button/i })).toBeInTheDocument();
  });

  it('shows back button and calls router.history.back() when clicked', async () => {
    const user = userEvent.setup();
    render(<PageHeader title="Test Title" showBackButton={true} />);

    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not show back button when showBackButton is false', () => {
    render(<PageHeader title="Test Title" showBackButton={false} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<PageHeader title="Test Title" />);

    // We check for any p tag or description text
    const description = screen.queryByText('Test Description');
    expect(description).not.toBeInTheDocument();
  });
});
