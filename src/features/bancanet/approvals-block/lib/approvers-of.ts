import type { CatalogItem } from '@/server/api';

import { isRecord } from '@/contracts';

const NAME_KEYS = [
  'first_name',
  'second_name',
  'first_last_name',
  'second_last_name',
] as const;

const textOf = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * The saved superusers as approver options (POC bancanet.ts):
 * a registered signatory by its catalog code and name, a manual one by its
 * identification number and names.
 */
const approversOf = (
  saved: unknown,
  signatories: readonly CatalogItem[],
): CatalogItem[] =>
  (Array.isArray(saved) ? saved : []).flatMap((item: unknown) => {
    if (!isRecord(item)) return [];
    const registered = textOf(item['registered_signatory_id']);
    if (item['assign_registered_signatory'] === true && registered !== '') {
      const name =
        signatories.find((option) => option.code === registered)?.name ??
        registered;
      return [{ code: registered, name }];
    }
    const code = textOf(item['identification_number']);
    // eslint-disable-next-line security/detect-object-injection -- `key` is one of NAME_KEYS
    const name = NAME_KEYS.map((key) => textOf(item[key]))
      .filter(Boolean)
      .join(' ');
    return code === '' ? [] : [{ code, name: name === '' ? code : name }];
  });

export { approversOf };
