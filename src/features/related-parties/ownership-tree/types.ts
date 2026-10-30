import type { Party } from '@/lib/ownership';

/** Tint of a split-bar segment, in the design's order; `unassigned` is what is not given out. */
type Tint = 'dark' | 'base' | 'light' | 'unassigned';

interface Segment {
  key: string;
  label: string;
  percentage: number;
  tint: Tint;
}

interface Row {
  party: Party;
  depth: number;
  /** Shareholders below it, the whole branch (POC `descendientes`). */
  below: number;
  hasChildren: boolean;
}

export type { Row, Segment, Tint };
