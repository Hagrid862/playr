import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextField } from './TextField';

function getDefaultProps() {
  return {
    label: 'Username',
    placeholder: 'Enter username',
    value: '',
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };
}

describe('TextField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label and placeholder', () => {
      customRender(<TextField {...getDefaultProps()} />);

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });

    it('renders value', () => {
      customRender(<TextField {...getDefaultProps()} value="john_doe" />);

      const input = screen.getByPlaceholderText('Enter username');
      expect(input).toHaveValue('john_doe');
    });

    it('uses provided type', () => {
      customRender(<TextField {...getDefaultProps()} type="password" />);

      const input = screen.getByPlaceholderText('Enter username');
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('user input', () => {
    it('calls onChange when value changes', () => {
      const onChange = vi.fn();
      customRender(<TextField {...getDefaultProps()} onChange={onChange} />);

      const input = screen.getByPlaceholderText('Enter username');
      fireEvent.change(input, { target: { value: 'new_username' } });

      expect(onChange).toHaveBeenCalledWith('new_username');
    });

    it('calls onBlur when blurred', () => {
      const onBlur = vi.fn();
      customRender(<TextField {...getDefaultProps()} onBlur={onBlur} />);

      const input = screen.getByPlaceholderText('Enter username');
      fireEvent.blur(input);

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('renders error message and applies error classes', () => {
      customRender(<TextField {...getDefaultProps()} error="Invalid username" />);

      expect(screen.getByText('Invalid username')).toBeInTheDocument();

      const input = screen.getByPlaceholderText('Enter username');
      expect(input).toHaveClass('border-destructive');
    });
  });
});
