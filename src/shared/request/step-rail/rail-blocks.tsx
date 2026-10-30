'use client';

import Link from 'next/link';

import type { BlockOf, StepSlug } from '@/lib/constants/steps';

import { useTranslations } from 'next-intl';

import { Check } from '@lafise/onyx-icons';
import { Tooltip } from '@lafise/onyx-ui/overlays/tooltip';
import { Text } from '@lafise/onyx-ui/typography/text';

import { waitingCopyOf } from '@/lib/related-parties';
import { routes } from '@/lib/routes';

import { usePreviewBank } from '../use-preview-bank';
import { useStepRail } from './context';
import { stepRailTheme } from './themes';

const {
  blockList,
  blockLink,
  blockText,
  blockTitle,
  blockCounter,
  blockCheck,
  waitingRow,
  waitingTitle,
  waitingNote,
  hintTrigger,
  waitingHint,
} = stepRailTheme();

interface RailBlocksProps {
  slug: StepSlug;
  blocks: readonly BlockOf<StepSlug>[];
}

/** POC labels of the completed one-step blocks of the checklist (instead of "1 step completed"). */
const COMPLETE_LABELS: Partial<
  Record<BlockOf<StepSlug>, 'confirmComplete' | 'declarationsComplete'>
> = {
  confirm: 'confirmComplete',
  'document-declarations': 'declarationsComplete',
};

/** Steps whose waiting blocks explain on hover what they wait for (POC `avisoBloqueado`). */
const WAITING_HINTS: Partial<Record<StepSlug, 'documentChecklist'>> = {
  'document-checklist': 'documentChecklist',
};

const COMPLETE_BY_UNIT = {
  fields: 'fieldsComplete',
  documents: 'documentsComplete',
  steps: 'stepsComplete',
} as const;

/**
 * Blocks of an expanded step: title, field counter and current highlight.
 * Waiting blocks are listed, not linked, with what they wait for (POC `esperaA`).
 */
const RailBlocks = ({ slug, blocks }: Readonly<RailBlocksProps>) => {
  const t = useTranslations('Steps');
  const bank = usePreviewBank();
  const { requestId, waiting, titleOf, currentStep, currentBlock, progress } =
    useStepRail();
  const counts = progress?.steps.find((entry) => entry.slug === slug)?.blocks;

  return (
    <ul className={blockList()}>
      {blocks.map((block) => {
        const isCurrent = slug === currentStep && block === currentBlock;
        const count = counts?.find((entry) => entry.key === block);
        const isComplete =
          count !== undefined &&
          count.total_fields > 0 &&
          count.completed_fields === count.total_fields;

        const counterOf = (): string | null => {
          if (count === undefined) return null;
          if (!isComplete) {
            return t(`rail.${count.unit ?? 'fields'}`, {
              completed: count.completed_fields,
              total: count.total_fields,
            });
          }
          // eslint-disable-next-line security/detect-object-injection -- `block` is a registry block
          const done = COMPLETE_LABELS[block];
          return t(`rail.${done ?? COMPLETE_BY_UNIT[count.unit ?? 'fields']}`, {
            total: count.total_fields,
          });
        };
        const counter = counterOf();

        if (waiting.has(block)) {
          // eslint-disable-next-line security/detect-object-injection -- `slug` is a `StepSlug`
          const hint = WAITING_HINTS[slug];
          const row = (
            <div aria-disabled='true' className={waitingRow()}>
              <Text size='sm' className={waitingTitle()}>
                {titleOf(block)}
              </Text>
              {/* POC: the counter stays visible while waiting; "waits for" only when there is nothing to count. */}
              <Text size='sm' className={waitingNote()}>
                {count !== undefined && count.total_fields > 0 ?
                  counter
                : t(`rail.waiting.${waitingCopyOf(block)}`)}
              </Text>
            </div>
          );

          return (
            <li key={block}>
              {hint === undefined ?
                row
              : <Tooltip.Root delay={200}>
                  <Tooltip.Focusable className={hintTrigger()}>
                    {row}
                  </Tooltip.Focusable>
                  <Tooltip>
                    <Tooltip.Arrow />
                    <Tooltip.Content className={waitingHint()}>
                      {t(`rail.waitingHint.${hint}`)}
                    </Tooltip.Content>
                  </Tooltip>
                </Tooltip.Root>
              }
            </li>
          );
        }

        return (
          <li key={block}>
            <Link
              href={routes.step(requestId, slug, { block, bank })}
              aria-current={isCurrent ? 'step' : undefined}
              className={blockLink({ current: isCurrent })}
            >
              <div className={blockText()}>
                <Text size='sm' className={blockTitle({ current: isCurrent })}>
                  {titleOf(block)}
                </Text>
                {counter === null ? null : (
                  <Text size='sm' className={blockCounter()}>
                    {counter}
                  </Text>
                )}
              </div>
              {/* POC parity: the check goes last so titles keep one left edge. */}
              {isComplete ?
                <Check
                  aria-label={t('rail.blockComplete')}
                  className={blockCheck()}
                />
              : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};

export { RailBlocks, type RailBlocksProps };
