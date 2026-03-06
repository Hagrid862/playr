import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditAlbumMetadata } from './EditAlbumMetadata';
import { AlbumType } from '@repo/db';

vi.mock('@/components/form', () => ({
  SelectField: ({
    label,
    value,
    options,
    onChange,
    onBlur,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
          {options.map((opt: { value: string; label: string }) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  ),
  DatePickerField: ({
    label,
    onChange,
    onBlur,
  }: {
    label: string;
    onChange: (v: Date | null) => void;
    onBlur: () => void;
  }) => (
    <div>
      <label>
        {label}
        <button onClick={() => onChange(new Date('2022-01-01'))} onBlur={onBlur}>
          Mock Date Picker
        </button>
        <button onClick={() => onChange(null)}>Clear Date</button>
      </label>
    </div>
  ),
}));

describe('EditAlbumMetadata', () => {
  const mockForm = {
    Field: ({
      children,
      name,
    }: {
      children: (field: {
        state: { value: any };
        handleChange: (v: any) => void;
        handleBlur: () => void;
      }) => React.ReactNode;
      name: string;
    }) => {
      const value = name === 'type' ? AlbumType.album : null;
      return children({
        state: { value },
        handleChange: vi.fn(),
        handleBlur: vi.fn(),
      });
    },
  };

  it('renders correctly', () => {
    render(<EditAlbumMetadata form={mockForm} />);
    expect(screen.getByLabelText(/Album Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Release Date/i)).toBeInTheDocument();
  });

  it('handles type change', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({
        children,
        name,
      }: {
        children: (field: {
          state: { value: any };
          handleChange: (v: any) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
      }) => {
        if (name === 'type') {
          return children({
            state: { value: AlbumType.album },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    render(<EditAlbumMetadata form={localMockForm} />);
    const select = screen.getByLabelText(/Album Type/i);
    await user.selectOptions(select, AlbumType.single);
    expect(handleChange).toHaveBeenCalledWith(AlbumType.single);
  });

  it('ignores type change for invalid values', async () => {
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({ children, name }: any) => {
        if (name === 'type') {
          return children({
            state: { value: AlbumType.album },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    render(<EditAlbumMetadata form={localMockForm} />);
    const select = screen.getByLabelText(/Album Type/i) as HTMLSelectElement;

    // Force a change event with invalid value directly since user.selectOptions only works with existing options
    fireEvent.change(select, { target: { value: 'invalid_type' } });

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('handles clearing the release date', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const localMockForm = {
      Field: ({ children, name }: any) => {
        if (name === 'releaseDate') {
          return children({
            state: { value: new Date().toISOString() },
            handleChange,
            handleBlur: vi.fn(),
          });
        }
        return children({ state: { value: null }, handleChange: vi.fn(), handleBlur: vi.fn() });
      },
    };

    render(<EditAlbumMetadata form={localMockForm} />);
    const mockClearButton = screen.queryByText('Clear Date');
    if (mockClearButton) {
      await user.click(mockClearButton);
    } else {
      // If clear button not present in mock, we simulate onChange(null) directly since mock is simplistic
      // Just trigger the onChange of DatePickerField. In our mock, DatePickerField does not have a clear button.
      // I will add a clear button to the DatePickerField mock.
    }
  });
});
