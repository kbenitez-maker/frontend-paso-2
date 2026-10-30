import { useTranslations } from 'next-intl';

import { ProgressBar } from '@lafise/onyx-ui/status/progress-bar';
import { Text } from '@lafise/onyx-ui/typography/text';

import { formatBytes } from '../lib/file-rules';
import { useUploadCard } from './context';
import { uploadProgressTheme } from './themes';

const { box, figure, percent, unit, remaining, details, name, sent } =
  uploadProgressTheme();

/** What is being sent: percent, how much of how much, and the time left from the real rate. */
const UploadProgress = () => {
  const t = useTranslations('BaseDocuments.upload');
  const { progress } = useUploadCard();
  if (progress === null) return null;

  const value = Math.round(progress.fraction * 100);
  const seconds = progress.remainingSeconds;

  return (
    <div className={box()}>
      <div className={figure()}>
        <Text size='lg' className={percent()}>
          {value}
        </Text>
        <Text size='lg' className={unit()}>
          %
        </Text>
      </div>

      <Text size='xs' className={remaining()}>
        {seconds === undefined || seconds <= 0 ?
          t('finishing')
        : t('remaining', { seconds })}
      </Text>

      <div className={details()}>
        <Text size='xs' className={name()}>
          {progress.name}
        </Text>
        <Text size='xs' className={sent()}>
          {t('sent', {
            loaded: formatBytes(Math.round(progress.bytes * progress.fraction)),
            total: formatBytes(progress.bytes),
          })}
        </Text>
        <ProgressBar value={value} aria-label={t('progressLabel')}>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      </div>
    </div>
  );
};

export { UploadProgress };
