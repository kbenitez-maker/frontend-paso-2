'use client';

import type { ConfirmIssue, GateIssue } from '@/lib/ownership';

import { useFormatter, useTranslations } from 'next-intl';

const percent = (value: number): string => value.toFixed(2);

/**
 * Copy of what keeps the structure from closing or from being confirmed,
 * naming who and where (POC accionistas.ts `validar`, cierre.ts and
 * resumen-estructura.tsx `faltaParaConfirmar`).
 */
const useOwnershipCopy = () => {
  const t = useTranslations('RelatedParties.ownership');
  const format = useFormatter();
  const list = (names: readonly string[]) =>
    format.list(names, { type: 'conjunction' });
  const company = (name: string | undefined) => name ?? t('holder');

  const gate = (issue: GateIssue): string => {
    switch (issue.code) {
      case 'open_branches':
        return t('gate.openBranches', { names: list(issue.names) });
      case 'unbalanced':
        return t('gate.unbalanced', {
          name: issue.name ?? t('holderLower'),
          declared: String(issue.declared),
        });
      case 'stale_calculation':
        return t('gate.stale');
      case 'ownership_cycle':
        return t('gate.cycle', { path: issue.path.join(' → ') });
      case 'not_confirmed':
        return t('gate.notConfirmed');
      case 'missing_complementary':
        return t('gate.missingComplementary', {
          count: issue.pending.length,
          list: issue.pending
            .map((pending) =>
              t('gate.pending', {
                name: pending.name,
                company: company(pending.company),
                level: pending.level,
              }),
            )
            .join('; '),
        });
      default:
        return issue satisfies never;
    }
  };

  const blocker = (issue: ConfirmIssue): string => {
    switch (issue.code) {
      case 'empty_structure':
      case 'incomplete_items':
        return t('confirm.incomplete');
      case 'unbalanced':
        return t('confirm.unbalanced', {
          points: list(
            issue.points.map((point) =>
              t('confirm.point', {
                name: company(point.name),
                declared: percent(point.declared),
              }),
            ),
          ),
        });
      case 'open_branches':
        return t('confirm.openBranches', { names: list(issue.names) });
      case 'ownership_cycle':
        return gate(issue);
      default:
        return issue satisfies never;
    }
  };

  return { gate, blocker };
};

export { percent, useOwnershipCopy };
