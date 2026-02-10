import { DatePickerField } from './DatePickerField';
import { SelectField } from './SelectField';
import { TextAreaField } from './TextAreaField';
import { TextField } from './TextField';

export { DatePickerField, SelectField, TextAreaField, TextField };

// Executable export for coverage
export const FormFields = {
  TextField,
  DatePickerField,
  SelectField,
} as const;
