interface Step {
  key: string;
  level: number;
  who: string;
  /** Company the link owns a part of: the previous link, or the holder. */
  of: string | undefined;
  part: number;
  accumulated: number;
  last: boolean;
}

export type { Step };
