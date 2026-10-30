import type { Segment, Tint } from '../types';

import { isFull } from './is-full';

const TINTS: readonly Tint[] = ['dark', 'base', 'light'];

/** POC reparto.ts `tramosDe`: one segment per declared owner, then what is left in grey. */
const segmentsOf = (
  owners: readonly { key: string; label: string; percentage: number }[],
  free: number,
  unassigned: string,
): Segment[] => [
  ...owners
    .filter((owner) => owner.percentage > 0)
    .map((owner, index): Segment => ({
      ...owner,
      tint: TINTS[index % TINTS.length] ?? 'dark',
    })),
  ...(isFull(free) ?
    []
  : [
      {
        key: '__free',
        label: unassigned,
        percentage: free,
        tint: 'unassigned' as const,
      },
    ]),
];

export { segmentsOf };
