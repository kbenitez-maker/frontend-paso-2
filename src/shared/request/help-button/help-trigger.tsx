import { useTranslations } from 'next-intl';

import { QuestionMarkChat } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';

/** The footer button; it also works alone while the request does not exist yet. */
const HelpTrigger = () => {
  const t = useTranslations('Steps');

  return (
    <Button variant='plain' size='sm'>
      <QuestionMarkChat size='md' />
      {t('footer.help')}
    </Button>
  );
};

export { HelpTrigger };
