import { useTranslations } from 'next-intl';

import { Warning } from '@lafise/onyx-icons';
import { Link } from '@lafise/onyx-ui/base/link';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { routes } from '@/lib/routes';

import { profilingCardTheme } from './themes';

const { noticeLink } = profilingCardTheme();

/**
 * A request already exists for this identification: it blocks the flow but
 * there is somewhere to go, so it stays in the card with the way out beside it
 * (a toast would vanish and leave a form that does not move on).
 */
const RequestInProgressNotice = () => {
  const t = useTranslations('NewRequest.outcomes.requestInProgress');

  return (
    <Notification status='warning'>
      <Notification.Icon>
        <Warning />
      </Notification.Icon>
      <Notification.Content>
        {t('message')}{' '}
        {/* Cross-zone: the list lives in the home zone, so a full page load. */}
        <Link href={routes.external.requests()} className={noticeLink()}>
          {t('link')}
        </Link>
      </Notification.Content>
    </Notification>
  );
};

export { RequestInProgressNotice };
