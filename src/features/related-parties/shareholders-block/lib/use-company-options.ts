import type { Party } from '@/lib/ownership';

import { useTranslations } from 'next-intl';

import { HOLDER, levelOf, pointKeyOf, remainingIn } from '@/lib/ownership';

import { percent } from '../../lib/ownership-copy';
import { administratorOptions, ADMINISTRATORS } from './administrator-shortcut';

type Item = Record<string, unknown>;

/** Catalog of the parent field; its options are the companies of the tree (POC `empresasConCapitalDisponible`). */
const COMPANIES = 'shareholding-companies';

/** Capital left below which a company counts as fully given out, and above which as untouched. */
const UNTOUCHED_FROM = 99.995;
const COMPLETE_UNTIL = 0.005;

interface CompanyOptionsInput {
  values: Item;
  items: readonly Item[];
  parties: readonly Party[];
  labels: ReadonlyMap<string, string>;
}

interface CatalogOption {
  code: string;
  name: string;
}

/**
 * POC `empresasConCapitalDisponible` and `rotuloDeEmpresa`: the companies
 * with capital left, "Nivel n · X · queda y %", the holder without a level.
 * A full company is hidden unless it is the current choice (editing keeps it).
 */
const useCompanyOptions = ({
  values,
  items,
  parties,
  labels,
}: Readonly<CompanyOptionsInput>) => {
  const t = useTranslations('RelatedParties.ownership');

  const capital = (free: number): string => {
    if (free >= UNTOUCHED_FROM) return t('option.untouched');
    if (free <= COMPLETE_UNTIL) return t('option.complete');
    return t('option.remaining', { remaining: percent(free) });
  };

  const companyOption = (
    party: Party,
    selected: string | undefined,
  ): CatalogOption[] => {
    const code = pointKeyOf(items.at(Number(party.id)) ?? {}, Number(party.id));
    const free = remainingIn(parties, party.id);
    if (free <= COMPLETE_UNTIL && code !== selected) return [];
    return [
      {
        code,
        name: t('option.company', {
          level: levelOf(parties, party.id),
          company: labels.get(party.id) ?? party.name,
          capital: capital(free),
        }),
      },
    ];
  };

  return (name: string, selected: string | undefined) => {
    if (name === ADMINISTRATORS) return administratorOptions(values);
    if (name !== COMPANIES) return undefined;
    const holderFree = remainingIn(parties, HOLDER);
    const holderOption: CatalogOption[] =
      holderFree > COMPLETE_UNTIL || HOLDER === selected ?
        [
          {
            code: HOLDER,
            name: t('option.holder', { capital: capital(holderFree) }),
          },
        ]
      : [];
    return [
      ...holderOption,
      ...parties
        .filter((party) => party.legal && !party.listed)
        .flatMap((party) => companyOption(party, selected)),
    ];
  };
};

export { useCompanyOptions };
