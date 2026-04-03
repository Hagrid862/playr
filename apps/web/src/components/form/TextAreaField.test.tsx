import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextAreaField } from './TextAreaField';

function getDefaultProps() {
  return {
    label: 'Description',
    placeholder: 'Enter description',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };
}

describe('TextAreaField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label and placeholder', () => {
      customRender(<TextAreaField {...getDefaultProps()} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('renders value', () => {
      customRender(<TextAreaField {...getDefaultProps()} value="Initial value" />);

      const textarea = screen.getByPlaceholderText('Enter description');
      expect(textarea).toHaveValue('Initial value');
    });

    it('does not render error message when error is not provided', () => {
      customRender(<TextAreaField {...getDefaultProps()} />);

      expect(screen.queryByText(/Field is required/)).not.toBeInTheDocument();
    });
  });

  describe('user input', () => {
    it('calls onChange when value changes', () => {
      const onChange = vi.fn();
      customRender(<TextAreaField {...getDefaultProps()} onChange={onChange} />);

      const textarea = screen.getByPlaceholderText('Enter description');
      fireEvent.change(textarea, { target: { value: 'New content' } });

      expect(onChange).toHaveBeenCalledWith('New content');
    });

    it('calls onBlur when blurred', () => {
      const onBlur = vi.fn();
      customRender(<TextAreaField {...getDefaultProps()} onBlur={onBlur} />);

      const textarea = screen.getByPlaceholderText('Enter description');
      fireEvent.blur(textarea);

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('renders error message and applies error classes', () => {
      customRender(<TextAreaField {...getDefaultProps()} error="Field is required" />);

      expect(screen.getByText('Field is required')).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Enter description');
      expect(textarea).toHaveClass('border-destructive');
    });
  });
});
