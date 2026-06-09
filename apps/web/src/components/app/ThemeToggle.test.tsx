import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from 'next-themes';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

vi.mock('@phosphor-icons/react', () => ({
  SunIcon: () => <div data-testid="sun-icon" />,
  MoonIcon: () => <div data-testid="moon-icon" />,
}));

// Mock the UI components to avoid portal issues
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTheme).mockReturnValue({
      setTheme: mockSetTheme,
      theme: 'system',
      resolvedTheme: 'light',
    } as any);
  });

  it('renders trigger button', () => {
    customRender(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /Toggle theme/i })).toBeInTheDocument();
  });

  it('calls setTheme when items are clicked', async () => {
    customRender(<ThemeToggle />);

    // Check menu items exist
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();

    // Click 'Dark'
    await user.click(screen.getByText('Dark'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    // Click 'Light'
    await user.click(screen.getByText('Light'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    // Click 'System'
    await user.click(screen.getByText('System'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
