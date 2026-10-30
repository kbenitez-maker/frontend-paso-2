'use client';

import { useState } from 'react';

import { useFormatter, useTranslations } from 'next-intl';

import { CloudSync, Warning } from '@lafise/onyx-icons';
import { Tooltip } from '@lafise/onyx-ui/overlays/tooltip';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useAutosaveState } from '../autosave-state';
import { autosaveIndicatorTheme } from './themes';

const { trigger, row, icon, labels, label, hint } = autosaveIndicatorTheme();

const LABEL_KEYS = ['idle', 'saving', 'error'] as const;
type LabelKey = (typeof LABEL_KEYS)[number];

/**
 * Save status under the step title (POC parity). The label stays
 * "Guardado automático" unless a save is running or failed; the tooltip tells
 * *when* the last save happened, which is what reassures before leaving.
 */
const AutosaveIndicator = () => {
  const t = useTranslations('Request.autosave');
  const format = useFormatter();
  const { status, savedAt } = useAutosaveState();

  // Controlled: "now" is captured when the tooltip opens, so the relative time
  // is fresh every time instead of frozen at the last render.
  const [isOpen, setIsOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<Date | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setOpenedAt(new Date());
  };

  const active: LabelKey =
    status === 'saving' || status === 'error' ? status : 'idle';
  const Icon = status === 'error' ? Warning : CloudSync;
  const tooltip =
    savedAt ?
      t('tooltip.saved', {
        relative: format.relativeTime(savedAt, openedAt ?? savedAt),
      })
    : t('tooltip.idle');

  return (
    <Tooltip.Root delay={200} isOpen={isOpen} onOpenChange={handleOpenChange}>
      {/* Focusable so the hint also opens with the keyboard. */}
      <Tooltip.Focusable className={trigger()}>
        <output className={row()} aria-live='polite'>
          <Icon size='md' className={icon({ failed: status === 'error' })} />
          {/* All labels share one grid cell: the width is the widest label's,
              so switching status never shifts the header. */}
          <div className={labels()}>
            {LABEL_KEYS.map((key) => (
              <Text
                key={key}
                size='sm'
                aria-hidden={key !== active}
                className={label({ active: key === active })}
              >
                {t(key)}
              </Text>
            ))}
          </div>
        </output>
      </Tooltip.Focusable>

      <Tooltip>
        <Tooltip.Arrow />
        <Tooltip.Content className={hint()}>{tooltip}</Tooltip.Content>
      </Tooltip>
    </Tooltip.Root>
  );
};

export { AutosaveIndicator };
