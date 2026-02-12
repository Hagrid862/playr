import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextAreaField } from './TextAreaField';

describe('TextAreaField', () => {
  const defaultProps = {
    label: 'Description',
    placeholder: 'Enter description',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  it('renders correctly with label and placeholder', () => {
    render(<TextAreaField {...defaultProps} />);

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('renders value correctly', () => {
    render(<TextAreaField {...defaultProps} value="Initial value" />);

    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toHaveValue('Initial value');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<TextAreaField {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText('Enter description');
    fireEvent.change(textarea, { target: { value: 'New content' } });

    expect(onChange).toHaveBeenCalledWith('New content');
  });

  it('calls onBlur when blurred', () => {
    const onBlur = vi.fn();
    render(<TextAreaField {...defaultProps} onBlur={onBlur} />);

    const textarea = screen.getByPlaceholderText('Enter description');
    fireEvent.blur(textarea);

    expect(onBlur).toHaveBeenCalled();
  });

  it('renders error message and applies error classes', () => {
    render(<TextAreaField {...defaultProps} error="Field is required" />);

    expect(screen.getByText('Field is required')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toHaveClass('border-destructive');
  });

  it('does not render error message when error is not provided', () => {
    render(<TextAreaField {...defaultProps} />);

    expect(screen.queryByText(/Field is required/)).not.toBeInTheDocument();
  });
});
