import * as playbackSync from '@/lib/playback-sync';
import { PlayerState, usePlayerStore } from '@/stores/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStateMock } from '../test-utils/player-test-utils';
import { PlayerActions } from './PlayerActions';

vi.mock('@/stores/player.store', () => ({
  usePlayerStore: vi.fn(),
}));
vi.mock('@/lib/playback-sync', () => ({
  listPlaybackDevices: vi.fn(),
  setActivePlaybackDevice: vi.fn(),
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

vi.mock('@/components/ui/popover', () => ({
  Popover: ({
    children,
    onOpenChange,
  }: PropsWithChildren<{ open?: boolean; onOpenChange?: (v: boolean) => void }>) => {
    const trigger = React.Children.toArray(children).find(
      (c: any) => c.type?.displayName === 'PopoverTrigger' || c.props?.asChild,
    );
    const content = React.Children.toArray(children).find(
      (c: any) => c.type?.displayName === 'PopoverContent' || !c.props?.asChild,
    );
    return (
      <div data-testid="mock-popover">
        <div onClick={() => onOpenChange?.(true)}>{trigger}</div>
        <div onClick={() => onOpenChange?.(false)}>{content}</div>
        <button type="button" onClick={() => onOpenChange?.(true)}>
          Open Popover
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Close Popover
        </button>
      </div>
    );
  },
  PopoverTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  PopoverContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

describe('PlayerActions', () => {
  const setVolume = vi.fn();
  const setQueueOpen = vi.fn();
  const setSidebarView = vi.fn();
  const setQuality = vi.fn();

  const buildState = (overrides: Partial<PlayerState> = {}): PlayerState =>
    createPlayerStateMock({
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
      ...overrides,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playbackSync.listPlaybackDevices).mockResolvedValue();
    vi.mocked(playbackSync.setActivePlaybackDevice).mockResolvedValue();
    vi.mocked(usePlayerStore).mockReturnValue(buildState());
  });

  describe('rendering', () => {
    it('renders correctly', () => {
      customRender(<PlayerActions />);
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });
  });

  describe('sidebar toggles', () => {
    it('handles lyrics toggle when queue is closed', () => {
      customRender(<PlayerActions />);
      const lyricsBtn = screen.getByRole('button', { name: /lyrics/i });
      fireEvent.click(lyricsBtn);
      expect(setSidebarView).toHaveBeenCalledWith('lyrics');
      expect(setQueueOpen).toHaveBeenCalledWith(true);
    });

    it('handles lyrics toggle when queue is open to lyrics', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ isQueueOpen: true, sidebarView: 'lyrics' }),
      );
      customRender(<PlayerActions />);
      const lyricsBtn = screen.getByRole('button', { name: /lyrics/i });
      fireEvent.click(lyricsBtn);
      expect(setQueueOpen).toHaveBeenCalledWith(false);
    });

    it('handles queue toggle when queue is closed', () => {
      customRender(<PlayerActions />);
      const queueBtn = screen.getByRole('button', { name: /queue/i });
      fireEvent.click(queueBtn);
      expect(setSidebarView).toHaveBeenCalledWith('queue');
      expect(setQueueOpen).toHaveBeenCalledWith(true);
    });

    it('handles queue toggle when queue is open to queue', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({ isQueueOpen: true, sidebarView: 'queue' }),
      );
      customRender(<PlayerActions />);
      const queueBtn = screen.getByRole('button', { name: /queue/i });
      fireEvent.click(queueBtn);
      expect(setQueueOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('volume', () => {
    it('handles volume change via slider', () => {
      customRender(<PlayerActions />);
      const volumeBtn = screen.getByRole('button', { name: /volume/i });
      fireEvent.click(volumeBtn);

      const slider = screen.getByTestId('mock-slider');
      fireEvent.click(slider);
      expect(setVolume).toHaveBeenCalledWith(0.75);
    });

    it('loads devices and selects active device from popover', () => {
      vi.mocked(usePlayerStore).mockReturnValue(
        buildState({
          activeDeviceId: 'device-2',
          playbackDevices: [
            {
              deviceId: 'device-1',
              deviceName: 'Chrome',
              deviceIcon: 'desktop',
              isActive: false,
              isCurrentDevice: false,
              updatedAt: new Date().toISOString(),
            },
            {
              deviceId: 'device-2',
              deviceName: 'Firefox',
              deviceIcon: 'desktop',
              isActive: true,
              isCurrentDevice: true,
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      );

      customRender(<PlayerActions />);
      const volumeBtn = screen.getByRole('button', { name: /volume/i });
      fireEvent.click(volumeBtn);

      expect(playbackSync.listPlaybackDevices).toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /Chrome/i }));
      expect(playbackSync.setActivePlaybackDevice).toHaveBeenCalledWith('device-1');
    });

    it('does not list devices when popover closes', () => {
      customRender(<PlayerActions />);
      const openBtn = screen.getByText('Open Popover');
      const closeBtn = screen.getByText('Close Popover');

      // Open
      fireEvent.click(openBtn);
      expect(playbackSync.listPlaybackDevices).toHaveBeenCalledTimes(1);

      // Close
      fireEvent.click(closeBtn);
      expect(playbackSync.listPlaybackDevices).toHaveBeenCalledTimes(1);
    });

    it('renders empty devices state', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ playbackDevices: [] }));
      customRender(<PlayerActions />);
      expect(screen.getByText('No devices connected')).toBeInTheDocument();
    });
  });

  describe('audio quality selection', () => {
    it('handles auto quality selection', () => {
      customRender(<PlayerActions />);
      const autoItem = screen.getByRole('menuitemcheckbox', { name: /Auto/i });
      fireEvent.click(autoItem);
      expect(setQuality).toHaveBeenCalledWith('auto');
    });

    it('handles lossless quality selection', () => {
      customRender(<PlayerActions />);
      const losslessItem = screen.getByRole('menuitemcheckbox', { name: /Lossless/i });
      fireEvent.click(losslessItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.lossless);
    });

    it('handles high quality selection', () => {
      customRender(<PlayerActions />);
      const highItem = screen.getByRole('menuitemcheckbox', { name: /High/i });
      fireEvent.click(highItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.high);
    });

    it('handles standard quality selection', () => {
      customRender(<PlayerActions />);
      const standardItem = screen.getByRole('menuitemcheckbox', { name: /Standard/i });
      fireEvent.click(standardItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.standard);
    });

    it('handles low quality selection', () => {
      customRender(<PlayerActions />);
      const lowItem = screen.getByRole('menuitemcheckbox', { name: /Low/i });
      fireEvent.click(lowItem);
      expect(setQuality).toHaveBeenCalledWith(StreamAudioQuality.low);
    });

    it('does not set quality if requested quality is unavailable', () => {
      vi.mocked(usePlayerStore).mockReturnValue(buildState({ availableQualities: ['auto'] }));

      customRender(<PlayerActions />);
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
