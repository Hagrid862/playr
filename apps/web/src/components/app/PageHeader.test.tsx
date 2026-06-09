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
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));

describe('PageHeader', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  describe('title and description', () => {
    it('renders title and description correctly', () => {
      customRender(<PageHeader title="Test Title" description="Test Description" />);

      const titles = screen.getAllByText('Test Title');
      expect(titles.length).toBeGreaterThanOrEqual(1);

      const descriptions = screen.getAllByText('Test Description');
      expect(descriptions.length).toBeGreaterThanOrEqual(1);
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

      const actionButtons = screen.getAllByRole('button', { name: /Action Button/i });
      expect(actionButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('back button', () => {
    it('shows back button(s) and calls router.history.back() when clicked', async () => {
      const user = userEvent.setup();
      customRender(<PageHeader title="Test Title" showBackButton={true} />);

      const backButtons = screen.getAllByRole('button', { name: /Go back/i });
      expect(backButtons.length).toBeGreaterThanOrEqual(1);

      // Click the first back button found
      await user.click(backButtons[0]);
      expect(mockBack).toHaveBeenCalled();
    });

    it('calls onBackClick instead of router.history.back when provided', async () => {
      const user = userEvent.setup();
      const onBackClick = vi.fn();
      customRender(
        <PageHeader title="Test Title" showBackButton={true} onBackClick={onBackClick} />,
      );

      const backButton = screen.getAllByRole('button', { name: /Go back/i })[0];
      await user.click(backButton);
      expect(onBackClick).toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('mobile search toggle', () => {
    it('renders open search button in collapsed state (no title, no expansion)', () => {
      customRender(<PageHeader mobileSearchExpanded={false} />);

      const openButtons = screen.getAllByRole('button', { name: /Open search/i });
      expect(openButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onMobileSearchToggle when open search button is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      customRender(<PageHeader mobileSearchExpanded={false} onMobileSearchToggle={onToggle} />);

      const openButton = screen.getAllByRole('button', { name: /Open search/i })[0];
      await user.click(openButton);
      expect(onToggle).toHaveBeenCalled();
    });

    it('applies hidden class on mobile when search is expanded', () => {
      const { container } = customRender(<PageHeader mobileSearchExpanded={true} />);
      const header = container.firstChild as HTMLElement;
      expect(header.className).toContain('max-md:hidden');
    });

    it('hides open search button when title is provided', () => {
      customRender(<PageHeader title="Test Title" mobileSearchExpanded={false} />);

      const openButton = screen.queryByRole('button', { name: /Open search/i });
      expect(openButton).not.toBeInTheDocument();
    });
  });
});
