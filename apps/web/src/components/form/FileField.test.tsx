import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileField } from './FileField';

describe('FileField', () => {
  const defaultProps = {
    label: 'Upload File',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

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

  it('renders clear button when showClearButton and value are set', () => {
    const onChange = vi.fn();
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    render(
      <FileField
        {...defaultProps}
        onChange={onChange}
        showClearButton
        value={file}
      />,
    );

    expect(screen.getByRole('button', { name: /Clear file/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('handleClear uses inputRef when provided', () => {
    const onChange = vi.fn();
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const inputRef = { current: null as HTMLInputElement | null };
    render(
      <FileField
        {...defaultProps}
        onChange={onChange}
        showClearButton
        value={file}
        inputRef={inputRef}
      />,
    );

    const input = screen.getByLabelText('Upload File') as HTMLInputElement;
    inputRef.current = input;
    const valueSetterSpy = vi.spyOn(input, 'value', 'set');

    fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(valueSetterSpy).toHaveBeenCalledWith('');
  });

  it('handleClear falls back to getElementById when inputRef is not provided', () => {
    const onChange = vi.fn();
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    render(
      <FileField
        {...defaultProps}
        onChange={onChange}
        showClearButton
        value={file}
      />,
    );

    const input = screen.getByLabelText('Upload File') as HTMLInputElement;
    const valueSetterSpy = vi.spyOn(input, 'value', 'set');

    fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(valueSetterSpy).toHaveBeenCalledWith('');
  });

  it('handleClear handles getElementById returning null', () => {
    const onChange = vi.fn();
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    render(
      <FileField
        {...defaultProps}
        onChange={onChange}
        showClearButton
        value={file}
      />,
    );

    const input = screen.getByLabelText('Upload File');
    input.remove();

    fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('onChange restores files when selection cleared but value exists', () => {
    const onChange = vi.fn();
    const existingFile = new File(['existing'], 'existing.png', { type: 'image/png' });
    render(<FileField {...defaultProps} onChange={onChange} value={existingFile} />);

    const input = screen.getByLabelText('Upload File');

    fireEvent.change(input, { target: { files: [] } });

    expect(onChange).not.toHaveBeenCalled();
  });
});
