import { UserIcon } from '@phosphor-icons/react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaCard } from './MediaCard';

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

function getDefaultProps() {
  return {
    id: '123',
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    link: '/test/$id',
    coverUrl: 'https://example.com/cover.jpg',
    placeholderIcon: <UserIcon data-testid="user-icon" />,
  };
}

describe('MediaCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title, subtitle, cover, and link', () => {
      render(<MediaCard {...getDefaultProps()} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
      expect(img).toHaveAttribute('alt', 'Test Title');

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test/$id');
      expect(link).toHaveAttribute('data-params', JSON.stringify({ id: '123' }));
    });

    it('renders placeholder icon when coverUrl is missing', () => {
      render(<MediaCard {...getDefaultProps()} coverUrl={undefined} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('renders default DiscIcon when coverUrl and placeholderIcon are missing', () => {
      render(<MediaCard {...getDefaultProps()} coverUrl={undefined} placeholderIcon={undefined} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Unknown when subtitle is missing', () => {
      render(<MediaCard {...getDefaultProps()} subtitle={undefined} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('coverStyle', () => {
    it('applies circle or square classes', () => {
      const { container: circleContainer } = render(
        <MediaCard {...getDefaultProps()} coverStyle="circle" coverUrl={undefined} />,
      );
      expect(circleContainer.querySelector('.rounded-full')).toBeInTheDocument();

      const { container: squareContainer } = render(
        <MediaCard {...getDefaultProps()} coverStyle="square" coverUrl={undefined} />,
      );
      expect(squareContainer.querySelector('.rounded')).toBeInTheDocument();
      expect(squareContainer.querySelector('.rounded-full')).not.toBeInTheDocument();
    });
  });
});
