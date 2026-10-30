import type { Segment } from './types';

import { Text } from '@lafise/onyx-ui/typography/text';

import { percent } from '../lib/ownership-copy';
import { splitBarTheme } from './themes';

const {
  root,
  track,
  segment,
  legend,
  legendItem,
  legendHead,
  dot,
  percentage,
  label,
} = splitBarTheme();

/** The split bar of a point (POC `BarraDeReparto`): grows past 100 % instead of clipping. */
const SplitBar = ({ segments }: Readonly<{ segments: readonly Segment[] }>) => {
  const scale = Math.max(
    100,
    segments.reduce((sum, entry) => sum + entry.percentage, 0),
  );
  const grow = (entry: Segment) => ({
    flexGrow: entry.percentage / scale,
    flexBasis: 0,
  });

  return (
    <div className={root()}>
      <div className={track()} aria-hidden>
        {segments.map((entry) => (
          <div
            key={entry.key}
            className={segment({ tint: entry.tint })}
            style={grow(entry)}
          />
        ))}
      </div>
      <ul className={legend()}>
        {segments.map((entry) => (
          <li key={entry.key} className={legendItem()} style={grow(entry)}>
            <div className={legendHead()}>
              <div aria-hidden className={dot({ tint: entry.tint })} />
              <Text size='md' className={percentage()}>
                {percent(entry.percentage)} %
              </Text>
            </div>
            <Text size='xs' className={label()}>
              {entry.label}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { SplitBar };
