import type { FieldDefinition } from '@/contracts/types';
import type { CountryCode } from '@/types/domain';
import type { Item } from '../types';

import { issueCode } from '@/contracts/issue-code';
import { buildSectionSchema } from '@/contracts/section-schema';
import { requiredFieldsIssues, visibleValues } from '@/contracts/visibility';

/**
 * First problem of each saved item (POC: the list says what an incomplete
 * item lacks), by position: missing answers and type or format failures, in
 * registry order. Items are checked as the step form checks them.
 */
const itemProblems = (
  name: string,
  fields: readonly FieldDefinition[],
  items: readonly Item[],
  scope: Item,
  country: CountryCode,
): Map<number, string> => {
  const values = visibleValues(
    fields,
    undefined,
    { [name]: items },
    scope,
    country,
  );
  const parsed = buildSectionSchema(fields, country, scope).safeParse(values);
  const issues = [
    ...requiredFieldsIssues(fields, values, country, scope),
    ...(parsed.error?.issues ?? []).map((issue) => ({
      path: issue.path,
      message: issueCode(issue),
    })),
  ];
  const rank = (key: unknown) =>
    fields.findIndex((field) => field.key === key || field.collection === key);
  const problems = new Map<number, string>();
  for (const issue of issues.toSorted(
    (a, b) => rank(a.path[2]) - rank(b.path[2]),
  )) {
    const [collection, index] = issue.path;
    if (collection !== name || typeof index !== 'number') continue;
    if (!problems.has(index)) problems.set(index, issue.message);
  }
  return problems;
};

export { itemProblems };
