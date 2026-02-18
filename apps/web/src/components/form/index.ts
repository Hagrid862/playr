import { DatePickerField } from './DatePickerField';
import { FileField } from './FileField';
import { SelectField } from './SelectField';
import { TextAreaField } from './TextAreaField';
import { TextField } from './TextField';

export { DatePickerField, FileField, SelectField, TextAreaField, TextField };

// Executable export for coverage
export const FormFields = {
  TextField,
  DatePickerField,
  SelectField,
} as const;
