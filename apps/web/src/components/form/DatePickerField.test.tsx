import { customRender } from '@repo/testing';
import { fireEvent, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatePickerField } from './DatePickerField';

function getDefaultProps() {
  return {
    label: 'Birth Date',
    value: undefined as Date | undefined,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };
}

describe('DatePickerField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label', () => {
      customRender(<DatePickerField {...getDefaultProps()} />);
      expect(screen.getByText('Birth Date')).toBeInTheDocument();
    });

    it('renders placeholder when no value is provided', () => {
      customRender(<DatePickerField {...getDefaultProps()} />);
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });

    it('renders formatted date when value is provided', () => {
      const date = new Date(2000, 0, 1);
      customRender(<DatePickerField {...getDefaultProps()} value={date} />);
      expect(screen.getByText(format(date, 'PPP'))).toBeInTheDocument();
    });

    it('renders error message when error prop is provided', () => {
      customRender(<DatePickerField {...getDefaultProps()} error="Date is required" />);
      expect(screen.getByText('Date is required')).toBeInTheDocument();
    });
  });

  describe('calendar interaction', () => {
    it('opens calendar and selects a date', async () => {
      const onChange = vi.fn();
      const onBlur = vi.fn();
      customRender(<DatePickerField {...getDefaultProps()} onChange={onChange} onBlur={onBlur} />);

      const trigger = screen.getByRole('button', { name: /pick a date/i });
      fireEvent.click(trigger);

      const dayButton = screen.getByText('15');
      fireEvent.click(dayButton);

      expect(onChange).toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('user input', () => {
    it('calls onBlur when trigger loses focus', () => {
      const onBlur = vi.fn();
      customRender(<DatePickerField {...getDefaultProps()} onBlur={onBlur} />);

      const trigger = screen.getByRole('button', { name: /pick a date/i });
      fireEvent.blur(trigger);

      expect(onBlur).toHaveBeenCalled();
    });
  });
});
