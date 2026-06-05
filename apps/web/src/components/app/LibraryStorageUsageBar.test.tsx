import { ApiFailureResponseSchema, type GetLibraryStorageUsageResponse } from '@repo/contracts';
import { render, screen } from '@testing-library/react';
import type { z } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryStorageUsageBar } from './LibraryStorageUsageBar';

type ApiFailureResponse = z.infer<typeof ApiFailureResponseSchema>;
type StorageUsageQueryData = GetLibraryStorageUsageResponse | ApiFailureResponse;
type MalformedSuccessUsageData = Omit<GetLibraryStorageUsageResponse, 'data'> & {
  data: undefined;
};

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

const failedUsageData: ApiFailureResponse = {
  success: false,
  data: null,
  error: { statusCode: 500, message: 'Failed to load storage usage' },
  meta: {
    timestamp: '2026-01-01T00:00:00.000Z',
    requestId: 'req-2',
    path: '/library/storage-usage',
  },
};

const missingPayloadUsageData: MalformedSuccessUsageData = {
  ...successUsageData,
  data: undefined,
};

function mockStorageUsageQuery(
  overrides: Partial<Omit<ReturnType<typeof useLibraryStorageUsage>, 'data'>> & {
    data?: StorageUsageQueryData | MalformedSuccessUsageData;
  } = {},
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
        data: failedUsageData,
      }),
    );

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when usage payload is missing', () => {
    mockUseLibraryStorageUsage.mockReturnValue(
      mockStorageUsageQuery({
        data: missingPayloadUsageData,
      }),
    );

    const { container } = render(<LibraryStorageUsageBar />);

    expect(container).toBeEmptyDOMElement();
  });
});
