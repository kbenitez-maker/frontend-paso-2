import { useState } from 'react';

import type { OwnershipTotal, Party } from '@/lib/ownership';

import { useTranslations } from 'next-intl';

import { Button } from '@lafise/onyx-ui/base/button';
import { Status } from '@lafise/onyx-ui/data-display/status';
import { Table } from '@lafise/onyx-ui/data-display/table';
import { Text } from '@lafise/onyx-ui/typography/text';

import { levelOf, principalRecordOf } from '@/lib/ownership';

import { BreakdownModal } from '../breakdown-modal';
import { percent } from '../lib/ownership-copy';
import { beneficiariesTableTheme } from './themes';

const {
  root,
  person,
  name,
  appearances: appearancesSlot,
  level: levelSlot,
  total: totalSlot,
  direct,
} = beneficiariesTableTheme();

interface BeneficiariesTableProps {
  parties: readonly Party[];
  totals: readonly OwnershipTotal[];
  threshold: number;
}

/**
 * POC tabla-de-beneficiarios.tsx: every natural person of the structure in
 * one list, beneficial owners first, with the level of their principal record,
 * their total participation and, when it is indirect, the route behind it.
 */
const BeneficiariesTable = ({
  parties,
  totals,
  threshold,
}: Readonly<BeneficiariesTableProps>) => {
  const t = useTranslations('RelatedParties.ownership.results');
  const [who, setWho] = useState<OwnershipTotal>();
  const [isOpen, setIsOpen] = useState(false);
  if (totals.length === 0) return null;

  const sorted = totals.toSorted((one, other) =>
    one.beneficial === other.beneficial ?
      other.total - one.total
    : Number(other.beneficial) - Number(one.beneficial),
  );
  const levelAndNote = (document: string) => {
    const theirs = parties.filter((party) => party.document === document);
    const principal = principalRecordOf(parties, document);
    return {
      level: principal === undefined ? 0 : levelOf(parties, principal.id),
      appearances: theirs.length,
    };
  };
  const hasRoute = (total: OwnershipTotal) =>
    total.routes.length > 1 ||
    total.routes.some((route) => route.links.length > 1);

  return (
    <div className={root()}>
      <Table.Root variant='striped'>
        <Table aria-label={t('label')}>
          <Table.Thead>
            <Table.Th id='person' isRowHeader>
              {t('person')}
            </Table.Th>
            <Table.Th id='level' fill={false}>
              {t('level')}
            </Table.Th>
            <Table.Th id='total' fill={false}>
              {t('total')}
            </Table.Th>
            <Table.Th id='route' fill={false}>
              {t('calculation')}
            </Table.Th>
          </Table.Thead>
          <Table.Tbody>
            {sorted.map((total) => {
              const { level, appearances } = levelAndNote(total.document);
              return (
                <Table.Tr key={total.document}>
                  <Table.Td>
                    <div className={person()}>
                      <Text size='sm' className={name()}>
                        {total.name}
                      </Text>
                      <Status
                        status={total.beneficial ? 'completed' : 'inactive'}
                      >
                        {total.beneficial ?
                          t('beneficial')
                        : t('below', { threshold: percent(threshold) })}
                      </Status>
                      {appearances > 1 ?
                        <Text size='xs' className={appearancesSlot()}>
                          {t('appearances', { count: appearances })}
                        </Text>
                      : null}
                    </div>
                  </Table.Td>
                  <Table.Td fill={false}>
                    <Text size='sm' className={levelSlot()}>
                      {level}
                    </Text>
                  </Table.Td>
                  <Table.Td fill={false}>
                    <Text
                      size='sm'
                      className={totalSlot({ beneficial: total.beneficial })}
                    >
                      {percent(total.total)} %
                    </Text>
                  </Table.Td>
                  <Table.Td fill={false}>
                    {hasRoute(total) ?
                      <Button
                        variant='plain'
                        size='sm'
                        onPress={() => {
                          setWho(total);
                          setIsOpen(true);
                        }}
                      >
                        {t('showRoute')}
                      </Button>
                    : <Text size='sm' className={direct()}>
                        {t('direct')}
                      </Text>
                    }
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.Root>
      <BreakdownModal
        who={who}
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export { BeneficiariesTable };
