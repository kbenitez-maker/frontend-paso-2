'use client';

import type { FieldDefinition } from '@/contracts/types';

import { useMessages, useTranslations } from 'next-intl';

import { isRecord } from '@/contracts';
import { STEPS } from '@/lib/constants/steps';

/** Generated i18n namespace of a field's step, found through its block. */
const fieldsNamespaceOf = (block: string): string | undefined => {
  const step = STEPS.find((candidate) => {
    const blocks: readonly string[] = candidate.blocks;
    return blocks.includes(block);
  });
  if (step === undefined) return undefined;
  const pascal = step.slug.replaceAll(
    /(^|-)(\w)/g,
    (_match, _dash, letter: string) => letter.toUpperCase(),
  );
  return `${pascal}Fields`;
};

/** Help copy of a field flagged `help` (`<Step>Fields.hints.<key>`). */
const helpOf = (
  messages: Record<string, unknown>,
  field: FieldDefinition,
): string | undefined => {
  if (field.help !== true) return undefined;
  const namespace = fieldsNamespaceOf(field.block);
  // eslint-disable-next-line security/detect-object-injection -- a generated namespace name
  const scope = namespace === undefined ? undefined : messages[namespace];
  const hints = isRecord(scope) ? scope['hints'] : undefined;
  const text = isRecord(hints) ? hints[field.key] : undefined;
  return typeof text === 'string' ? text : undefined;
};

/**
 * Hint under a field, derived from the contract's rules so the copy never
 * drifts from what is validated. `labelOf` names the field a cross-field rule
 * points at.
 */
const useFieldHint = (
  field: FieldDefinition,
  labelOf: (key: string, variant?: string) => string,
): string | undefined => {
  const t = useTranslations('Form.hints');
  const help = helpOf(useMessages(), field);
  const parts: string[] = help === undefined ? [] : [help];

  for (const rule of field.validation ?? []) {
    if ('not_future' in rule) parts.push(t('notFuture'));
    else if ('gte_field' in rule) {
      parts.push(t('notBefore', { field: labelOf(rule.gte_field) }));
    } else if ('lte_field' in rule) {
      parts.push(
        t(field.type === 'date' ? 'notAfter' : 'notAbove', {
          field: labelOf(rule.lte_field),
        }),
      );
    } else if ('min' in rule) parts.push(t('minValue', { value: rule.min }));
    else if ('max' in rule) parts.push(t('maxValue', { value: rule.max }));
  }

  return parts.length === 0 ? undefined : parts.join(' ');
};

export { useFieldHint };
