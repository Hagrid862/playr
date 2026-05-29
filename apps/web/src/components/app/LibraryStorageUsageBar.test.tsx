import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LibraryStorageUsageBar } from './LibraryStorageUsageBar';

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
    selector({ isAuthenticated: true }),
}));

vi.mock('@/hooks/api/library/useLibraryStorageUsage', () => ({
  useLibraryStorageUsage: vi.fn(),
}));

import { useLibraryStorageUsage } from '@/hooks/api/library/useLibraryStorageUsage';

const mockUseLibraryStorageUsage = vi.mocked(useLibraryStorageUsage);

describe('LibraryStorageUsageBar', () => {
  it('renders used and limit labels', () => {
    mockUseLibraryStorageUsage.mockReturnValue({
      data: {
        success: true,
        data: {
          usedBytes: 2 * 1024 ** 3,
          limitBytes: 5 * 1024 ** 3,
          remainingBytes: 3 * 1024 ** 3,
          usedPercent: 40,
          limitSource: 'default',
        },
        error: null,
        meta: {
          timestamp: '2026-01-01T00:00:00.000Z',
          requestId: 'req-1',
          path: '/library/storage-usage',
        },
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useLibraryStorageUsage>);

    render(<LibraryStorageUsageBar />);

    expect(screen.getByTestId('library-storage-usage')).toBeInTheDocument();
    expect(screen.getByText('2 GB of 5 GB')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
