import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileField } from './FileField';

function getDefaultProps() {
  return {
    label: 'Upload File',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };
}

describe('FileField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders with label and optional placeholder and accept', () => {
      customRender(<FileField {...getDefaultProps()} placeholder="Select file" accept="image/*" />);
      expect(screen.getByLabelText('Upload File')).toBeInTheDocument();
    });

    it('renders error state', () => {
      customRender(<FileField {...getDefaultProps()} error="File too large" />);
      expect(screen.getByText('File too large')).toBeInTheDocument();

      const input = screen.getByLabelText('Upload File');
      expect(input.className).toContain('border-destructive');
    });

    it('renders clear button when showClearButton and value are set', () => {
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      customRender(
        <FileField {...getDefaultProps()} onChange={onChange} showClearButton value={file} />,
      );

      expect(screen.getByRole('button', { name: /Clear file/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  describe('change and blur', () => {
    it('calls onChange when a file is selected', () => {
      const props = getDefaultProps();
      customRender(<FileField {...props} />);
      const input = screen.getByLabelText('Upload File');

      const file = new File(['hello'], 'hello.png', { type: 'image/png' });

      fireEvent.change(input, { target: { files: [file] } });
      expect(props.onChange).toHaveBeenCalledWith(file);
    });

    it('calls onChange with null when no file is selected', () => {
      const onChange = vi.fn();
      customRender(<FileField {...getDefaultProps()} onChange={onChange} />);
      const input = screen.getByLabelText('Upload File');

      fireEvent.change(input, { target: { files: [] } });
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('calls onBlur when input loses focus', () => {
      const props = getDefaultProps();
      customRender(<FileField {...props} />);
      const input = screen.getByLabelText('Upload File');

      fireEvent.blur(input);
      expect(props.onBlur).toHaveBeenCalledTimes(1);
    });

    it('does not call onChange when selection cleared but value exists', () => {
      const onChange = vi.fn();
      const existingFile = new File(['existing'], 'existing.png', { type: 'image/png' });
      customRender(<FileField {...getDefaultProps()} onChange={onChange} value={existingFile} />);

      const input = screen.getByLabelText('Upload File');

      fireEvent.change(input, { target: { files: [] } });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('clear behavior', () => {
    it('uses inputRef when provided to reset native input value', () => {
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      const inputRef = { current: null as HTMLInputElement | null };
      customRender(
        <FileField
          {...getDefaultProps()}
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

    it('falls back to getElementById when inputRef is not provided', () => {
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      customRender(
        <FileField {...getDefaultProps()} onChange={onChange} showClearButton value={file} />,
      );

      const input = screen.getByLabelText('Upload File') as HTMLInputElement;
      const valueSetterSpy = vi.spyOn(input, 'value', 'set');

      fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));

      expect(onChange).toHaveBeenCalledWith(null);
      expect(valueSetterSpy).toHaveBeenCalledWith('');
    });

    it('handles getElementById returning null after input is removed', () => {
      const onChange = vi.fn();
      const file = new File(['hello'], 'hello.png', { type: 'image/png' });
      customRender(
        <FileField {...getDefaultProps()} onChange={onChange} showClearButton value={file} />,
      );

      const input = screen.getByLabelText('Upload File');
      input.remove();

      fireEvent.click(screen.getByRole('button', { name: /Clear file/i }));

      expect(onChange).toHaveBeenCalledWith(null);
    });
  });
});
