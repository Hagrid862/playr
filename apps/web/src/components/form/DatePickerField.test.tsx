import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { DatePickerField } from './DatePickerField';

describe('DatePickerField', () => {
  const defaultProps = {
    label: 'Birth Date',
    value: undefined,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };

  it('renders label correctly', () => {
    render(<DatePickerField {...defaultProps} />);
    expect(screen.getByText('Birth Date')).toBeInTheDocument();
  });

  it('renders placeholder when no value is provided', () => {
    render(<DatePickerField {...defaultProps} />);
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('renders formatted date when value is provided', () => {
    const date = new Date(2000, 0, 1);
    render(<DatePickerField {...defaultProps} value={date} />);
    expect(screen.getByText(format(date, 'PPP'))).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    render(<DatePickerField {...defaultProps} error="Date is required" />);
    expect(screen.getByText('Date is required')).toBeInTheDocument();
  });

  it('opens calendar and selects a date', async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(<DatePickerField {...defaultProps} onChange={onChange} onBlur={onBlur} />);

    const trigger = screen.getByRole('button', { name: /pick a date/i });
    fireEvent.click(trigger);

    // The calendar should be visible now.
    // In JSDOM, clicking a day on the calendar:
    // We can look for a button with a specific day number.
    // The shadcn calendar usually uses 'rdp-day' or similar, but we can search by text.
    const dayButton = screen.getByText('15');
    fireEvent.click(dayButton);

    expect(onChange).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it('calls onBlur when trigger loses focus', () => {
    const onBlur = vi.fn();
    render(<DatePickerField {...defaultProps} onBlur={onBlur} />);

    const trigger = screen.getByRole('button', { name: /pick a date/i });
    fireEvent.blur(trigger);

    expect(onBlur).toHaveBeenCalled();
  });
});
