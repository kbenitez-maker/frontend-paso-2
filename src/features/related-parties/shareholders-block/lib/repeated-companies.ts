import type { Party } from '@/lib/ownership';

/** Names of the companies registered more than once under the same document. */
const repeatedCompanies = (parties: readonly Party[]): string[] => [
  ...new Set(
    parties
      .filter(
        (party) =>
          party.legal &&
          party.document !== '' &&
          parties.filter((other) => other.document === party.document).length >
            1,
      )
      .map((party) => party.name),
  ),
];

export { repeatedCompanies };
