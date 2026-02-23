import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileField } from './FileField';

describe('FileField', () => {
  const defaultProps = {
    label: 'Upload File',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  it('renders correctly', () => {
    render(<FileField {...defaultProps} placeholder="Select file" accept="image/*" />);
    expect(screen.getByLabelText('Upload File')).toBeInTheDocument();
  });

  it('calls onChange when a file is selected', () => {
    render(<FileField {...defaultProps} />);
    const input = screen.getByLabelText('Upload File');

    const file = new File(['hello'], 'hello.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });
    expect(defaultProps.onChange).toHaveBeenCalledWith(file);
  });

  it('calls onChange with null when no file is selected', () => {
    const onChange = vi.fn();
    render(<FileField {...defaultProps} onChange={onChange} />);
    const input = screen.getByLabelText('Upload File');

    fireEvent.change(input, { target: { files: [] } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('calls onBlur when input loses focus', () => {
    render(<FileField {...defaultProps} />);
    const input = screen.getByLabelText('Upload File');

    fireEvent.blur(input);
    expect(defaultProps.onBlur).toHaveBeenCalledTimes(1);
  });

  it('renders error state correctly', () => {
    render(<FileField {...defaultProps} error="File too large" />);
    expect(screen.getByText('File too large')).toBeInTheDocument();
    
    const input = screen.getByLabelText('Upload File');
    expect(input.className).toContain('border-destructive');
  });
});
