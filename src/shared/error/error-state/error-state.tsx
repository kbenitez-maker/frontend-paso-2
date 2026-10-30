'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@lafise/onyx-ui/base/button';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { errorStateTheme } from './themes';

const { root } = errorStateTheme();

interface ErrorStateProps {
  onRetry: () => void;
}

/**
 * Inline failure of a block that can be loaded again. The copy lives in
 * `Form.loadError`; the caller decides what the retry does.
 */
const ErrorState = ({ onRetry }: Readonly<ErrorStateProps>) => {
  const t = useTranslations('Form.loadError');

  return (
    <div className={root()}>
      <Notification status='error'>
        <Notification.Icon />
        <Notification.Content>{t('message')}</Notification.Content>
      </Notification>
      <Button variant='outline' size='sm' onPress={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
};

export { ErrorState, type ErrorStateProps };
