import type { Route } from '@/types/domain';
import type { ReactNode } from 'react';

import { useTranslations } from 'next-intl';

import { ChevronLeft, ChevronRight } from '@lafise/onyx-icons';

import { NavButton } from './nav-button';
import { stepFooterTheme } from './themes';

const { footer, inner, actions } = stepFooterTheme();

interface StepFooterProps {
  /** Without it (or `previousExternalHref`) "Back" is disabled. */
  previousHref?: Route;
  /** "Back" to another zone: a full page load, never `next/link`. */
  previousExternalHref?: string;
  /** Without it (or `onNext`) "Continue" is disabled. */
  nextHref?: Route;
  /** Replaces the "Continue" label. */
  nextLabel?: string | undefined;
  /** Until the form validates its fields, "Continue" stays disabled. */
  nextDisabled?: boolean;
  /** When set, "Continue" runs it (to save first) instead of linking to `nextHref`. */
  onNext?: () => void;
  /** Shows "Continue" as busy while `onNext` works. */
  nextPending?: boolean;
  /** Help trigger slot, shown on the left. */
  help?: ReactNode;
}

/** Fixed 72px action bar: help on the left, back and continue on the right. */
const StepFooter = ({
  previousHref,
  previousExternalHref,
  nextHref,
  nextLabel,
  nextDisabled = true,
  onNext,
  nextPending = false,
  help,
}: Readonly<StepFooterProps>) => {
  const t = useTranslations('Steps');

  return (
    <footer className={footer()}>
      <div className={inner()}>
        {help}

        <div className={actions()}>
          <NavButton
            href={previousExternalHref ?? previousHref}
            isExternal={previousExternalHref !== undefined}
            variant='outline'
          >
            <ChevronLeft size='md' />
            {t('footer.previous')}
          </NavButton>
          <NavButton
            href={nextHref}
            variant='primary'
            isDisabled={nextDisabled}
            onPress={onNext}
            isPending={nextPending}
          >
            {nextLabel ?? t('footer.next')}
            <ChevronRight size='md' />
          </NavButton>
        </div>
      </div>
    </footer>
  );
};

export { StepFooter, type StepFooterProps };
