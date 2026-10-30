import { useTranslations } from 'next-intl';

import { Field } from '@lafise/onyx-ui/forms/field';

import { HelpTooltip } from '../help-tooltip';
import { fieldLabelTheme } from './themes';

interface FieldLabelProps {
  label: string;
  isRequired: boolean;
  /** Optional help text, already translated, shown next to the label. */
  tooltip?: string | undefined;
}

/** Label plus the "(Optional)" marker and optional help tooltip; the Onyx field it sits in provides the context. */
const FieldLabel = ({
  label,
  isRequired,
  tooltip,
}: Readonly<FieldLabelProps>) => {
  const t = useTranslations('Form');

  return (
    <div className={fieldLabelTheme()}>
      <Field.Label>{label}</Field.Label>
      {isRequired ? null : <Field.Hint>{t('optional')}</Field.Hint>}
      {tooltip === undefined || tooltip === '' ? null : (
        <HelpTooltip label={label} text={tooltip} />
      )}
    </div>
  );
};

export { FieldLabel, type FieldLabelProps };
