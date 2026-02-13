import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

describe('TextField', () => {
  const defaultProps = {
    label: 'Username',
    placeholder: 'Enter username',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  it('renders correctly with label and placeholder', () => {
    render(<TextField {...defaultProps} />);

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('renders value correctly', () => {
    render(<TextField {...defaultProps} value="john_doe" />);

    const input = screen.getByPlaceholderText('Enter username');
    expect(input).toHaveValue('john_doe');
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(<TextField {...defaultProps} onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter username');
    fireEvent.change(input, { target: { value: 'new_username' } });

    expect(onChange).toHaveBeenCalledWith('new_username');
  });

  it('calls onBlur when blurred', () => {
    const onBlur = vi.fn();
    render(<TextField {...defaultProps} onBlur={onBlur} />);

    const input = screen.getByPlaceholderText('Enter username');
    fireEvent.blur(input);

    expect(onBlur).toHaveBeenCalled();
  });

  it('renders error message and applies error classes', () => {
    render(<TextField {...defaultProps} error="Invalid username" />);

    expect(screen.getByText('Invalid username')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter username');
    expect(input).toHaveClass('border-destructive');
  });

  it('uses provided type', () => {
    render(<TextField {...defaultProps} type="password" />);

    const input = screen.getByPlaceholderText('Enter username');
    expect(input).toHaveAttribute('type', 'password');
  });
});
