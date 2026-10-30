import type { MapAnswer } from '@/shared/form/collection-item-editor';

import { itemsIn } from '@/lib/ownership';

type Item = Readonly<Record<string, unknown>>;

/** The shortcut field and the catalog its options come from (POC `administradorRelacionado`). */
const SHORTCUT = 'shareholder_related_administrator';
const ADMINISTRATORS = 'shareholder-administrators';

/** What identifies the person (POC `mapear`: never more than the identity and the name). */
const COPIED = [
  'person_type_id',
  'identification_type_id',
  'identification_number',
  'first_name',
  'middle_name',
  'last_name',
  'second_last_name',
  'legal_name',
] as const;

const textOf = (item: Item, key: string): string => {
  // eslint-disable-next-line security/detect-object-injection -- keys are the constants above
  const value = item[key];
  return typeof value === 'string' ? value.trim() : '';
};

/** Option code of an administrator: their identification, else their position. */
const codeOf = (item: Item, index: number): string => {
  const number = textOf(item, 'admin_identification_number');
  return number === '' ?
      `#${String(index)}`
    : `${textOf(item, 'admin_identification_type_id')}|${number}`.toLowerCase();
};

const nameOf = (item: Item): string => {
  const person = [
    textOf(item, 'admin_first_name'),
    textOf(item, 'admin_last_name'),
  ]
    .filter(Boolean)
    .join(' ');
  return person === '' ? textOf(item, 'admin_legal_name') : person;
};

/** The registered administrators as options of the shortcut (named ones only). */
const administratorOptions = (values: Item) =>
  itemsIn(values['administrators']).flatMap((item, index) => {
    const name = nameOf(item);
    return name === '' ? [] : [{ code: codeOf(item, index), name }];
  });

/** Choosing an administrator copies their identity; recognition fills the rest. */
const copyAdministrator =
  (values: Item): MapAnswer =>
  (key, value) => {
    if (key !== SHORTCUT || typeof value !== 'string') return undefined;
    const chosen = itemsIn(values['administrators']).find(
      (item, index) => codeOf(item, index) === value,
    );
    if (chosen === undefined) return undefined;
    return Object.fromEntries(
      COPIED.map((datum) => [
        `shareholder_${datum}`,
        textOf(chosen, `admin_${datum}`) || undefined,
      ]),
    );
  };

export { ADMINISTRATORS, administratorOptions, copyAdministrator };
