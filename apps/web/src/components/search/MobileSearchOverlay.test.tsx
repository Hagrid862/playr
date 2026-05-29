import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MobileSearchOverlay } from './MobileSearchOverlay';

import { SearchInput } from '@/components/search/SearchInput';

// Mock SearchInput to avoid its complex dependencies
vi.mock('@/components/search/SearchInput', () => ({
  SearchInput: vi.fn(() => <div data-testid="mock-search-input">Mock Search Input</div>),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, className, ...props }: any) => (
        <div className={className} {...props}>
          {children}
        </div>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('MobileSearchOverlay', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('does not render when isOpen is false', () => {
    customRender(<MobileSearchOverlay isOpen={false} onClose={onClose} />);
    expect(screen.queryByLabelText('Search overlay')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    expect(screen.getByLabelText('Search overlay')).toBeInTheDocument();
    expect(screen.getByTestId('mock-search-input')).toBeInTheDocument();
  });

  it('calls onClose when back button is clicked', () => {
    customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close search');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open and restores it when closed', () => {
    const { rerender } = customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<MobileSearchOverlay isOpen={false} onClose={onClose} />);
    
    expect(document.body.style.overflow).toBe('');
  });

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    
    unmount();
    
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('passes correct props to SearchInput', () => {
    customRender(<MobileSearchOverlay isOpen={true} onClose={onClose} />);
    
    expect(SearchInput).toHaveBeenCalled();
    const props = vi.mocked(SearchInput).mock.calls[0][0];
    expect(props).toMatchObject({
      resultsInline: true,
      hideScopeToggle: true,
      autoFocus: true,
      onEscape: onClose,
      onSearchComplete: onClose,
      placeholder: 'Search something...',
    });
  });
});
