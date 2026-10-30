import type { CatalogRef } from '@/contracts/types';
import type { BankId, CountryCode } from '@/types/domain';
import type { ControlProps } from '../lib';

import { useTranslations } from 'next-intl';

import { Refresh } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Select } from '@lafise/onyx-ui/forms/select';

import { FieldLabel } from '../field-label';
import { useCatalog } from '../hooks';
import { catalogSelectTheme } from './themes';

const { retry: retryStyle } = catalogSelectTheme();

interface CatalogSelectProps extends ControlProps<string> {
  bankId: BankId | undefined;
  catalog: CatalogRef;
  /** Value of the field this catalog depends on. */
  parentValue?: string | undefined;
  /** Country of a `country_from` catalog. */
  catalogCountry?: CountryCode | undefined;
}

/**
 * Select fed by a bank catalog. A dependent catalog stays disabled until its
 * parent has a value (the form clears it when the parent changes, see
 * `FormField`). If the catalog cannot be loaded the field is disabled and offers a retry; there is
 * no fallback list on purpose.
 */
const CatalogSelect = ({
  bankId,
  catalog,
  parentValue,
  catalogCountry,
  label,
  value,
  onChange,
  onBlur,
  isRequired,
  isDisabled,
  isInvalid,
}: Readonly<CatalogSelectProps>) => {
  const t = useTranslations('Form');
  const { options, isLoading, isWaitingParent, isUnavailable, retry } =
    useCatalog({
      bankId,
      catalog,
      parentValue,
      country: catalogCountry,
      selected: value,
    });

  let placeholder = t('placeholder.select');
  if (isUnavailable) placeholder = t('catalog.unavailable');
  else if (isWaitingParent) placeholder = t('catalog.waitingParent');
  else if (isLoading) placeholder = t('catalog.loading');
  else if (options.length === 0) placeholder = t('catalog.empty');

  return (
    <>
      <Select
        value={value ?? null}
        onChange={(key) => {
          onChange(key === null ? undefined : String(key));
        }}
        onBlur={onBlur}
        isDisabled={
          isDisabled || isUnavailable || isWaitingParent || options.length === 0
        }
        isInvalid={isInvalid}
        isRequired={isRequired}
        placeholder={placeholder}
      >
        <FieldLabel label={label} isRequired={isRequired} />
        <Select.Trigger size='lg' />
        <Select.Popover>
          <Select.List>
            {options.map((option) => (
              <Select.Item
                key={option.code}
                id={option.code}
                textValue={option.name}
              >
                {option.name}
              </Select.Item>
            ))}
          </Select.List>
        </Select.Popover>
      </Select>

      {isUnavailable ?
        <Button
          variant='outline'
          size='sm'
          className={retryStyle()}
          onPress={retry}
        >
          <Refresh size='sm' />
          {t('catalog.retry')}
        </Button>
      : null}
    </>
  );
};

export { CatalogSelect, type CatalogSelectProps };
