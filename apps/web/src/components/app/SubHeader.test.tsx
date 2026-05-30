import { customRenderWithRouter } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SubHeader } from './SubHeader';
import { useRouter } from '@tanstack/react-router';

// Mock TanStack Router
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useRouter: vi.fn(),
  };
});

describe('SubHeader', () => {
  const mockBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      history: { back: mockBack },
    } as any);
  });

  it('renders title as string', async () => {
    customRenderWithRouter(<SubHeader title="Test Title" />);
    const title = await screen.findByTestId('sub-header-title');
    expect(title).toHaveTextContent('Test Title');
  });

  it('renders custom title as ReactNode', async () => {
    customRenderWithRouter(<SubHeader title={<span data-testid="custom-title">Custom</span>} />);
    expect(await screen.findByTestId('custom-title')).toBeInTheDocument();
  });

  it('renders back button when showBackButton is true', async () => {
    customRenderWithRouter(<SubHeader title="Title" showBackButton={true} />);
    expect(await screen.findByTestId('sub-header-back')).toBeInTheDocument();
  });

  it('calls router.history.back() when back button is clicked', async () => {
    customRenderWithRouter(<SubHeader title="Title" showBackButton={true} />);
    const backButton = await screen.findByTestId('sub-header-back');
    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it('calls onBackClick if provided instead of default back navigation', async () => {
    const onBackClick = vi.fn();
    customRenderWithRouter(
      <SubHeader title="Title" showBackButton={true} onBackClick={onBackClick} />,
    );
    const backButton = await screen.findByTestId('sub-header-back');
    fireEvent.click(backButton);

    expect(onBackClick).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('renders search element if provided', async () => {
    customRenderWithRouter(
      <SubHeader title="Title" search={<div data-testid="search-box">Search</div>} />,
    );
    expect(await screen.findByTestId('search-box')).toBeInTheDocument();
    expect(await screen.findByTestId('sub-header-search')).toBeInTheDocument();
  });

  it('renders actions if provided', async () => {
    customRenderWithRouter(
      <SubHeader title="Title" actions={<button data-testid="action-btn">Action</button>} />,
    );
    expect(await screen.findByTestId('action-btn')).toBeInTheDocument();
  });
});
