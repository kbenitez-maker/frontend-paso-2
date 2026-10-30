'use client';

import { useTranslations } from 'next-intl';

import { InfoCircle } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Popover, PopoverTrigger } from '@lafise/onyx-ui/overlays/popover';
import { Tooltip } from '@lafise/onyx-ui/overlays/tooltip';
import { Text } from '@lafise/onyx-ui/typography/text';

import { helpTooltipTheme } from './themes';
import { useCoarsePointer } from './use-coarse-pointer';

const { trigger, content } = helpTooltipTheme();

interface HelpTooltipProps {
  /** Field label used to name the accessible trigger. */
  label: string;
  /** Help paragraph shown inside the tooltip. */
  text: string;
}

interface HelpTooltipSurfaceProps {
  triggerLabel: string;
  text: string;
}

/** Tap-to-open help for coarse pointers (phones/tablets). */
const HelpTooltipPopover = ({
  triggerLabel,
  text,
}: Readonly<HelpTooltipSurfaceProps>) => (
  <PopoverTrigger>
    <Button
      variant='plain'
      size='sm'
      className={trigger()}
      aria-label={triggerLabel}
    >
      <InfoCircle size='md' />
    </Button>
    <Popover placement='top'>
      <Text size='sm' className={content()}>
        {text}
      </Text>
    </Popover>
  </PopoverTrigger>
);

/** Hover/focus help for fine pointers (desktop). */
const HelpTooltipFlyout = ({
  triggerLabel,
  text,
}: Readonly<HelpTooltipSurfaceProps>) => (
  <Tooltip.Root delay={200}>
    <Tooltip.Focusable
      excludeFromTabOrder={false}
      aria-label={triggerLabel}
      className={trigger()}
    >
      <InfoCircle size='md' />
    </Tooltip.Focusable>
    <Tooltip placement='top'>
      <Tooltip.Arrow />
      <Tooltip.Content className={content()}>{text}</Tooltip.Content>
    </Tooltip>
  </Tooltip.Root>
);

/**
 * Field help next to a label: tooltip on hover/focus for desktop, popover on
 * tap for touch devices (`pointer: coarse`).
 */
const HelpTooltip = ({ label, text }: Readonly<HelpTooltipProps>) => {
  const t = useTranslations('Form');
  const coarsePointer = useCoarsePointer();
  const triggerLabel = t('tooltipTrigger', { label });

  return coarsePointer ?
      <HelpTooltipPopover triggerLabel={triggerLabel} text={text} />
    : <HelpTooltipFlyout triggerLabel={triggerLabel} text={text} />;
};

export { HelpTooltip, type HelpTooltipProps };
