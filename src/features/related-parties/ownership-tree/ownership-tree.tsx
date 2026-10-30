'use client';

// cspell:ignore jerarquica Accion
import { useState } from 'react';

import type { Party } from '@/lib/ownership';
import type { CollectionHandle } from '@/shared/form/collection-field';
import type { Row } from './types';

import { useTranslations } from 'next-intl';

import { Add, Briefcase } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Text } from '@lafise/onyx-ui/typography/text';

import { HOLDER, partiesOf, remainingIn } from '@/lib/ownership';

import { percent } from '../lib/ownership-copy';
import { addShareholderTo } from './lib/add-shareholder-to';
import { isFull } from './lib/is-full';
import { segmentsOf } from './lib/segments-of';
import { SplitBar } from './split-bar';
import { ownershipTreeTheme } from './themes';
import { TreeRow } from './tree-row';

/*
 * The ownership structure as a tree (POC lista-jerarquica.tsx, ITDFCJ-46 CA 9
 * and 16): one row per shareholder, indented by level, and every company that
 * takes shareholders brings its own "add", from where the company they hold
 * shares in is already decided (and locked) and the capital it has left is
 * proposed. Sealed by the calculation, nobody is added or removed; the pencil
 * stays, because the calculation asks for complementary data inside the record.
 */

const {
  root,
  holder,
  holderHead,
  figure,
  labels,
  heading,
  holderHint,
  addLevelOne,
  over,
} = ownershipTreeTheme();

interface OwnershipTreeProps {
  list: CollectionHandle;
  /** Item noun ("shareholder"). */
  noun: string;
  /** Why the structure no longer changes shape, when the calculation sealed it. */
  sealed: string | undefined;
}

/** The shareholders list as the POC tree, rooted at the holder company. */
const OwnershipTreeRoot = ({
  list,
  noun,
  sealed,
}: Readonly<OwnershipTreeProps>) => {
  const t = useTranslations('RelatedParties.ownership');
  const [collapsed, setCollapsed] = useState<readonly string[]>([]);
  const parties = partiesOf(list.items);
  const frozen = sealed !== undefined;
  const titleOf = (party: Party) =>
    list.titles.at(Number(party.id)) ?? party.name;
  const childrenOf = (node: string) =>
    parties.filter((party) => party.parent === node);

  const countBelow = (node: string, seen: ReadonlySet<string>): number =>
    childrenOf(node)
      .filter((party) => !seen.has(party.id))
      .reduce(
        (sum, party) =>
          sum + 1 + countBelow(party.id, new Set([...seen, party.id])),
        0,
      );

  /** Reading order, skipping what hangs from a collapsed row; a cycle is walked once. */
  const rowsOf = (
    node: string,
    depth: number,
    seen: ReadonlySet<string>,
  ): Row[] =>
    childrenOf(node)
      .filter((party) => !seen.has(party.id))
      .flatMap((party) => {
        const next = new Set([...seen, party.id]);
        const below = countBelow(party.id, next);
        return [
          { party, depth, below, hasChildren: below > 0 },
          ...(collapsed.includes(party.id) ?
            []
          : rowsOf(party.id, depth + 1, next)),
        ];
      });

  const add = (node: string) => {
    addShareholderTo(list, node);
  };

  const toggle = (id: string) => {
    setCollapsed((current) =>
      current.includes(id) ?
        current.filter((other) => other !== id)
      : [...current, id],
    );
  };

  const holderFree = remainingIn(parties, HOLDER);
  const assigned = 100 - holderFree;

  return (
    <div className={root()} role='tree' aria-label={t('tree')}>
      <div className={holder()}>
        <div className={holderHead()}>
          <div className={figure()} aria-hidden>
            <Briefcase size='md' />
          </div>
          <div className={labels()}>
            <Text size='md' className={heading()}>
              {t('holder')}
            </Text>
            <Text size='sm' className={holderHint()}>
              {sealed ?? t('rootHint')}
            </Text>
          </div>
          {isFull(holderFree) ? null : (
            <Button
              variant='outline'
              size='md'
              className={addLevelOne()}
              isDisabled={frozen}
              onPress={() => {
                add(HOLDER);
              }}
            >
              <Add size='md' />
              {t('addLevelOne', { noun })}
            </Button>
          )}
        </div>
        <SplitBar
          segments={segmentsOf(
            childrenOf(HOLDER).map((party) => ({
              key: party.id,
              label: titleOf(party),
              percentage: party.percentage,
            })),
            holderFree,
            t('unassigned'),
          )}
        />
        {assigned > 100.005 ?
          <Text size='sm' className={over()}>
            {t('over', { excess: percent(assigned - 100) })}
          </Text>
        : null}
      </div>

      {rowsOf(HOLDER, 0, new Set()).map((row) => (
        <TreeRow
          key={row.party.id}
          row={row}
          list={list}
          noun={noun}
          title={titleOf(row.party)}
          free={remainingIn(parties, row.party.id)}
          isCollapsed={collapsed.includes(row.party.id)}
          isFrozen={frozen}
          onToggle={toggle}
          onAdd={add}
        />
      ))}
    </div>
  );
};

export { OwnershipTreeRoot, type OwnershipTreeProps };
