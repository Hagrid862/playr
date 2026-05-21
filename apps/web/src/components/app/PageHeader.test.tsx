import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    mockBack.mockClear();
  });

  describe('title and description', () => {
    it('renders title and description correctly', () => {
      customRender(<PageHeader title="Test Title" description="Test Description" />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      customRender(<PageHeader title="Test Title" />);

      const description = screen.queryByText('Test Description');
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders actions when provided', () => {
      customRender(<PageHeader title="Test Title" actions={<button>Action Button</button>} />);

      expect(screen.getByRole('button', { name: /Action Button/i })).toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('shows back button and calls router.history.back() when clicked', async () => {
      const user = userEvent.setup();
      customRender(<PageHeader title="Test Title" showBackButton={true} />);

      const backButton = screen.getByRole('button');
      expect(backButton).toBeInTheDocument();

      await user.click(backButton);
      expect(mockBack).toHaveBeenCalled();
    });

    it('calls onBackClick instead of router.history.back when provided', async () => {
      const user = userEvent.setup();
      const onBackClick = vi.fn();
      customRender(
        <PageHeader title="Test Title" showBackButton={true} onBackClick={onBackClick} />,
      );

      const backButton = screen.getByRole('button');
      await user.click(backButton);
      expect(onBackClick).toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
