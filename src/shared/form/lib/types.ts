import type { ReactNode } from 'react';

/** Values of a form built from registry fields: keys are field keys, answers are untyped until narrowed. */
type FormValues = Record<string, unknown>;

/** What every control of a form field receives; the control narrows `V` itself. */
interface ControlProps<V> {
  label: string;
  value: V | undefined;
  onChange: (value: V | undefined) => void;
  onBlur: () => void;
  isRequired: boolean;
  isDisabled: boolean;
  isInvalid: boolean;
  /** Leading icon of text inputs. */
  icon?: ReactNode;
}

export type { ControlProps, FormValues };
