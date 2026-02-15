import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaCard } from './MediaCard';
import { UserIcon } from '@phosphor-icons/react';

// Mocking Link because it needs router context
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string | number | boolean | undefined | null>;
  }) => (
    <a href={to} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
  useRouter: () => ({
    navigate: vi.fn(),
  }),
}));

describe('MediaCard', () => {
  const defaultProps = {
    id: '123',
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    link: '/test/$id',
    coverUrl: 'https://example.com/cover.jpg',
    placeholderIcon: <UserIcon data-testid="user-icon" />,
  };

  it('renders correctly with all props', () => {
    render(<MediaCard {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(img).toHaveAttribute('alt', 'Test Title');

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test/$id');
    expect(link).toHaveAttribute('data-params', JSON.stringify({ id: '123' }));
  });

  it('renders placeholder icon when coverUrl is missing', () => {
    render(<MediaCard {...defaultProps} coverUrl={undefined} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('renders default DiscIcon when coverUrl and placeholderIcon are missing', () => {
    // We need to bypass the type check or provide undefined for placeholderIcon
    render(<MediaCard {...defaultProps} coverUrl={undefined} placeholderIcon={undefined} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // DiscIcon doesn't have a test-id by default, but we can check if there's an svg
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders "Unknown" when subtitle is missing', () => {
    render(<MediaCard {...defaultProps} subtitle={undefined} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
  it('applies correct class for coverStyle', () => {
    const { container: circleContainer } = render(
      <MediaCard {...defaultProps} coverStyle="circle" coverUrl={undefined} />,
    );
    expect(circleContainer.querySelector('.rounded-full')).toBeInTheDocument();

    const { container: squareContainer } = render(
      <MediaCard {...defaultProps} coverStyle="square" coverUrl={undefined} />,
    );
    expect(squareContainer.querySelector('.rounded')).toBeInTheDocument();
    expect(squareContainer.querySelector('.rounded-full')).not.toBeInTheDocument();
  });
});
