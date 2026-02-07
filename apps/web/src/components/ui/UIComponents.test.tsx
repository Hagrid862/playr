import { createMock } from '@golevelup/ts-vitest';
import { render, screen } from '@testing-library/react';
import type { CalendarDay } from 'react-day-picker';
import { describe, expect, it } from 'vitest';
import * as FormComponents from '../form';
import { Button } from './button';
import { Calendar, CalendarDayButton } from './calendar';
import * as CardComponents from './card';
import * as FieldComponents from './field';
import { Input } from './input';
import { Label } from './label';
import * as PopoverComponents from './popover';
import * as SelectComponents from './select';
import { Separator } from './separator';

describe('UI Components Coverage', () => {
  it('exercises form index', () => {
    expect(FormComponents.FormFields).toBeDefined();
    expect(FormComponents.TextField).toBeDefined();
    expect(FormComponents.DatePickerField).toBeDefined();
    expect(FormComponents.SelectField).toBeDefined();
  });

  describe('Card Components', () => {
    it('renders all card parts', () => {
      render(
        <CardComponents.Card>
          <CardComponents.CardHeader>
            <CardComponents.CardTitle>Title</CardComponents.CardTitle>
            <CardComponents.CardDescription>Description</CardComponents.CardDescription>
            <CardComponents.CardAction>Action</CardComponents.CardAction>
          </CardComponents.CardHeader>
          <CardComponents.CardContent>Content</CardComponents.CardContent>
          <CardComponents.CardFooter>Footer</CardComponents.CardFooter>
        </CardComponents.Card>,
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });

  describe('Field Components', () => {
    it('renders all field parts and variants', () => {
      render(
        <FieldComponents.FieldGroup>
          <FieldComponents.FieldSet>
            <FieldComponents.FieldLegend>Legend</FieldComponents.FieldLegend>
            <FieldComponents.FieldLegend variant="label">Label variant</FieldComponents.FieldLegend>
            <FieldComponents.FieldDescription>Group Description</FieldComponents.FieldDescription>

            <FieldComponents.Field orientation="horizontal">
              <FieldComponents.FieldLabel>Label</FieldComponents.FieldLabel>
              <FieldComponents.FieldTitle>Title</FieldComponents.FieldTitle>
              <FieldComponents.FieldContent>
                <Input />
                <FieldComponents.FieldDescription>Description</FieldComponents.FieldDescription>
              </FieldComponents.FieldContent>
              <FieldComponents.FieldError>Error message</FieldComponents.FieldError>
            </FieldComponents.Field>

            <FieldComponents.FieldSeparator>Separator Content</FieldComponents.FieldSeparator>
            <FieldComponents.FieldSeparator />

            <FieldComponents.Field orientation="responsive">
              <FieldComponents.FieldContent>Content</FieldComponents.FieldContent>
            </FieldComponents.Field>
          </FieldComponents.FieldSet>
        </FieldComponents.FieldGroup>,
      );
      expect(screen.getByText('Legend')).toBeInTheDocument();
      expect(screen.getByText('Label variant')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Separator Content')).toBeInTheDocument();
    });

    it('renders FieldError with multiple errors', () => {
      const errors = [
        { message: 'Error 1' },
        { message: 'Error 2' },
        { message: 'Error 1' }, // Duplicate, should be unique
      ];
      render(<FieldComponents.FieldError errors={errors} />);
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    it('renders FieldError with single error', () => {
      const errors = [{ message: 'Single error' }];
      render(<FieldComponents.FieldError errors={errors} />);
      expect(screen.getByText('Single error')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });

    it('renders FieldError with no errors', () => {
      render(<FieldComponents.FieldError errors={[]} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      render(<FieldComponents.FieldError />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Popover Components', () => {
    it('renders popover parts', () => {
      render(
        <PopoverComponents.Popover open={true}>
          <PopoverComponents.PopoverTrigger>Open</PopoverComponents.PopoverTrigger>
          <PopoverComponents.PopoverAnchor>Anchor</PopoverComponents.PopoverAnchor>
          <PopoverComponents.PopoverContent>
            <PopoverComponents.PopoverHeader>
              <PopoverComponents.PopoverTitle>Title</PopoverComponents.PopoverTitle>
              <PopoverComponents.PopoverDescription>
                Description
              </PopoverComponents.PopoverDescription>
            </PopoverComponents.PopoverHeader>
          </PopoverComponents.PopoverContent>
        </PopoverComponents.Popover>,
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('Select Components', () => {
    it('renders select parts', () => {
      render(
        <SelectComponents.Select open={true}>
          <SelectComponents.SelectTrigger>
            <SelectComponents.SelectValue placeholder="Select one" />
          </SelectComponents.SelectTrigger>
          <SelectComponents.SelectContent>
            <SelectComponents.SelectGroup>
              <SelectComponents.SelectLabel>Label</SelectComponents.SelectLabel>
              <SelectComponents.SelectItem value="1">Item 1</SelectComponents.SelectItem>
              <SelectComponents.SelectSeparator />
              <SelectComponents.SelectItem value="2">Item 2</SelectComponents.SelectItem>
            </SelectComponents.SelectGroup>
          </SelectComponents.SelectContent>
        </SelectComponents.Select>,
      );
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Calendar', () => {
    it('renders calendar and handles various states', () => {
      const today = new Date();
      render(<Calendar mode="single" selected={today} showWeekNumber />);
      // Just verify it renders something
      expect(screen.getByText(today.getDate().toString())).toBeInTheDocument();
    });

    it('renders calendar in range mode', () => {
      const from = new Date();
      const to = new Date();
      to.setDate(from.getDate() + 5);

      render(<Calendar mode="range" selected={{ from, to }} />);

      const dayFrom = screen.getAllByText(from.getDate().toString())[0].closest('button');
      expect(dayFrom).toBeInTheDocument();
    });

    it('exercises CalendarDayButton and Chevron branches', () => {
      const date = new Date();
      // Test direct DayButton renders to hit all branch logic
      render(
        <CalendarDayButton
          day={createMock<CalendarDay>({ date })}
          modifiers={{ focused: true, selected: true }}
        />,
      );
      render(
        <CalendarDayButton
          day={createMock<CalendarDay>({ date })}
          modifiers={{ selected: true, range_start: true }}
        />,
      );
      render(
        <CalendarDayButton
          day={createMock<CalendarDay>({ date })}
          modifiers={{ selected: true, range_end: true }}
        />,
      );
      render(
        <CalendarDayButton
          day={createMock<CalendarDay>({ date })}
          modifiers={{ selected: true, range_middle: true }}
        />,
      );
      render(
        <CalendarDayButton
          day={createMock<CalendarDay>({ date })}
          modifiers={{ selected: false }}
        />,
      );

      // Test dropdown layout for formatMonthDropdown
      render(
        <Calendar
          captionLayout="dropdown"
          startMonth={new Date(date.getFullYear(), 0)}
          endMonth={new Date(date.getFullYear(), 11)}
        />,
      );
    });
  });

  describe('Other basics', () => {
    it('renders Label, Input, Button, Separator', () => {
      render(
        <div>
          <Label>Label</Label>
          <Input />
          <Button>Click</Button>
          <Separator />
        </div>,
      );
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByText('Click')).toBeInTheDocument();
    });
  });
});
