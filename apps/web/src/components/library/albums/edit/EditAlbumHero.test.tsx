import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EditAlbumHero } from './EditAlbumHero';

vi.mock('@/components/form', () => ({
  TextField: ({
    label,
    value,
    onChange,
    onBlur,
    error,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    error?: string;
  }) => (
    <div>
      <label>
        {label}
        <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
  TextAreaField: ({
    label,
    value,
    onChange,
    onBlur,
    error,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    onBlur: () => void;
    error?: string;
  }) => (
    <div>
      <label>
        {label}
        <textarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </label>
      {error && <span>{error}</span>}
    </div>
  ),
}));

describe('EditAlbumHero', () => {
  const mockForm = {
    Field: ({
      children,
      name,
    }: {
      children: (field: {
        state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
        name: string;
        handleChange: (v: string) => void;
        handleBlur: () => void;
      }) => React.ReactNode;
      name: string;
    }) =>
      children({
        state: { value: '', meta: { isTouched: false, errors: [] } },
        name,
        handleChange: vi.fn(),
        handleBlur: vi.fn(),
      }),
    state: { errors: [] },
  };

  const defaultProps = {
    form: mockForm,
    albumName: 'Test Album',
    onCoverClick: vi.fn(),
    onRemoveCover: vi.fn(),
  };

  it('renders correctly', () => {
    render(<EditAlbumHero {...defaultProps} />);
    expect(screen.getByLabelText(/Album Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByText(/Artwork/i)).toBeInTheDocument();
  });

  it('shows cover preview and remove button when currentCoverUrl is provided', () => {
    render(<EditAlbumHero {...defaultProps} currentCoverUrl="mock-url" />);
    expect(screen.getByAltText('Test Album')).toHaveAttribute('src', 'mock-url');
    expect(screen.getByRole('button', { name: /Remove/i })).toBeInTheDocument();
  });

  it('calls onCoverClick when cover area is clicked', async () => {
    const user = userEvent.setup();
    render(<EditAlbumHero {...defaultProps} />);
    await user.click(screen.getByText(/Upload Cover/i));
    expect(defaultProps.onCoverClick).toHaveBeenCalled();
  });

  it('calls onRemoveCover when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditAlbumHero {...defaultProps} currentCoverUrl="mock-url" />);
    await user.click(screen.getByRole('button', { name: /Remove/i }));
    expect(defaultProps.onRemoveCover).toHaveBeenCalled();
  });

  it('shows error message when description exceeds 2048 characters', () => {
    const mockFormWithValidator = {
      ...defaultProps.form,
      Field: ({
        children,
        name,
        validators,
      }: {
        children: (field: {
          state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
          name: string;
          handleChange: (v: string) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
        validators?: { onChange?: (args: { value: string }) => string | undefined };
      }) => {
        let errorMsg;
        if (name === 'description' && validators?.onChange) {
          errorMsg = validators.onChange({ value: 'a'.repeat(2049) });
        }
        return children({
          state: { value: '', meta: { isTouched: true, errors: [errorMsg] } },
          name,
          handleChange: vi.fn(),
          handleBlur: vi.fn(),
        });
      },
      state: { errors: [] },
    };

    render(<EditAlbumHero {...defaultProps} form={mockFormWithValidator} />);
    expect(screen.getByText('Description must be 2048 characters or less')).toBeInTheDocument();
  });

  it('does not show error message when description is under 2048 characters', () => {
    const mockFormWithValidator = {
      ...defaultProps.form,
      Field: ({
        children,
        name,
        validators,
      }: {
        children: (field: {
          state: { value: string; meta: { isTouched: boolean; errors: unknown[] } };
          name: string;
          handleChange: (v: string) => void;
          handleBlur: () => void;
        }) => React.ReactNode;
        name: string;
        validators?: { onChange?: (args: { value: string }) => string | undefined };
      }) => {
        let errorMsg;
        if (name === 'description' && validators?.onChange) {
          errorMsg = validators.onChange({ value: 'valid description' });
        }
        return children({
          state: { value: '', meta: { isTouched: true, errors: [errorMsg] } },
          name,
          handleChange: vi.fn(),
          handleBlur: vi.fn(),
        });
      },
      state: { errors: [] },
    };

    render(<EditAlbumHero {...defaultProps} form={mockFormWithValidator} />);
    expect(
      screen.queryByText('Description must be 2048 characters or less'),
    ).not.toBeInTheDocument();
    // Assuming error is undefined, it won't render any span or text about it.
  });
});
