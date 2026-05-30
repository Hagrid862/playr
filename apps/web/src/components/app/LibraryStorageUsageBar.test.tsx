import type { GetLibraryStorageUsageResponse } from '@repo/contracts';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryStorageUsageBar } from './LibraryStorageUsageBar';

const authState = { isAuthenticated: true };

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

vi.mock('@/hooks/api/library/useLibraryStorageUsage', () => ({
  useLibraryStorageUsage: vi.fn(),
}));

import { useLibraryStorageUsage } from '@/hooks/api/library/useLibraryStorageUsage';

const mockUseLibraryStorageUsage = vi.mocked(useLibraryStorageUsage);

const successUsageData: GetLibraryStorageUsageResponse = {
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
};

function mockStorageUsageQuery(
  overrides: Partial<ReturnType<typeof useLibraryStorageUsage>> = {},
): ReturnType<typeof useLibraryStorageUsage> {
  return {
    data: successUsageData,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useLibraryStorageUsage>;
}

describe('LibraryStorageUsageBar', () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    vi.clearAllMocks();
  });

  it('renders used and limit labels', () => {
    mockUseLibraryStorageUsage.mockReturnValue(mockStorageUsageQuery());

    render(<LibraryStorageUsageBar />);

    expect(screen.getByTestId('library-storage-usage')).toBeInTheDocument();
    expect(screen.getByText('2 GB of 5 GB')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('returns null when the user is not authenticated', () => {
    authState.isAuthenticated = false;
    mockUseLibraryStorageUsage.mockReturnValue(mockStorageUsageQuery({ isLoading: true }));

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
    expect(mockUseLibraryStorageUsage).toHaveBeenCalledWith({ enabled: false });
  });

  it('renders a loading skeleton while usage is loading', () => {
    mockUseLibraryStorageUsage.mockReturnValue(
      mockStorageUsageQuery({ data: undefined, isLoading: true }),
    );

    render(<LibraryStorageUsageBar />);

    expect(screen.getByTestId('library-storage-usage-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('library-storage-usage')).not.toBeInTheDocument();
  });

  it('returns null when the usage query fails', () => {
    mockUseLibraryStorageUsage.mockReturnValue(
      mockStorageUsageQuery({ data: undefined, isError: true }),
    );

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when the usage response is unsuccessful', () => {
    mockUseLibraryStorageUsage.mockReturnValue(
      mockStorageUsageQuery({
        data: {
          ...successUsageData,
          success: false,
          data: undefined,
        },
      }),
    );

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when usage payload is missing', () => {
    mockUseLibraryStorageUsage.mockReturnValue(
      mockStorageUsageQuery({
        data: {
          ...successUsageData,
          data: undefined,
        },
      }),
    );

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
  });
});
