'use client';

import { useEffect } from 'react';

import type { FieldDefinition } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { Item } from '../collection-field';
import type { FormValues } from '../lib';
import type { MapAnswer } from './types';

import { useForm, useWatch } from 'react-hook-form';

import { ownFieldsOf, visibleValues } from '@/contracts';

import { itemOf, itemResolver } from './lib/item-resolver';
import { duplicateOf, identityOf, knownPersonOf } from './lib/person-identity';

interface UseItemDraftOptions {
  name: string;
  fields: readonly FieldDefinition[];
  scope: Readonly<Record<string, unknown>>;
  country: CountryCode;
  /** Item being edited (empty for a new one). */
  item: Item;
  /** Saved items of the collection, to spot the same person twice. */
  items: readonly Item[];
  /** Position of the item; `items.length` for a new one. */
  index: number;
  /** Answers a change implies (e.g. a shortcut copying an identification). */
  mapAnswer?: MapAnswer | undefined;
}

/**
 * The draft of one collection item in its own form, with what identity data
 * reveals: the same person in another collection (whose answers it inherits)
 * or twice in this one.
 */
const useItemDraft = ({
  name,
  fields,
  scope,
  country,
  item,
  items,
  index,
  mapAnswer,
}: UseItemDraftOptions) => {
  // POC: a field shows its error once touched; a reopened item shows all it lacks.
  const form = useForm<FormValues>({
    defaultValues: { [name]: [item] },
    resolver: itemResolver(name, fields, scope, country, items, index),
    mode: 'onChange',
  });
  const reopened = index < items.length;
  // RHF has no option to validate the initial values.
  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- runs once, when the draft mounts
    if (reopened) void form.trigger();
  }, [form, reopened]);
  const answers = itemOf(useWatch({ control: form.control }), name);

  // POC `mapear`: a changed answer merges the answers it implies into the draft.
  useEffect(() => {
    if (mapAnswer === undefined) return undefined;
    const prefix = `${name}.0.`;
    const { unsubscribe } = form.watch((values, { name: path, type }) => {
      if (type !== 'change' || path?.startsWith(prefix) !== true) return;
      const key = path.slice(prefix.length);
      // eslint-disable-next-line security/detect-object-injection -- `key` is a field key of the draft's own form
      const mapped = mapAnswer(key, itemOf(values, name)[key]) ?? {};
      for (const [target, value] of Object.entries(mapped)) {
        form.setValue(`${prefix}${target}`, value, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
    return unsubscribe;
  }, [form, mapAnswer, name]);

  const own = ownFieldsOf(fields, name);
  const known = knownPersonOf(name, own, answers, scope);
  const inherited = known?.inherited ?? {};
  // POC: what the person's other record holds is shown, locked, and not asked again.
  useEffect(() => {
    for (const [key, value] of Object.entries(inherited)) {
      const path = `${name}.0.${key}`;
      if (form.getValues(path) !== value) {
        form.setValue(path, value, { shouldValidate: true });
      }
    }
  });

  /** The draft as it is saved: only what is visible. */
  const valuesToSave = () =>
    visibleValues(fields, name, itemOf(form.getValues(), name), scope, country);

  return {
    form,
    answers,
    known,
    inherited,
    duplicate: duplicateOf(own, answers, items, index),
    identity: identityOf(own, answers),
    valuesToSave,
  };
};

export { useItemDraft };
