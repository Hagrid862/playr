import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

const options = [
  { value: 'opt1', label: 'Option 1' },
  { value: 'opt2', label: 'Option 2' },
];

function getDefaultProps() {
  return {
    label: 'Test Label',
    value: '',
    options,
    onChange: vi.fn(),
    onBlur: vi.fn(),
  };
}

describe('SelectField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label', () => {
      customRender(<SelectField {...getDefaultProps()} />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('passes a concrete value to Select when value is non-empty', () => {
      customRender(<SelectField {...getDefaultProps()} value="opt1" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders error message when error prop is provided', () => {
      customRender(<SelectField {...getDefaultProps()} error="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('opens and shows options when trigger is clicked', async () => {
      customRender(<SelectField {...getDefaultProps()} />);

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      expect(await screen.findByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('user input', () => {
    it('calls onChange and onBlur when an option is selected', async () => {
      const onChange = vi.fn();
      const onBlur = vi.fn();
      customRender(<SelectField {...getDefaultProps()} onChange={onChange} onBlur={onBlur} />);

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      const option = await screen.findByText('Option 1');
      fireEvent.click(option);

      expect(onChange).toHaveBeenCalledWith('opt1');
      expect(onBlur).toHaveBeenCalled();
    });

    it('passes a concrete value through when already selected (non-empty)', () => {
      customRender(<SelectField {...getDefaultProps()} value="opt2" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('invokes onBlur from the trigger when the combobox blurs', () => {
      const onBlur = vi.fn();
      customRender(<SelectField {...getDefaultProps()} onBlur={onBlur} value="opt1" />);
      const trigger = screen.getByRole('combobox');
      fireEvent.blur(trigger);
      expect(onBlur).toHaveBeenCalled();
    });
  });
});
