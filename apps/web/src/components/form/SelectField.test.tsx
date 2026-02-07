import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

// Mock Radix UI Select components if necessary, but usually standard DOM query works with JSDOM
// However, Radix Select uses portals and pointer events which can be tricky.
// For a unit test of *our* wrapper, we mainly want to ensure props are passed down correctly.

describe('SelectField', () => {
  const defaultProps = {
    label: 'Test Label',
    value: '',
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ],
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  it('renders label correctly', () => {
    render(<SelectField {...defaultProps} />);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    render(<SelectField {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders options when clicked', async () => {
    // We need to wrap in a way that handles Radix Portal if testing interaction deeply
    // But basic render check:
    render(<SelectField {...defaultProps} />);

    const trigger = screen.getByRole('combobox'); // Radix trigger is a combobox
    fireEvent.click(trigger); // Open the select

    // Radix UI renders content in a portal, typically appended to body
    expect(await screen.findByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('calls onChange and onBlur when an option is selected', async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(<SelectField {...defaultProps} onChange={onChange} onBlur={onBlur} />);

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    const option = await screen.findByText('Option 1');
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('opt1');
    expect(onBlur).toHaveBeenCalled();
  });
});
