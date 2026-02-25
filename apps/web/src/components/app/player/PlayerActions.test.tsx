import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerActions } from './PlayerActions';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  DropdownMenuCheckboxItem: ({
    children,
    onCheckedChange,
    checked = false,
  }: PropsWithChildren<{ onCheckedChange?: (v: boolean) => void; checked?: boolean }>) => (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
    >
      {children}
    </button>
  ),
  DropdownMenuSub: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuPortal: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({ onChange }: { onChange: (val: number) => void }) => (
    <button type="button" data-testid="mock-slider" onClick={() => onChange(75)}>
      Slider
    </button>
  ),
}));

describe('PlayerActions', () => {
  const setVolume = vi.fn();
  const setQueueOpen = vi.fn();
  const setSidebarView = vi.fn();
  const setQuality = vi.fn();

  const defaultStore: Partial<PlayerState> = {
    volume: 0.5,
    setVolume,
    isQueueOpen: false,
    setQueueOpen,
    sidebarView: 'queue',
    setSidebarView,
    quality: 'auto',
    setQuality,
    availableQualities: [
      'auto',
      StreamAudioQuality.high,
      StreamAudioQuality.standard,
      StreamAudioQuality.low,
      StreamAudioQuality.lossless,
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePlayerStore).mockReturnValue(defaultStore as PlayerState);
  });

  it('renders correctly', () => {
    render(<PlayerActions />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('handles lyrics toggle when queue is closed', () => {
    render(<PlayerActions />);
    const lyricsBtn = screen.getByRole('button', { name: /lyrics/i });
    fireEvent.click(lyricsBtn);
    expect(setSidebarView).toHaveBeenCalledWith('lyrics');
    expect(setQueueOpen).toHaveBeenCalledWith(true);
  });

  it('handles lyrics toggle when queue is open to lyrics', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      isQueueOpen: true,
      sidebarView: 'lyrics',
    } as PlayerState);
    render(<PlayerActions />);
    const lyricsBtn = screen.getByRole('button', { name: /lyrics/i });
    fireEvent.click(lyricsBtn);
    expect(setQueueOpen).toHaveBeenCalledWith(false);
  });

  it('handles queue toggle when queue is closed', () => {
    render(<PlayerActions />);
    const queueBtn = screen.getByRole('button', { name: /queue/i });
    fireEvent.click(queueBtn);
    expect(setSidebarView).toHaveBeenCalledWith('queue');
    expect(setQueueOpen).toHaveBeenCalledWith(true);
  });

  it('handles queue toggle when queue is open to queue', () => {
    vi.mocked(usePlayerStore).mockReturnValue({
      ...defaultStore,
      isQueueOpen: true,
      sidebarView: 'queue',
    } as PlayerState);
    render(<PlayerActions />);
    const queueBtn = screen.getByRole('button', { name: /queue/i });
    fireEvent.click(queueBtn);
    expect(setQueueOpen).toHaveBeenCalledWith(false);
  });

  it('handles volume change via slider', () => {
    render(<PlayerActions />);
    // Open volume popover
    const volumeBtn = screen.getByRole('button', { name: /volume/i });
    fireEvent.click(volumeBtn);

    const slider = screen.getByTestId('mock-slider');
    fireEvent.click(slider);
    expect(setVolume).toHaveBeenCalledWith(0.75);
  });

  describe('Audio Quality Selection', () => {
    it('handles auto quality selection', () => {
      render(<PlayerActions />);
      const autoItem = screen.getByRole('menuitemcheckbox', { name: /Auto/i });
      fireEvent.click(autoItem);
      expect(setQuality).toHaveBeenCalledWith('auto');
    });

    it('handles lossless quality selection', () => {
      render(<PlayerActions />);
      const losslessItem = screen.getByRole('menuitemcheckbox', { name: /Lossless/i });
      fireEvent.click(losslessItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.lossless);
    });

    it('handles high quality selection', () => {
      render(<PlayerActions />);
      const highItem = screen.getByRole('menuitemcheckbox', { name: /High/i });
      fireEvent.click(highItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.high);
    });

    it('handles standard quality selection', () => {
      render(<PlayerActions />);
      const standardItem = screen.getByRole('menuitemcheckbox', { name: /Standard/i });
      fireEvent.click(standardItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.standard);
    });

    it('handles low quality selection', () => {
      render(<PlayerActions />);
      const lowItem = screen.getByRole('menuitemcheckbox', { name: /Low/i });
      fireEvent.click(lowItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.low);
    });

    it('does not set quality if requested quality is unavailable', () => {
      vi.mocked(usePlayerStore).mockReturnValue({
        ...defaultStore,
        availableQualities: ['auto'],
      } as PlayerState);

      render(<PlayerActions />);
      const highItem = screen.getByRole('menuitemcheckbox', { name: /High/i });
      fireEvent.click(highItem);
      expect(setQuality).not.toHaveBeenCalledWith(StreamAudioQuality.high);

      const standardItem = screen.getByRole('menuitemcheckbox', { name: /Standard/i });
      fireEvent.click(standardItem);
      expect(setQuality).not.toHaveBeenCalledWith(StreamAudioQuality.standard);

      const lowItem = screen.getByRole('menuitemcheckbox', { name: /Low/i });
      fireEvent.click(lowItem);
      expect(setQuality).not.toHaveBeenCalledWith(StreamAudioQuality.low);
    });
  });
});
