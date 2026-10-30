import type { Inquiry } from '@/server/api';

import { useFormatter, useTranslations } from 'next-intl';

import { Text } from '@lafise/onyx-ui/typography/text';

import { findStep } from '@/lib/constants/steps';

import { helpButtonTheme } from './themes';

const { history, message, signature, author, time, body, origin } =
  helpButtonTheme();

interface InquiryHistoryProps {
  inquiries: readonly Inquiry[];
}

/** Every inquiry of the request in chronological order, from any step. */
const InquiryHistory = ({ inquiries }: Readonly<InquiryHistoryProps>) => {
  const t = useTranslations('Steps');
  const format = useFormatter();

  return (
    <div className={history()}>
      {inquiries.map((inquiry) => (
        <div key={inquiry.inquiry_id} className={message()}>
          <div className={signature()}>
            <Text size='sm' className={author()}>
              {t(`help.${inquiry.author}`)}
            </Text>
            <Text size='sm' className={time()}>
              {format.dateTime(new Date(inquiry.created_at), {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </div>
          <Text size='sm' className={body()}>
            {inquiry.text}
          </Text>
          {inquiry.step === null ? null : (
            <Text size='sm' className={origin()}>
              {t('help.from', {
                step: t(`${findStep(inquiry.step).titleKey}.title`),
              })}
            </Text>
          )}
        </div>
      ))}
    </div>
  );
};

export { InquiryHistory };
