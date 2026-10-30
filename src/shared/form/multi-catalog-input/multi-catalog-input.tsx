import type { CatalogRef } from '@/contracts/types';
import type { BankId } from '@/types/domain';
import type { ControlProps } from '../lib';

import { useTranslations } from 'next-intl';

import { ListBox } from '@lafise/onyx-ui/collections/list-box';

import { FieldLabel } from '../field-label';
import { useCatalog } from '../hooks';
import { multiCatalogInputTheme } from './themes';

interface MultiCatalogInputProps extends ControlProps<string[]> {
  bankId: BankId | undefined;
  catalog: CatalogRef;
}

/** Several options of one catalog at once, as a checkable list. */
const MultiCatalogInput = ({
  bankId,
  catalog,
  label,
  value,
  onChange,
  isRequired,
  isDisabled,
}: Readonly<MultiCatalogInputProps>) => {
  const t = useTranslations('Form.catalog');
  const { options, isUnavailable } = useCatalog({
    bankId,
    catalog,
    parentValue: undefined,
  });
  const blocked = isDisabled || isUnavailable;

  return (
    <div className={multiCatalogInputTheme({ blocked })}>
      <FieldLabel label={label} isRequired={isRequired} />
      <ListBox
        aria-label={label}
        dense={false}
        variant='gray'
        layout='stack'
        selectionMode='multiple'
        // The list has no `isDisabled`: it is switched off item by item.
        disabledKeys={blocked ? options.map((option) => option.code) : []}
        selectedKeys={value ?? []}
        renderEmptyState={() => (isUnavailable ? t('unavailable') : t('empty'))}
        onSelectionChange={(keys) => {
          const next =
            keys === 'all' ?
              options.map((option) => option.code)
            : [...keys].map(String);
          onChange(next.length === 0 ? undefined : next);
        }}
      >
        {options.map((option) => (
          <ListBox.Item
            key={option.code}
            id={option.code}
            textValue={option.name}
          >
            <ListBox.Content>
              <ListBox.Label>{option.name}</ListBox.Label>
            </ListBox.Content>
            <ListBox.Suffix>
              <ListBox.MultipleSelectionIndicator />
            </ListBox.Suffix>
          </ListBox.Item>
        ))}
      </ListBox>
    </div>
  );
};

export { MultiCatalogInput, type MultiCatalogInputProps };
