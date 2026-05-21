import { UserIcon } from '@phosphor-icons/react';
import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
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

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-context-menu">{children}</div>
  ),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-context-menu-trigger">{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-context-menu-content">{children}</div>
  ),
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
    it('renders coverSlot instead of image or placeholder when coverSlot is provided', () => {
      customRender(
        <MediaCard
          {...getDefaultProps()}
          coverSlot={<div data-testid="custom-cover-slot">Custom Slot</div>}
        />,
      );

      expect(screen.getByTestId('custom-cover-slot')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders title, subtitle, cover, and link', () => {
      customRender(<MediaCard {...getDefaultProps()} />);

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
      customRender(<MediaCard {...getDefaultProps()} coverUrl={undefined} />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('renders default DiscIcon when coverUrl and placeholderIcon are missing', () => {
      customRender(
        <MediaCard {...getDefaultProps()} coverUrl={undefined} placeholderIcon={undefined} />,
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders Unknown when subtitle is missing', () => {
      customRender(<MediaCard {...getDefaultProps()} subtitle={undefined} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('coverStyle', () => {
    it('applies circle or square classes', () => {
      const { container: circleContainer } = customRender(
        <MediaCard {...getDefaultProps()} coverStyle="circle" coverUrl={undefined} />,
      );
      expect(circleContainer.querySelector('.rounded-full')).toBeInTheDocument();

      const { container: squareContainer } = customRender(
        <MediaCard {...getDefaultProps()} coverStyle="square" coverUrl={undefined} />,
      );
      expect(squareContainer.querySelector('.rounded')).toBeInTheDocument();
      expect(squareContainer.querySelector('.rounded-full')).not.toBeInTheDocument();
    });
  });

  describe('contextMenu', () => {
    it('does not wrap with ContextMenu when contextMenu prop is omitted', () => {
      customRender(<MediaCard {...getDefaultProps()} />);
      expect(screen.queryByTestId('mock-context-menu')).not.toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('wraps the link element with ContextMenu when contextMenu prop is provided', () => {
      customRender(
        <MediaCard
          {...getDefaultProps()}
          contextMenu={<div data-testid="custom-context-menu-content">Custom Menu</div>}
        />,
      );

      expect(screen.getByTestId('mock-context-menu')).toBeInTheDocument();
      expect(screen.getByTestId('mock-context-menu-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('mock-context-menu-content')).toBeInTheDocument();
      expect(screen.getByTestId('custom-context-menu-content')).toBeInTheDocument();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });
});
