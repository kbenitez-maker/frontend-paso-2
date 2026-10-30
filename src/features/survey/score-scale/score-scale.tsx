import { useTranslations } from 'next-intl';

import { Button } from '@lafise/onyx-ui/base/button';

import { scoreScaleTheme } from './themes';

const { scale, score } = scoreScaleTheme();

const SCORES = Array.from({ length: 10 }, (_, index) => index + 1);

interface ScoreScaleProps {
  value: number | null;
  onChange: (value: number) => void;
}

/** 1 to 10, one press each; the chosen one is filled with the brand color (POC encuesta). */
const ScoreScale = ({ value, onChange }: Readonly<ScoreScaleProps>) => {
  const t = useTranslations('Survey');

  return (
    <fieldset className={scale()} aria-label={t('scaleLabel')}>
      {SCORES.map((option) => (
        <Button
          key={option}
          variant={option === value ? 'primary' : 'outline'}
          aria-pressed={option === value}
          className={score({ selected: option === value })}
          onPress={() => {
            onChange(option);
          }}
        >
          {option}
        </Button>
      ))}
    </fieldset>
  );
};

export { ScoreScale, type ScoreScaleProps };
