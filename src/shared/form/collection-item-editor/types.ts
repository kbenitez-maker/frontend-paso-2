/**
 * Answers to merge into the draft when the field `key` changes to `value`
 * (POC `mapear`: a shortcut that copies a person's identification); nothing
 * when the change implies no other answer.
 */
type MapAnswer = (
  key: string,
  value: unknown,
) => Readonly<Record<string, unknown>> | undefined;

export type { MapAnswer };
