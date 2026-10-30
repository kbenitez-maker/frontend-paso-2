'use client';

import Link from 'next/link';

import type { BlockOf, Step } from '@/lib/constants/steps';
import type { StepState } from '@/server/api/account-requests';
import type { TagState } from '@lafise/onyx-ui/data-display/tag';

import { useTranslations } from 'next-intl';

import { Check, ChevronDown } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Tag } from '@lafise/onyx-ui/data-display/tag';
import { Text } from '@lafise/onyx-ui/typography/text';

import { routes } from '@/lib/routes';

import { usePreviewBank } from '../use-preview-bank';
import { useStepRail } from './context';
import { RailBlocks } from './rail-blocks';
import { stepRailTheme } from './themes';

const { stepRow, stepLink, badge, badgeCheck, text, title, toggle, chevron } =
  stepRailTheme();

/** POC parity: a `Tag` keeps seven stacked states quieter than `Status` dots. */
const TAG_BY_STATE = {
  complete: 'approved',
  in_progress: 'pending',
  not_started: 'default',
} as const satisfies Record<StepState, TagState>;

interface RailStepProps {
  step: Step;
  /** Blocks visible for the request's country, in order. */
  blocks: readonly BlockOf<Step['slug']>[];
  /** 1-based position shown in the badge. */
  number: number;
  isOpen: boolean;
  onToggle: () => void;
}

/** One collapsible rail entry: badge, title, status and (when open) its blocks. */
const RailStep = ({
  step,
  blocks,
  number,
  isOpen,
  onToggle,
}: Readonly<RailStepProps>) => {
  const t = useTranslations('Steps');
  const bank = usePreviewBank();
  const { requestId, currentStep, progress: request } = useStepRail();
  const isCurrent = step.slug === currentStep;
  const progress = request?.steps.find((entry) => entry.slug === step.slug);
  const state = progress?.state ?? 'not_started';
  // eslint-disable-next-line security/detect-object-injection -- `state` is a closed union
  const tagState = TAG_BY_STATE[state];
  const stepTitle = t(`${step.titleKey}.title`);
  // POC parity: a step with a single block (Signature) lists no blocks; a
  // route that leaves related parties with one still lists it.
  const hasBlocks = step.blocks.length > 1 && blocks.length > 0;

  const body = (
    <>
      <div aria-hidden='true' className={badge({ state })}>
        {state === 'complete' ?
          <Check className={badgeCheck()} />
        : number}
      </div>

      <div className={text()}>
        <Text size='md' className={title({ current: isCurrent })}>
          {stepTitle}
        </Text>
        {progress === undefined ? null : (
          <div>
            <Tag state={tagState} size='sm'>
              {t(`rail.state.${state}`)}
            </Tag>
          </div>
        )}
      </div>
    </>
  );

  return (
    <li>
      <div className={stepRow()}>
        {/* POC parity: on its own step there is nowhere to go, so the body is not a link. */}
        {isCurrent ?
          <div aria-current='step' className={stepLink()}>
            {body}
          </div>
        : <Link
            // The step opens at its first block the request has (related parties may hide the registry's first).
            href={routes.step(requestId, step.slug, {
              ...(blocks[0] === undefined || blocks[0] === step.blocks[0] ?
                {}
              : { block: blocks[0] }),
              bank,
            })}
            className={stepLink()}
          >
            {body}
          </Link>
        }

        {hasBlocks ?
          <Button
            icon
            variant='plain'
            size='xs'
            aria-expanded={isOpen}
            aria-label={t(isOpen ? 'rail.collapse' : 'rail.expand', {
              step: stepTitle,
            })}
            onPress={onToggle}
            className={toggle()}
          >
            <ChevronDown size='md' className={chevron({ open: isOpen })} />
          </Button>
        : null}
      </div>

      {isOpen && hasBlocks ?
        <RailBlocks slug={step.slug} blocks={blocks} />
      : null}
    </li>
  );
};

export { RailStep, type RailStepProps };
