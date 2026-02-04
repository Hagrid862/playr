import { DatePickerField } from './DatePickerField';
import { SelectField } from './SelectField';
import { TextField } from './TextField';

export { DatePickerField, SelectField, TextField };

// Executable export for coverage
export const FormFields = {
  TextField,
  DatePickerField,
  SelectField,
} as const;
