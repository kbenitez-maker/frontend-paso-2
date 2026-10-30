import type { DateFieldValue } from '@lafise/onyx-ui';
import type { ControlProps } from '../lib';

import { parseDate, toCalendarDate } from '@internationalized/date';
import { useTranslations } from 'next-intl';

// `@lafise/onyx-ui/date-time/*` points at a misspelled folder in the package's exports map, so the root entry is the only way in.
import {
  Calendar,
  CalendarBody,
  CalendarControls,
  DateField,
} from '@lafise/onyx-ui';

import { FieldLabel } from '../field-label';

/** ISO `YYYY-MM-DD` to the picker's date; `null` for anything that is not one. */
const toPickerDate = (iso: string | undefined) => {
  if (iso === undefined) return null;
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
};

/** Picker value back to ISO; ranges never come from a single-date calendar. */
const toIso = (value: DateFieldValue | null): string | undefined =>
  value === null || 'start' in value ?
    undefined
  : toCalendarDate(value).toString();

/** Date field stored as an ISO date string, as the contract's DTOs expect. */
const DateInput = ({
  label,
  value,
  onChange,
  isRequired,
  isDisabled,
  isInvalid,
}: Readonly<ControlProps<string>>) => {
  const t = useTranslations('Form.placeholder');

  return (
    <DateField
      value={toPickerDate(value)}
      onChange={(next) => {
        onChange(toIso(next));
      }}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      placeholder={t('date')}
    >
      <FieldLabel label={label} isRequired={isRequired} />
      <DateField.Trigger size='lg' />
      <DateField.Panel>
        <DateField.Calendar>
          <Calendar.Header>
            <Calendar.Controls>
              <CalendarControls.Previous />
              <CalendarControls.MonthPicker />
              <CalendarControls.YearPicker />
              <CalendarControls.Next />
            </Calendar.Controls>
          </Calendar.Header>
          <Calendar.Body>
            <CalendarBody.DaysOfWeek />
            <CalendarBody.Days />
          </Calendar.Body>
        </DateField.Calendar>
        <DateField.Actions>
          <DateField.ClearAction />
          <DateField.ApplyAction />
        </DateField.Actions>
      </DateField.Panel>
    </DateField>
  );
};

export { DateInput, toIso, toPickerDate };
