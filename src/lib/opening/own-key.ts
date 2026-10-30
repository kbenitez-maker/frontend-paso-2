/**
 * Value of a lookup table for an API code, or `undefined` when the code is
 * not an own key. Inherited names such as `toString` or `constructor` are not
 * keys of the table.
 */
const ownValueOf = <V>(
  table: Readonly<Record<string, V>>,
  key: string,
): V | undefined =>
  // eslint-disable-next-line security/detect-object-injection -- `key` is an own key of `table`
  Object.hasOwn(table, key) ? table[key] : undefined;

export { ownValueOf };
