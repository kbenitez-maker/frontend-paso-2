import { useTranslations } from 'next-intl';

import { Pencil } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { Text } from '@lafise/onyx-ui/typography/text';

import { shareholdersBlockTheme } from './themes';

const { sealedHint, actionRow, action, readiness } = shareholdersBlockTheme();

interface SummaryActionsProps {
  /** The structure is sealed by a calculation that still matches the list. */
  isCurrent: boolean;
  /** Whether the structure was ever calculated (a stale seal reads "recalculate"). */
  wasConfirmed: boolean;
  /** Copy of what still blocks the calculation; `undefined` when ready. */
  blocker: string | undefined;
  isReopening: boolean;
  isConfirming: boolean;
  onReopen: () => void;
  onConfirm: () => void;
}

/** The footer of the summary card: reopen a sealed structure, or confirm a ready one. */
const SummaryActions = ({
  isCurrent,
  wasConfirmed,
  blocker,
  isReopening,
  isConfirming,
  onReopen,
  onConfirm,
}: Readonly<SummaryActionsProps>) => {
  const t = useTranslations('RelatedParties.ownership');

  if (isCurrent) {
    return (
      <div className={actionRow()}>
        <Text size='sm' className={sealedHint()}>
          {t('summary.sealedHint')}
        </Text>
        <Button
          variant='outline'
          size='md'
          className={action()}
          isDisabled={isReopening}
          onPress={onReopen}
        >
          <Pencil size='md' />
          {t('summary.reopen')}
        </Button>
      </div>
    );
  }

  return (
    <div className={actionRow()}>
      <Text size='sm' className={readiness({ ready: blocker === undefined })}>
        {blocker ?? t('summary.ready')}
      </Text>
      <Button
        size='md'
        className={action()}
        isDisabled={blocker !== undefined || isConfirming}
        onPress={onConfirm}
      >
        {wasConfirmed ? t('summary.reconfirm') : t('summary.confirm')}
      </Button>
    </div>
  );
};

export { SummaryActions, type SummaryActionsProps };
