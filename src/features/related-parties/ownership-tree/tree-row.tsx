import type { CollectionHandle } from '@/shared/form/collection-field';
import type { Row } from './types';

import { useTranslations } from 'next-intl';

import {
  Add,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Delete,
  Pencil,
  User,
} from '@lafise/onyx-icons';
import { Text } from '@lafise/onyx-ui/typography/text';

import { takesShareholders } from '@/lib/ownership';

import { percent } from '../lib/ownership-copy';
import { Action } from './action';
import { isFull } from './lib/is-full';
import { ownershipTreeTheme } from './themes';

/** One level is 24px of indentation (POC `SANGRIA`). */
const INDENT = 24;

const {
  figure,
  labels,
  heading,
  item: itemSlot,
  divider,
  rowWrap,
  row: rowSlot,
  detail: detailSlot,
  hidden,
  actions,
  stack,
} = ownershipTreeTheme();

interface TreeRowProps {
  row: Row;
  list: CollectionHandle;
  /** Item noun ("shareholder"). */
  noun: string;
  title: string;
  /** Capital the company of this row can still give out. */
  free: number;
  isCollapsed: boolean;
  isFrozen: boolean;
  onToggle: (id: string) => void;
  onAdd: (node: string) => void;
}

/** "share % · identification number" of a shareholder record. */
const detailOf = (item: Readonly<Record<string, unknown>>): string => {
  const number = item['shareholder_identification_number'];
  const share = item['shareholder_share_percentage'];
  return [
    typeof share === 'number' ? `${String(share)} %` : '',
    typeof number === 'string' ? number : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

/** One shareholder row of the ownership tree, with its actions. */
const TreeRow = ({
  row,
  list,
  noun,
  title,
  free,
  isCollapsed,
  isFrozen,
  onToggle,
  onAdd,
}: Readonly<TreeRowProps>) => {
  const t = useTranslations('RelatedParties.ownership');
  const { party, depth, below, hasChildren } = row;
  const index = Number(party.id);
  const problem = list.problems.get(index);
  const detail = detailOf(list.items.at(index) ?? {});
  const full = isFull(free);
  const collapsedWithChildren = isCollapsed && hasChildren;
  const toggleKey = isCollapsed ? 'expand' : 'collapse';
  const addLabel =
    full ?
      t('full', { company: title })
    : t('addTo', { noun, company: title, remaining: percent(free) });

  return (
    <div
      className={itemSlot()}
      style={{ paddingInlineStart: `${String(depth * INDENT)}px` }}
      role='treeitem'
      aria-level={depth + 2}
      aria-selected={false}
      {...(hasChildren ? { 'aria-expanded': !isCollapsed } : {})}
    >
      {depth === 0 ? null : <div aria-hidden className={divider()} />}
      <div className={rowWrap()}>
        <div className={rowSlot()}>
          <div className={figure()} aria-hidden>
            {party.legal ?
              <Briefcase size='md' />
            : <User size='md' />}
          </div>
          <div className={labels()}>
            <Text size='md' className={heading()}>
              {title}
            </Text>
            {problem === undefined && detail === '' ? null : (
              <Text
                size='sm'
                className={detailSlot({ problem: problem !== undefined })}
              >
                {problem ?? detail}
              </Text>
            )}
            {collapsedWithChildren ?
              <Text size='sm' className={hidden()}>
                {t('hidden', { count: below })}
              </Text>
            : null}
          </div>
          <div className={actions()}>
            {hasChildren ?
              <Action
                label={t(toggleKey, { name: title })}
                isDisabled={false}
                onPress={() => {
                  onToggle(party.id);
                }}
              >
                {isCollapsed ?
                  <ChevronDown size='md' />
                : <ChevronUp size='md' />}
              </Action>
            : null}
            {takesShareholders(party) ?
              <Action
                label={addLabel}
                isDisabled={isFrozen || full}
                onPress={() => {
                  onAdd(party.id);
                }}
              >
                <Add size='md' />
              </Action>
            : null}
            <Action
              label={t('edit', { name: title })}
              isDisabled={false}
              onPress={() => {
                list.edit(index);
              }}
            >
              <Pencil size='md' />
            </Action>
            <Action
              label={t('remove', { name: title })}
              isDisabled={isFrozen}
              onPress={() => {
                list.remove(index);
              }}
            >
              <Delete size='md' />
            </Action>
          </div>
        </div>
        {collapsedWithChildren ?
          <div aria-hidden className={stack()} />
        : null}
      </div>
    </div>
  );
};

export { TreeRow, type TreeRowProps };
