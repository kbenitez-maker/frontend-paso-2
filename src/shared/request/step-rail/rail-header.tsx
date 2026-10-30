import { useTranslations } from 'next-intl';

import { Avatar } from '@lafise/onyx-ui/data-display/avatar';
import { ProgressBar } from '@lafise/onyx-ui/status/progress-bar';
import { Text } from '@lafise/onyx-ui/typography/text';

import { ASSETS } from '@/lib/constants/assets';
import { CountryFlag } from '@/shared/request/country-flag';

import { useStepRail } from './context';
import { stepRailTheme } from './themes';

const {
  header,
  avatar,
  flag,
  identity,
  heading,
  countryLabel,
  progressRow,
  progressBar,
  percentLabel,
} = stepRailTheme();

/** Rail summary: request country (avatar + name) and overall progress. */
const RailHeader = () => {
  const t = useTranslations('Steps');
  const { country, progress } = useStepRail();
  const percent = progress?.percent ?? 0;

  return (
    <>
      <div className={header()}>
        {/* Bank brand disc (same asset as the POC) with the request country flag as the Onyx indicator. */}
        {/* POC parity: `border={false}` drops the inner ring, and the flag is
            20px in total (Onyx md puts its 2px border outside the box: 16 + 2 + 2). */}
        <Avatar size='md' border={false} className={avatar()}>
          <Avatar.Image src={ASSETS.bankLogo} alt='' />
          {country === undefined ? null : (
            <Avatar.Indicator className={flag()}>
              <CountryFlag country={country} size={16} />
            </Avatar.Indicator>
          )}
        </Avatar>

        <div className={identity()}>
          <Text size='sm' className={heading()}>
            {t('rail.title')}
          </Text>
          <Text size='sm' className={countryLabel()}>
            {country === undefined ? null : t(`rail.countries.${country}`)}
          </Text>
        </div>
      </div>

      <div className={progressRow()}>
        <ProgressBar
          value={percent}
          aria-label={t('rail.progressLabel')}
          className={progressBar()}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <Text size='sm' className={percentLabel()}>
          {percent}%
        </Text>
      </div>
    </>
  );
};

export { RailHeader };
